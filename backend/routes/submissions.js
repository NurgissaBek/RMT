// Маршруты для отправки и проверки решений (обновленная версия)
const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const judge0 = require('../services/judge0Service'); // добавить


// @route   POST /api/submissions
// @desc    Студент отправляет решение задачи
// @access  Private (только студенты)
router.post('/', protect, authorize('student'), async (req, res) => {
    try {
        const { taskId, code, language, timeSpent } = req.body;

        if (!taskId || !code || !language) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all fields'
            });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Проверка дедлайна
        if (task.deadline && new Date() > new Date(task.deadline)) {
            return res.status(400).json({
                success: false,
                message: 'Deadline for this task has expired'
            });
        }

        const previousSubmissions = await Submission.countDocuments({
            student: req.user.id,
            task: taskId
        });

                let submission = await Submission.create({
            student: req.user.id,
            task: taskId,
            code,
            language,
            timeSpent: timeSpent || 0,
            attemptNumber: previousSubmissions + 1
        });

        // Auto-check via Judge0
        let autoCheckSummary = null;
        if (task.autoCheckEnabled) {
            try {
                const timeLimitMs = (typeof task.timeLimitMs === 'number' && task.timeLimitMs > 0)
                    ? task.timeLimitMs
                    : ((typeof task.timeLimit === 'number' ? task.timeLimit : 5) * 1000);
                const memoryLimitMb = (typeof task.memoryLimitMb === 'number' && task.memoryLimitMb > 0)
                    ? task.memoryLimitMb
                    : (typeof task.memoryLimit === 'number' ? task.memoryLimit : 128);

                let result = null;
                const hasGroups = Array.isArray(task.testGroups) && task.testGroups.length > 0;
                const hasCases = Array.isArray(task.testCases) && task.testCases.length > 0;

                if (hasGroups) {
                    result = await judge0.checkSubmissionGrouped(
                        code,
                        language,
                        task.testGroups,
                        timeLimitMs,
                        memoryLimitMb,
                        task.checker
                    );
                } else if (hasCases) {
                    result = await judge0.checkSubmission(
                        code,
                        language,
                        task.testCases,
                        timeLimitMs / 1000,
                        memoryLimitMb * 1000
                    );
                }

                if (result) {
                    submission.autoCheck = true;
                    submission.testResults = result.testResults;
                    submission.autoScore = result.totalScore;
                    submission.maxScore = result.maxScore;
                    submission.percentage = result.percentage;
                    submission.pointsAwarded = result.totalScore;
                    submission.status = result.allPassed ? 'approved' : 'needs_revision';
                    await submission.save();

                    if (result.allPassed && result.totalScore > 0) {
                        const student = await User.findById(req.user.id);
                        if (student) {
                            // Баллы
                            student.points += result.totalScore;
                            // Опыт = баллы * 5
                            await student.addExperience(result.totalScore * 5);
                            // Стрик
                            const streakInfo = await student.updateStreak();
                            if (streakInfo?.bonusPoints) {
                                student.points += streakInfo.bonusPoints;
                            }
                            await student.save();
                        }
                    }

                    autoCheckSummary = {
                        autoScore: result.totalScore,
                        maxScore: result.maxScore,
                        percentage: result.percentage,
                        allPassed: result.allPassed
                    };
                }
            } catch (e) {
                logger.error('Auto-check failed', {
                    user: req.user ? req.user.id : null,
                    route: req.originalUrl,
                    ip: req.ip,
                    meta: { error: e.message }
                });
            }
        }

        // Логируем отправку решения студентом с именем
        const student = await User.findById(req.user.id).select('name');
        const studentName = student ? student.name : 'Unknown';
        await logger.info(`${studentName} submitted solution for task "${task.title}"`, {
            user: req.user.id,
            route: req.originalUrl,
            ip: req.ip,
            meta: { 
                taskId: taskId, 
                taskTitle: task.title,
                language: language,
                attemptNumber: previousSubmissions + 1,
                studentName: studentName
            }
        });

        res.status(201).json({
            success: true,
            message: 'Solution submitted',
            submission,
            autoCheck: autoCheckSummary
        });

    } catch (error) {
        logger.error('Submissions route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Error submitting solution',
            error: error.message
        });
    }
});

