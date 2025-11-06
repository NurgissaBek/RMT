// Маршруты для регистрации и авторизации
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Регистрация нового пользователя
// @access  Public (доступно всем)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Проверяем все ли поля заполнены
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, заполните все поля'
            });
        }

        // Проверяем существует ли пользователь с таким email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует'
            });
        }

        // Создаем нового пользователя
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'student' // По умолчанию - студент
        });

        // Создаем токен
        const token = user.getSignedJwtToken();

        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при регистрации',
            error: error.message
        });
    }
});

// @route   POST /api/auth/login
// @desc    Вход в систему
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Проверяем все ли поля заполнены
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, введите email и пароль'
            });
        }

        // Находим пользователя (включая пароль для проверки)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }

        // Проверяем пароль
        const isPasswordCorrect = await user.matchPassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }

        // Создаем токен
        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points,
                badges: user.badges
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при входе',
            error: error.message
        });
    }
});

// @route   GET /api/auth/me
// @desc    Получить информацию о текущем пользователе
// @access  Private (требует авторизации)
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points,
                badges: user.badges,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении данных пользователя',
            error: error.message
        });
    }
});

module.exports = router;