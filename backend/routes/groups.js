// Маршруты для управления группами студентов
const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// @route   GET /api/groups
// @desc    Получить все группы учителя
// @access  Private (только учителя)
router.get('/', protect, authorize('teacher'), async (req, res) => {
    try {
        const groups = await Group.find({ createdBy: req.user.id })
            .populate('students', 'name email points')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: groups.length,
            groups
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении групп',
            error: error.message
        });
    }
});

// @route   GET /api/groups/:id
// @desc    Получить одну группу по ID
// @access  Private (только учителя)
router.get('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('students', 'name email points badges')
            .populate('createdBy', 'name email');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет доступа к этой группе'
            });
        }

        res.status(200).json({
            success: true,
            group
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении группы',
            error: error.message
        });
    }
});

// @route   POST /api/groups
// @desc    Создать новую группу
// @access  Private (только учителя)
router.post('/', protect, authorize('teacher'), async (req, res) => {
    try {
        const { name, description, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, введите название группы'
            });
        }

        const group = await Group.create({
            name,
            description: description || '',
            color: color || '#667eea',
            createdBy: req.user.id,
            students: []
        });

        res.status(201).json({
            success: true,
            message: 'Группа создана успешно',
            group
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании группы',
            error: error.message
        });
    }
});

// @route   PUT /api/groups/:id
// @desc    Обновить группу
// @access  Private (только учителя)
router.put('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        let group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете редактировать чужую группу'
            });
        }

        group = await Group.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('students', 'name email points');

        res.status(200).json({
            success: true,
            message: 'Группа обновлена',
            group
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении группы',
            error: error.message
        });
    }
});

// @route   DELETE /api/groups/:id
// @desc    Удалить группу
// @access  Private (только учителя)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Вы не можете удалить чужую группу'
            });
        }

        await group.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Группа удалена'
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении группы',
            error: error.message
        });
    }
});

// @route   POST /api/groups/:id/students
// @desc    Добавить студента в группу
// @access  Private (только учителя)
router.post('/:id/students', protect, authorize('teacher'), async (req, res) => {
    try {
        const { studentEmail } = req.body;

        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                message: 'Укажите email студента'
            });
        }

        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет прав на изменение этой группы'
            });
        }

        const student = await User.findOne({ email: studentEmail, role: 'student' });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Студент не найден'
            });
        }

        if (group.students.includes(student._id)) {
            return res.status(400).json({
                success: false,
                message: 'Студент уже в группе'
            });
        }

        group.students.push(student._id);
        await group.save();

        // Добавляем группу студенту
        if (!student.groups) student.groups = [];
        if (!student.groups.includes(group._id)) {
            student.groups.push(group._id);
            await student.save();
        }

        const updatedGroup = await Group.findById(req.params.id)
            .populate('students', 'name email points');

        res.status(200).json({
            success: true,
            message: 'Студент добавлен в группу',
            group: updatedGroup
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при добавлении студента',
            error: error.message
        });
    }
});

// @route   DELETE /api/groups/:id/students/:studentId
// @desc    Удалить студента из группы
// @access  Private (только учителя)
router.delete('/:id/students/:studentId', protect, authorize('teacher'), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет прав на изменение этой группы'
            });
        }

        group.students = group.students.filter(
            studentId => studentId.toString() !== req.params.studentId
        );
        await group.save();

        // Удаляем группу у студента
        const student = await User.findById(req.params.studentId);
        if (student && student.groups) {
            student.groups = student.groups.filter(
                groupId => groupId.toString() !== group._id.toString()
            );
            await student.save();
        }

        const updatedGroup = await Group.findById(req.params.id)
            .populate('students', 'name email points');

        res.status(200).json({
            success: true,
            message: 'Студент удален из группы',
            group: updatedGroup
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении студента',
            error: error.message
        });
    }
});

// @route   GET /api/groups/my/list
// @desc    Студент получает свои группы
// @access  Private (только студенты)
router.get('/my/list', protect, authorize('student'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('groups', 'name description color');

        res.status(200).json({
            success: true,
            count: user.groups?.length || 0,
            groups: user.groups || []
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении групп',
            error: error.message
        });
    }
});

