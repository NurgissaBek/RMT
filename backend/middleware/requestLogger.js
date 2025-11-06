// backend/middleware/requestLogger.js
const logger = require('../utils/logger');

module.exports = async function requestLogger(req, res, next) {
  const start = Date.now();
  // После ответа — логгируем duration и статус
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      body: req.body ? (Object.keys(req.body).length ? req.body : undefined) : undefined
    };

    // user если есть в req.user (middleware auth)
    const userId = req.user ? req.user.id : null;
    logger.info(message, { user: userId, route: req.originalUrl, ip: req.ip, meta });
  });
  next();
};
