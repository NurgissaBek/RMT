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
                message: 'Пожалуйста, заполните все поля'
            });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Задача не найдена'
            });
        }

        // Проверка дедлайна
        if (task.deadline && new Date() > new Date(task.deadline)) {
            return res.status(400).json({
                success: false,
                message: 'Дедлайн для этой задачи истек'
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

        // Auto-check via Judge0 if enabled and test cases present
        let autoCheckSummary = null;
        if (task.autoCheckEnabled && Array.isArray(task.testCases) && task.testCases.length > 0) {
            try {
                const result = await judge0.checkSubmission(
                    code,
                    language,
                    task.testCases,
                    task.timeLimit,
                    task.memoryLimit
                );

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
                        student.points += result.totalScore;
                        await student.save();
                    }
                }

                autoCheckSummary = {
                    autoScore: result.totalScore,
                    maxScore: result.maxScore,
                    percentage: result.percentage,
                    allPassed: result.allPassed
                };
            } catch (e) {
                logger.error('Auto-check failed', {
                    user: req.user ? req.user.id : null,
                    route: req.originalUrl,
                    ip: req.ip,
                    meta: { error: e.message }
                });
            }
        }

        res.status(201).json({
            success: true,
            message: '��襭�� ��ࠢ���� �� �஢���',
            submission,
            autoCheck: autoCheckSummary
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отправке решения',
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
        console.error(error);
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
        console.error(error);
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
        console.error(error);
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

        // Логируем (используем переменные из submission, не объявляем заново)
        logger.info('Submission reviewed', { 
            user: req.user ? req.user.id : null, 
            route: req.originalUrl, 
            ip: req.ip, 
            meta: { 
                submissionId: submission._id, 
                taskId: submission.task, // убрал ._id
                language: submission.language 
            } 
        });

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
            meta: { error: error.message } 
        });
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении решения',
            error: error.message
        });
    }
});

// @route   DELETE /api/submissions/:id
// @desc    НОВОЕ: Студент удаляет свое решение (только если pending)
// @access  Private (только студенты)
router.delete('/:id', protect, authorize('student'), async (req, res) => {
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
                message: 'Вы не можете удалить чужое решение'
            });
        }

        if (submission.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Можно удалять только решения, ожидающие проверки'
            });
        }

        await submission.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Решение удалено'
        });

    } catch (error) {
        console.error(error);
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
        const { status, pointsAwarded, feedback } = req.body;

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

        if (status === 'approved') {
            const points = (pointsAwarded !== undefined && pointsAwarded !== null) ? pointsAwarded : submission.task.points;
            submission.pointsAwarded = points;

            const student = await User.findById(submission.student._id);
            student.points += points;

            // Проверка достижений
            if (student.points === points && student.badges.length === 0) {
                student.badges.push({
                    name: 'First Task',
                    description: 'Решил первую задачу'
                });
            }

            if (student.points >= 100 && !student.badges.find(b => b.name === 'Century')) {
                student.badges.push({
                    name: 'Century',
                    description: 'Набрал 100 баллов'
                });
            }

            if (student.points >= 500 && !student.badges.find(b => b.name === 'Pro Coder')) {
                student.badges.push({
                    name: 'Pro Coder',
                    description: 'Набрал 500 баллов'
                });
            }

            await student.save();
        }

        await submission.save();

        // логируем
        logger.info('Submission reviewed', { user: req.user ? req.user.id : null, route: req.originalUrl, ip: req.ip, meta: { submissionId: submission._id, taskId: submission.task._id, language: submission.language } });

        res.status(200).json({
            success: true,
            message: 'Решение проверено',
            submission
        });

    } catch (error) {
        logger.error('Submission review error', { user: req.user ? req.user.id : null, route: req.originalUrl, ip: req.ip, meta: { error: error.message } });
        console.error(error);
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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении статистики',
            error: error.message
        });
    }
});

module.exports = router;