// @route   GET /api/groups/:id/invite
// @desc    Получить invite-ссылку группы
// @access  Private (только учителя)
router.get('/:id/invite', protect, authorize('teacher'), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет доступа к этой группе'
            });
        }

        res.status(200).json({
            success: true,
            inviteUrl: group.getInviteUrl(),
            inviteCode: group.inviteCode,
            inviteEnabled: group.inviteEnabled,
            inviteExpiresAt: group.inviteExpiresAt
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении invite-ссылки',
            error: error.message
        });
    }
});

// @route   POST /api/groups/:id/invite/regenerate
// @desc    Создать новую invite-ссылку
// @access  Private (только учителя)
router.post('/:id/invite/regenerate', protect, authorize('teacher'), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет доступа к этой группе'
            });
        }

        await group.regenerateInviteCode();

        res.status(200).json({
            success: true,
            message: 'Новая invite-ссылка создана',
            inviteUrl: group.getInviteUrl(),
            inviteCode: group.inviteCode
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании новой ссылки',
            error: error.message
        });
    }
});

// @route   PUT /api/groups/:id/invite/toggle
// @desc    Включить/выключить invite-ссылку
// @access  Private (только учителя)
router.put('/:id/invite/toggle', protect, authorize('teacher'), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена'
            });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет доступа к этой группе'
            });
        }

        group.inviteEnabled = !group.inviteEnabled;
        await group.save();

        res.status(200).json({
            success: true,
            message: group.inviteEnabled ? 'Invite-ссылка активирована' : 'Invite-ссылка деактивирована',
            inviteEnabled: group.inviteEnabled
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при изменении статуса ссылки',
            error: error.message
        });
    }
});

// @route   POST /api/groups/join/:inviteCode
// @desc    НОВОЕ: Студент присоединяется к группе по invite-коду
// @access  Private (только студенты)
router.post('/join/:inviteCode', protect, authorize('student'), async (req, res) => {
    try {
        const group = await Group.findOne({ inviteCode: req.params.inviteCode });
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Группа не найдена или ссылка недействительна'
            });
        }

        // Проверка: активна ли ссылка
        if (!group.inviteEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Invite-ссылка деактивирована'
            });
        }

        // Проверка: не истек ли срок действия
        if (group.inviteExpiresAt && new Date() > group.inviteExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'Срок действия invite-ссылки истек'
            });
        }

        // Проверка: уже в группе?
        if (group.students.includes(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: 'Вы уже состоите в этой группе'
            });
        }

        // Добавляем студента в группу
        group.students.push(req.user.id);
        await group.save();

        // Добавляем группу студенту
        const student = await User.findById(req.user.id);
        if (!student.groups) student.groups = [];
        if (!student.groups.includes(group._id)) {
            student.groups.push(group._id);
            await student.save();
        }

        res.status(200).json({
            success: true,
            message: `Вы успешно присоединились к группе "${group.name}"!`,
            group: {
                id: group._id,
                name: group.name,
                description: group.description,
                color: group.color
            }
        });

    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({
            success: false,
            message: 'Ошибка при присоединении к группе',
            error: error.message
        });
    }
});

// Join group by invite code (students)
router.post('/join', protect, authorize('student'), async (req, res) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) {
            return res.status(400).json({ success: false, message: 'Invite code is required' });
        }
        const group = await Group.findOne({ inviteCode });
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }
        if (group.inviteEnabled === false) {
            return res.status(403).json({ success: false, message: 'Invites are disabled for this group' });
        }
        if (group.inviteExpiresAt && new Date() > new Date(group.inviteExpiresAt)) {
            return res.status(400).json({ success: false, message: 'Invite code expired' });
        }
        if (!group.students.map(id => id.toString()).includes(req.user.id)) {
            group.students.push(req.user.id);
            await group.save();
        }
        const student = await User.findById(req.user.id);
        if (student) {
            const has = (student.groups || []).map(id => id.toString()).includes(group._id.toString());
            if (!has) {
                student.groups = student.groups || [];
                student.groups.push(group._id);
                await student.save();
            }
        }
        const populated = await Group.findById(group._id).populate('students', 'name email points');
        res.status(200).json({ success: true, group: populated });
    } catch (error) {
        logger.error('Groups route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({ success: false, message: 'Error joining group', error: error.message });
    }
});

module.exports = router;
