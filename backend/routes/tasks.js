// Маршруты для работы с задачами (обновленная версия)
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { shouldLogVisit } = require('../utils/visitTracker');

// @route   GET /api/tasks
// @desc    Получить все активные задачи (с учетом групп студента)
// @access  Private (студенты и учителя)
router.get('/', protect, async (req, res) => {
    try {
        let filters = { isActive: true };

        // Если это студент - показываем только задачи для его групп (задания без групп не отображаются)
        if (req.user.role === 'student') {
            const User = require('../models/User');
            const user = await User.findById(req.user.id).populate('groups');
            const userGroupIds = (user.groups || []).map(g => g._id || g);
            
            if (userGroupIds.length === 0) {
                // Если у студента нет групп, не показываем никакие задачи
                return res.status(200).json({
                    success: true,
                    count: 0,
                    tasks: []
                });
            }
            
            // Задания без групп не отображаются - показываем только задачи для его групп
            filters.assignedGroups = { $in: userGroupIds }; // Только задачи для его групп
        }
        // Для учителей показываем все их задачи (они могут видеть все созданные ими задачи)

        // Фильтры
        if (req.query.bloomLevel) {
            filters.bloomLevel = req.query.bloomLevel;
        }
        if (req.query.difficulty) {
            filters.difficulty = req.query.difficulty;
        }
        if (req.query.language) {
            filters.programmingLanguage = req.query.language;
        }

        let tasks = await Task.find(filters)
            .populate('createdBy', 'name email')
            .populate('assignedGroups', 'name color')
            .sort('-createdAt');

        // Если это студент - скрываем задачи, которые он уже сабмитнул (есть любое submission)
        if (req.user.role === 'student') {
            const submittedTasks = await Submission.find({ 
                student: req.user.id
            }).select('task');
            const submittedTaskIds = new Set(submittedTasks.map(s => s.task.toString()));
            tasks = tasks.filter(task => !submittedTaskIds.has(task._id.toString()));
        }

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks
        });

    } catch (error) {
        logger.error('Tasks route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении задач',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/:id
// @desc    Получить одну задачу по ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('assignedGroups', 'name color');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Логируем открытие задачи студентом (первое открытие за период)
        if (req.user.role === 'student' && shouldLogVisit(req.user.id, 'task', task._id.toString())) {
            const student = await User.findById(req.user.id).select('name');
            const studentName = student ? student.name : 'Unknown';
            await logger.info(`${studentName} opened task "${task.title}"`, {
                user: req.user.id,
                route: req.originalUrl,
                ip: req.ip,
                meta: { 
                    taskId: task._id, 
                    taskTitle: task.title,
                    studentName: studentName
                }
            });
        }

        res.status(200).json({
            success: true,
            task
        });

    } catch (error) {
        logger.error('Tasks route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Error fetching task',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/:id/stats
// @desc    НОВОЕ: Получить статистику по задаче (для учителя)
// @access  Private (только учителя)
router.get('/:id/stats', protect, authorize('teacher'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Задача не найдена'
            });
        }

        // Всего отправок
        const totalSubmissions = await Submission.countDocuments({ task: req.params.id });
        
        // Уникальные студенты, отправившие решение
        const uniqueStudents = await Submission.distinct('student', { task: req.params.id });
        
        // Принятые решения
        const approvedSubmissions = await Submission.countDocuments({ 
            task: req.params.id, 
            status: 'approved' 
        });
        
        // Студенты, решившие задачу
        const solvedByStudents = await Submission.distinct('student', { 
            task: req.params.id, 
            status: 'approved' 
        });
        
        // На проверке
        const pendingSubmissions = await Submission.countDocuments({ 
            task: req.params.id, 
            status: 'pending' 
        });
        
        // Отклонены
        const rejectedSubmissions = await Submission.countDocuments({ 
            task: req.params.id, 
            status: 'rejected' 
        });

        // Средний балл
        const approvedSubs = await Submission.find({ 
            task: req.params.id, 
            status: 'approved' 
        }).select('pointsAwarded');
        
        const avgPoints = approvedSubs.length > 0 
            ? approvedSubs.reduce((sum, sub) => sum + sub.pointsAwarded, 0) / approvedSubs.length 
            : 0;

        // Последние решения
        const recentSubmissions = await Submission.find({ task: req.params.id })
            .populate('student', 'name email')
            .sort('-submittedAt')
            .limit(10);

        res.status(200).json({
            success: true,
            stats: {
                totalSubmissions,
                uniqueStudentsAttempted: uniqueStudents.length,
                approvedSubmissions,
                solvedByStudents: solvedByStudents.length,
                pendingSubmissions,
                rejectedSubmissions,
                averagePoints: Math.round(avgPoints * 10) / 10,
                recentSubmissions
            }
        });

    } catch (error) {
        logger.error('Tasks route error', {
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

// @route   POST /api/tasks
// @desc    Создать новую задачу (обновлено с дедлайнами и группами)
// @access  Private (только учителя)
router.post('/', protect, authorize('teacher'), async (req, res) => {
    try {
        const {
            title,
            description,
            bloomLevel,
            difficulty,
            points,
            programmingLanguage,
            examples,
            hints,
            deadline,
            assignedGroups,
            // опционально для контестерного режима
            autoCheckEnabled,
            timeLimitMs,
            memoryLimitMb,
            timeLimit,
            memoryLimit,
            checker,
            testCases,
            testGroups
        } = req.body;

        if (!title || !description || !bloomLevel || !difficulty) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, заполните все обязательные поля'
            });
        }

        // Проверка: группа должна быть выбрана обязательно
        if (!assignedGroups || !Array.isArray(assignedGroups) || assignedGroups.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо выбрать хотя бы одну группу для назначения задания'
            });
        }

        const task = await Task.create({
            title,
            description,
            bloomLevel,
            difficulty,
            points: points || 10,
            programmingLanguage: programmingLanguage || 'python',
            examples: examples || [],
            hints: hints || [],
            deadline: deadline || null,
            assignedGroups: assignedGroups, // Обязательное поле
            createdBy: req.user.id,
            autoCheckEnabled: !!autoCheckEnabled,
            timeLimitMs: typeof timeLimitMs === 'number' ? timeLimitMs : (typeof timeLimit === 'number' ? timeLimit * 1000 : 0),
            memoryLimitMb: typeof memoryLimitMb === 'number' ? memoryLimitMb : (typeof memoryLimit === 'number' ? memoryLimit : 0),
            checker: checker || undefined,
            testCases: Array.isArray(testCases) ? testCases : undefined,
            testGroups: Array.isArray(testGroups) ? testGroups : undefined
        });

        res.status(201).json({
            success: true,
            message: 'Задача создана успешно',
            task
        });

    } catch (error) {
        logger.error('Tasks route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании задачи',
            error: error.message
        });
    }
});