// @route   GET /api/submissions/my
// @desc    Получить все свои отправленные решения (для студента)
// @access  Private (только студенты)
router.get('/my', protect, authorize('student'), async (req, res) => {
    try {
        const submissions = await Submission.find({ student: req.user.id })
            .populate('task', 'title difficulty points deadline')
            .sort('-submittedAt');

        res.status(200).json({
            success: true,
            count: submissions.length,
            submissions
        });

    } catch (error) {
        logger.error('Submissions route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении решений',
            error: error.message
        });
    }
});

// @route   GET /api/submissions/pending
// @desc    Получить все решения на проверке (для учителя)
// @access  Private (только учителя)
router.get('/pending', protect, authorize('teacher'), async (req, res) => {
    try {
        const submissions = await Submission.find({ status: 'pending' })
            .populate('student', 'name email')
            .populate('task', 'title difficulty points')
            .sort('-submittedAt');

        res.status(200).json({
            success: true,
            count: submissions.length,
            submissions
        });

    } catch (error) {
        logger.error('Submissions route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении решений',
            error: error.message
        });
    }
});

// @route   GET /api/submissions/:id
// @desc    Получить одно решение по ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate('student', 'name email')
            .populate('task', 'title description difficulty points')
            .populate('reviewedBy', 'name email');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Решение не найдено'
            });
        }

        if (req.user.role === 'student' && submission.student._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете просматривать чужие решения'
            });
        }

        res.status(200).json({
            success: true,
            submission
        });

    } catch (error) {
        logger.error('Submissions route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении решения',
            error: error.message
        });
    }
});

// @route   PUT /api/submissions/:id
// @desc    НОВОЕ: Студент редактирует свое решение (только если pending)
// @access  Private (только студенты)
router.put('/:id', protect, authorize('student'), async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Решение не найдено'
            });
        }

        if (submission.student.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете редактировать чужое решение'
            });
        }

        if (submission.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Можно редактировать только решения, ожидающие проверки'
            });
        }

        const { code, language } = req.body;

        if (code) submission.code = code;
        if (language) submission.language = language;
        submission.submittedAt = Date.now();

        await submission.save();

        // Не логируем обновление решения - это не критичное событие
        // Логируем только создание нового решения (в POST /api/submissions)

        res.status(200).json({
            success: true,
            message: 'Решение обновлено',
            submission
        });

    } catch (error) {
        logger.error('Submission review error', { 
            user: req.user ? req.user.id : null, 
            route: req.originalUrl, 
            ip: req.ip, 
            meta: { error: error.message, stack: error.stack } 
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении решения',
            error: error.message
        });
    }
});

// @route   DELETE /api/submissions/:id
// @desc    Студент удаляет свое решение. Если было approved — списываются начисленные баллы
// @access  Private (только студенты)
router.delete('/:id', protect, authorize('student'), async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id).populate('student').populate('task');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Решение не найдено'
            });
        }

        if ((submission.student?._id?.toString?.() || submission.student?.toString?.() || '') !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете удалить чужое решение'
            });
        }

        // Если решение было засчитано, уменьшаем баллы студента
        if (submission.status === 'approved' && submission.pointsAwarded && submission.pointsAwarded > 0) {
            try {
                const student = await User.findById(req.user.id);
                if (student) {
                    student.points = Math.max(0, (student.points || 0) - submission.pointsAwarded);
                    await student.save();
                }
            } catch (err) {
                // Продолжаем, но логируем
                logger.error('Points rollback on delete failed', {
                    user: req.user ? req.user.id : null,
                    route: req.originalUrl,
                    ip: req.ip,
                    meta: { error: err.message, submissionId: submission._id.toString() }
                });
            }
        }

        await submission.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Решение удалено'
        });

    } catch (error) {
        logger.error('Submissions route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении решения',
            error: error.message
        });
    }
});

