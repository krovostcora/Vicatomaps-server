// services/cacheService.js
const redis = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {

    /**
     * Отримати значення з кешу
     * @param {String} key - Ключ
     * @returns {Object|null} Дані або null
     */
    async get(key) {
        try {
            const data = await redis.get(key);

            if (data) {
                logger.debug('Cache hit', { key });
                return JSON.parse(data);
            }

            logger.debug('Cache miss', { key });
            return null;

        } catch (error) {
            logger.error('Cache get error', { key, error: error.message });
            return null; // Не падати при помилці кешу
        }
    }

    /**
     * Зберегти значення в кеш
     * @param {String} key - Ключ
     * @param {Object} data - Дані
     * @param {Number} ttl - TTL в секундах
     */
    async set(key, data, ttl = 3600) {
        try {
            await redis.setex(key, ttl, JSON.stringify(data));
            logger.debug('Cache set', { key, ttl });
            return true;

        } catch (error) {
            logger.error('Cache set error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Видалити ключ з кешу
     * @param {String} key - Ключ
     */
    async del(key) {
        try {
            await redis.del(key);
            logger.debug('Cache deleted', { key });
            return true;

        } catch (error) {
            logger.error('Cache delete error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Очистити весь кеш (використовувати обережно!)
     */
    async flushAll() {
        try {
            await redis.flushall();
            logger.warn('Cache flushed (all keys deleted)');
            return true;

        } catch (error) {
            logger.error('Cache flush error', { error: error.message });
            return false;
        }
    }

    /**
     * Отримати список ключів за паттерном
     * @param {String} pattern - Паттерн (наприклад, 'fuel:*')
     */
    async keys(pattern) {
        try {
            return await redis.keys(pattern);
        } catch (error) {
            logger.error('Cache keys error', { pattern, error: error.message });
            return [];
        }
    }
}

module.exports = new CacheService();