// @route   PUT /api/tasks/:id
// @desc    УЛУЧШЕНО: Обновить задачу (с дедлайнами и группами)
// @access  Private (только учителя, создавшие задачу)
router.put('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Задача не найдена'
            });
        }

        if (task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете редактировать чужую задачу'
            });
        }

        // Проверка: если обновляются assignedGroups, они не должны быть пустыми
        if (req.body.assignedGroups !== undefined) {
            if (!Array.isArray(req.body.assignedGroups) || req.body.assignedGroups.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Необходимо выбрать хотя бы одну группу для назначения задания'
                });
            }
        }

        // Собираем только разрешенные поля (чтобы не затереть лишнее)
        const updatable = {};
        const allowed = [
            'title','description','bloomLevel','difficulty','points','programmingLanguage',
            'examples','hints','deadline','assignedGroups','isActive',
            'autoCheckEnabled','timeLimitMs','memoryLimitMb','timeLimit','memoryLimit',
            'checker','testCases','testGroups'
        ];
        for (const key of allowed) {
            if (req.body[key] !== undefined) updatable[key] = req.body[key];
        }

        // Нормализация лимитов
        if (updatable.timeLimitMs === undefined && typeof updatable.timeLimit === 'number') {
            updatable.timeLimitMs = updatable.timeLimit * 1000;
        }
        if (updatable.memoryLimitMb === undefined && typeof updatable.memoryLimit === 'number') {
            updatable.memoryLimitMb = updatable.memoryLimit;
        }

        task = await Task.findByIdAndUpdate(req.params.id, updatable, { new: true, runValidators: true })
            .populate('assignedGroups', 'name color');

        res.status(200).json({
            success: true,
            message: 'Задача обновлена',
            task
        });

    } catch (error) {
        logger.error('Tasks route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении задачи',
            error: error.message
        });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Удалить задачу (делаем неактивной)
// @access  Private (только учителя)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Задача не найдена'
            });
        }

        if (task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете удалить чужую задачу'
            });
        }

        task.isActive = false;
        await task.save();

        res.status(200).json({
            success: true,
            message: 'Задача удалена'
        });

    } catch (error) {
        logger.error('Tasks route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении задачи',
            error: error.message
        });
    }
});

module.exports = router;