// @route   PUT /api/submissions/:id/review
// @desc    УЛУЧШЕНО: Учитель проверяет решение с расширенными комментариями
// @access  Private (только учителя)
router.put('/:id/review', protect, authorize('teacher'), async (req, res) => {
    try {
        const { status, pointsAwarded, feedback, badges = [] } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Укажите статус проверки'
            });
        }

        const submission = await Submission.findById(req.params.id)
            .populate('student')
            .populate('task');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Решение не найдено'
            });
        }

        submission.status = status;
        submission.feedback = feedback || '';
        submission.reviewedBy = req.user.id;
        submission.reviewedAt = Date.now();

        const student = await User.findById(submission.student._id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Студент не найден'
            });
        }

        const previousPoints = submission.pointsAwarded || 0;
        let updatedPoints = previousPoints;

        if (status === 'approved') {
            const targetPoints = (pointsAwarded !== undefined && pointsAwarded !== null)
                ? Number(pointsAwarded)
                : submission.task.points;
            updatedPoints = Math.max(0, targetPoints);

            // Дополнительно: опыт и стрики
            try {
                const xpToAdd = updatedPoints * 5;
                await student.addExperience(xpToAdd);
                const streakInfo = await student.updateStreak();
                if (streakInfo?.bonusPoints) {
                    student.points = Math.max(0, (student.points || 0) + streakInfo.bonusPoints);
                }
            } catch (_) {}
        } else {
            updatedPoints = 0;
        }

        const delta = updatedPoints - previousPoints;
        if (delta !== 0) {
            student.points = Math.max(0, (student.points || 0) + delta);
        }
        submission.pointsAwarded = updatedPoints;

        if (status === 'approved') {
            if (!student.badges.some(b => b.name === 'First Task')) {
                student.badges.push({
                    name: 'First Task',
                    description: 'Решил первую задачу',
                    earnedAt: new Date(),
                    icon: '',
                    rarity: 'common'
                });
            }

            if (student.points >= 100 && !student.badges.find(b => b.name === 'Century')) {
                student.badges.push({
                    name: 'Century',
                    description: 'Набрал 100 баллов',
                    earnedAt: new Date(),
                    icon: '',
                    rarity: 'rare'
                });
            }

            if (student.points >= 500 && !student.badges.find(b => b.name === 'Pro Coder')) {
                student.badges.push({
                    name: 'Pro Coder',
                    description: 'Набрал 500 баллов',
                    earnedAt: new Date(),
                    icon: '',
                    rarity: 'epic'
                });
            }
        }

        const normalizedBadges = Array.isArray(badges) ? badges.filter(b => b && b.name) : [];
        if (normalizedBadges.length > 0) {
            const now = new Date();
            submission.awardedBadges = normalizedBadges.map(badge => ({
                name: badge.name,
                description: badge.description || '',
                icon: badge.icon || '',
                rarity: ['common', 'rare', 'epic', 'legendary'].includes(badge.rarity) ? badge.rarity : 'common',
                awardedBy: req.user.id,
                awardedAt: now
            }));

            normalizedBadges.forEach(badge => {
                const alreadyHas = student.badges?.some(existing => existing.name === badge.name);
                if (!alreadyHas) {
                    student.badges.push({
                        name: badge.name,
                        description: badge.description || '',
                        icon: badge.icon || '',
                        rarity: ['common', 'rare', 'epic', 'legendary'].includes(badge.rarity) ? badge.rarity : 'common',
                        earnedAt: now
                    });
                }
            });
        } else {
            submission.awardedBadges = [];
        }

        await submission.save();
        await student.save();

        // Не логируем действия преподавателя по проверке заданий - только действия студентов

        res.status(200).json({
            success: true,
            message: 'Решение проверено',
            submission
        });

    } catch (error) {
        logger.error('Submission review error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при проверке решения',
            error: error.message
        });
    }
});

// @route   GET /api/submissions/stats/student
// @desc    Статистика студента (для dashboard)
// @access  Private (только студенты)
router.get('/stats/student', protect, authorize('student'), async (req, res) => {
    try {
        const totalSubmissions = await Submission.countDocuments({ student: req.user.id });
        const approvedSubmissions = await Submission.countDocuments({ 
            student: req.user.id, 
            status: 'approved' 
        });
        const pendingSubmissions = await Submission.countDocuments({ 
            student: req.user.id, 
            status: 'pending' 
        });

        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            stats: {
                totalSubmissions,
                approvedSubmissions,
                pendingSubmissions,
                totalPoints: user.points,
                badges: user.badges
            }
        });

    } catch (error) {
        logger.error('Submissions route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении статистики',
            error: error.message
        });
    }
});

module.exports = router;




