// Middleware для проверки авторизации
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Защита маршрутов - проверка JWT токена
exports.protect = async (req, res, next) => {
    let token;

    // Проверяем наличие токена в заголовках запроса
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Извлекаем токен из заголовка "Bearer TOKEN"
        token = req.headers.authorization.split(' ')[1];
    }

    // Если токена нет - возвращаем ошибку
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Доступ запрещен. Необходима авторизация'
        });
    }

    try {
        // Проверяем токен и декодируем
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Находим пользователя по ID из токена
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        next(); // Пользователь авторизован - пропускаем дальше
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Токен недействителен или истек'
        });
    }
};

// Проверка роли пользователя (только учитель или только студент)
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Роль ${req.user.role} не имеет доступа к этому маршруту`
            });
        }
        next();
    };
};