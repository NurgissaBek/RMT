// Маршруты для работы с задачами (обновленная версия)
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/tasks
// @desc    Получить все активные задачи (с учетом групп студента)
// @access  Private (студенты и учителя)
router.get('/', protect, async (req, res) => {
    try {
        let filters = { isActive: true };

        // Если это студент - показываем только задачи для его групп или общие
        if (req.user.role === 'student') {
            const User = require('../models/User');
            const user = await User.findById(req.user.id).populate('groups');
            const userGroupIds = user.groups || [];
            
            filters.$or = [
                { assignedGroups: { $size: 0 } }, // Общие задачи
                { assignedGroups: { $in: userGroupIds } } // Задачи его групп
            ];
        }

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

        const tasks = await Task.find(filters)
            .populate('createdBy', 'name email')
            .populate('assignedGroups', 'name color')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks
        });

    } catch (error) {
        console.error(error);
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
                message: 'Задача не найдена'
            });
        }

        res.status(200).json({
            success: true,
            task
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении задачи',
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
        console.error(error);
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
            assignedGroups
        } = req.body;

        if (!title || !description || !bloomLevel || !difficulty) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, заполните все обязательные поля'
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
            assignedGroups: assignedGroups || [],
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Задача создана успешно',
            task
        });

    } catch (error) {
        console.error(error);
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

        // Обновляем задачу
        task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('assignedGroups', 'name color');

        res.status(200).json({
            success: true,
            message: 'Задача обновлена',
            task
        });

    } catch (error) {
        console.error(error);
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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении задачи',
            error: error.message
        });
    }
});

module.exports = router;