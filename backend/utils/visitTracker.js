// backend/utils/visitTracker.js
// Трекинг посещений для логирования только первого открытия за период

// Кеш: ключ = "userId-resourceType-resourceId", значение = timestamp
const visitCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 час в миллисекундах

// Очистка старых записей каждые 30 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of visitCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      visitCache.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Проверяет, нужно ли логировать посещение
 * @param {string} userId - ID пользователя
 * @param {string} resourceType - тип ресурса ('lecture', 'quiz', 'task')
 * @param {string} resourceId - ID ресурса
 * @returns {boolean} - true если нужно логировать (первое посещение за период)
 */
function shouldLogVisit(userId, resourceType, resourceId) {
  const key = `${userId}-${resourceType}-${resourceId}`;
  const now = Date.now();
  const lastVisit = visitCache.get(key);
  
  if (!lastVisit || (now - lastVisit > CACHE_TTL)) {
    // Первое посещение или прошло больше часа
    visitCache.set(key, now);
    return true;
  }
  
  return false;
}

module.exports = { shouldLogVisit };

