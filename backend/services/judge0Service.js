// Сервис для автоматической проверки кода через Judge0
const axios = require('axios');

// Judge0 API (можно использовать их бесплатный tier)
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; // Получи на rapidapi.com

// Language IDs для Judge0
const LANGUAGE_IDS = {
    'python': 71,      // Python 3
    'javascript': 63,  // Node.js
    'java': 62,        // Java
    'cpp': 54          // C++
};

function compareOutput(actual, expected, checker) {
    const a = actual == null ? '' : String(actual);
    const e = expected == null ? '' : String(expected);

    const type = checker?.type || 'diff';
    if (type === 'ignore_whitespace') {
        const norm = s => s.replace(/\s+/g, ' ').trim();
        return norm(a) === norm(e);
    }
    if (type === 'ignore_case_whitespace') {
        const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
        return norm(a) === norm(e);
    }
    // default 'diff' — строгое сравнение без лишних пробелов в конце
    return a.trimEnd() === e.trimEnd();
}

/**
 * Запуск кода на Judge0
 */
async function runCode(code, language, input, timeLimit = 5, memoryLimit = 128000) {
    try {
        const languageId = LANGUAGE_IDS[language] || 71;

        // Создание submission
        const submissionResponse = await axios.post(
            `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: code,
                language_id: languageId,
                stdin: input,
                cpu_time_limit: timeLimit,
                memory_limit: memoryLimit
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            }
        );

        const result = submissionResponse.data;

        return {
            success: true,
            stdout: result.stdout ? result.stdout.trim() : '',
            stderr: result.stderr ? result.stderr.trim() : '',
            status: result.status.description,
            time: result.time,
            memory: result.memory,
            compile_output: result.compile_output
        };

    } catch (error) {
        console.error('Judge0 Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
}

/**
 * Проверка кода по всем тест-кейсам
 */
async function checkSubmission(code, language, testCases, timeLimit, memoryLimit, checker) {
    const results = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const testCase of testCases) {
        maxScore += testCase.points;

        const result = await runCode(
            code,
            language,
            testCase.input,
            timeLimit,
            memoryLimit
        );

        const passed = result.success &&
                      compareOutput(result.stdout, testCase.expectedOutput, checker) &&
                      result.status === 'Accepted';

        results.push({
            testCase: {
                input: testCase.isHidden ? '[Hidden]' : testCase.input,
                expectedOutput: testCase.isHidden ? '[Hidden]' : testCase.expectedOutput,
                isHidden: testCase.isHidden
            },
            actualOutput: result.stdout,
            passed,
            points: passed ? testCase.points : 0,
            status: result.status,
            time: result.time,
            memory: result.memory,
            error: result.stderr || result.compile_output || null
        });

        if (passed) {
            totalScore += testCase.points;
        }
    }

    return {
        totalScore,
        maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        testResults: results,
        allPassed: results.every(r => r.passed)
    };
}

/**
 * Проверка кода по группам тестов с весами
 */
async function checkSubmissionGrouped(code, language, testGroups, timeLimitMs, memoryLimitMb, checker) {
    const groupsResult = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const group of testGroups) {
        let groupScore = 0;
        let groupMax = 0;
        const testsOut = [];
        let groupFailed = false;

        for (const test of (group.tests || [])) {
            const testPoints = typeof test.points === 'number' ? test.points : 1;
            groupMax += testPoints;

            const run = await runCode(
                code,
                language,
                test.input,
                (timeLimitMs || 5000) / 1000,
                (memoryLimitMb || 128) * 1000
            );

            const passed = run.success &&
                run.status === 'Accepted' &&
                compareOutput(run.stdout, test.expectedOutput, checker);

            testsOut.push({
                testCase: {
                    input: test.isHidden ? '[Hidden]' : test.input,
                    expectedOutput: test.isHidden ? '[Hidden]' : test.expectedOutput,
                    isHidden: !!test.isHidden
                },
                actualOutput: run.stdout,
                passed,
                points: passed ? testPoints : 0,
                status: run.status,
                time: run.time,
                memory: run.memory,
                error: run.stderr || run.compile_output || null,
                groupName: group.name || 'default'
            });

            if (passed) groupScore += testPoints;
            if (!passed && group.continueOnFailure === false) {
                groupFailed = true;
                break;
            }
        }

        const weighted = (typeof group.weight === 'number' ? group.weight : 100) / 100;
        const weightedScore = Math.round(groupScore * weighted);
        const weightedMax = Math.round(groupMax * weighted);

        totalScore += weightedScore;
        maxScore += weightedMax;

        groupsResult.push({
            name: group.name || 'default',
            score: groupScore,
            max: groupMax,
            weightedScore,
            weightedMax,
            tests: testsOut,
            failedEarly: groupFailed && group.continueOnFailure === false
        });
    }

    const flatTests = groupsResult.flatMap(g => g.tests);
    return {
        totalScore,
        maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        testResults: flatTests,
        groups: groupsResult,
        allPassed: groupsResult.every(g => g.score === g.max)
    };
}

module.exports = {
    runCode,
    checkSubmission,
    checkSubmissionGrouped,
    LANGUAGE_IDS
};
