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
async function checkSubmission(code, language, testCases, timeLimit, memoryLimit) {
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
                      result.stdout === testCase.expectedOutput.trim() &&
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

module.exports = {
    runCode,
    checkSubmission,
    LANGUAGE_IDS
};