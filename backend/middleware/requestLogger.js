// backend/middleware/requestLogger.js
// Логируем только важные действия студентов, не все запросы
const logger = require('../utils/logger');

module.exports = async function requestLogger(req, res, next) {
  // Логируем только действия студентов (открытие задач, квизов, отправка решений)
  // Остальные запросы не логируем
  next();
};
