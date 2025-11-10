const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

// @route   GET /api/users/me
// @desc    Получить полный профиль текущего пользователя
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points,
                level: user.level,
                experience: user.experience,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                lastSubmissionDate: user.lastSubmissionDate,
                badges: user.badges,
                stats: user.stats,
                avatar: user.avatar,
                title: user.getTitle()
            }
        });
    } catch (error) {
        logger.error('Users route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({ success: false, message: 'Ошибка при получении профиля', error: error.message });
    }
});

// @route   PUT /api/users/me
// @desc    Обновить поля профиля (сейчас: avatar)
// @access  Private
router.put('/me', protect, async (req, res) => {
    try {
        const allowed = ['avatar'];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points,
                level: user.level,
                experience: user.experience,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                badges: user.badges,
                stats: user.stats,
                avatar: user.avatar,
                title: user.getTitle()
            }
        });
    } catch (error) {
        logger.error('Users route error', {
            user: req.user ? req.user.id : null,
            route: req.originalUrl,
            ip: req.ip,
            meta: { error: error.message, stack: error.stack }
        });
        res.status(500).json({ success: false, message: 'Ошибка при обновлении профиля', error: error.message });
    }
});

module.exports = router;


