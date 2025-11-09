// backend/utils/logger.js
const winston = require('winston');
const LogModel = require('../models/Log');

let ioInstance = null;

// Формат для читаемого вывода в консоль
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    new winston.transports.Console({ 
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    })
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
    // Формируем читаемое сообщение для консоли
    const logMessage = route 
      ? `${message} | Route: ${route}${user ? ` | User: ${user}` : ''}${ip ? ` | IP: ${ip}` : ''}`
      : message;
    
    // 1) локальные логи через winston
    logger.log({ 
      level, 
      message: logMessage, 
      meta: { ...meta, user, route, ip } 
    });

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
    logger.winston.error('Logger error:', err);
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
