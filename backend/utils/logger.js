// backend/utils/logger.js
const winston = require('winston');
const LogModel = require('../models/Log');

let ioInstance = null;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
  exitOnError: false
});

// Инициализатор — передать Socket.IO (из server.js)
function init(io) {
  ioInstance = io;
}

// Универсальная запись (в консоль/файлы через winston) и в Mongo
async function log(level, message, { user=null, route=null, ip=null, meta={} } = {}) {
  try {
    // 1) локальные логи
    logger.log({ level, message, meta });

    // 2) persist to Mongo
    const doc = new LogModel({
      level, message, meta, user, route, ip
    });
    await doc.save();

    // 3) emit via socket.io for live UI (если инициализирован)
    if (ioInstance) {
      ioInstance.emit('live-log', {
        _id: doc._id,
        level, message, meta, user, route, ip, createdAt: doc.createdAt
      });
    }
  } catch (err) {
    // чтобы не падать, логгируем в консоль
    console.error('Logger error:', err);
  }
}

// удобные шорткаты
module.exports = {
  init,
  log,
  info: (msg, opts) => log('info', msg, opts),
  warn: (msg, opts) => log('warn', msg, opts),
  error: (msg, opts) => log('error', msg, opts),
  debug: (msg, opts) => log('debug', msg, opts),
  winston: logger
};
