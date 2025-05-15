const { redisClient } = require('../config/redis');

class RedisService {
    /**
     * Guarda un valor en Redis con un tiempo de expiración opcional
     * @param {string} key - Clave para almacenar el valor
     * @param {string} value - Valor a almacenar
     * @param {number} ttlSeconds - Tiempo de vida en segundos (opcional)
     */
    static async set(key, value, ttlSeconds = null) {
        try {
            if (ttlSeconds) {
                await redisClient.setEx(key, ttlSeconds, value);
            } else {
                await redisClient.set(key, value);
            }
            return true;
        } catch (error) {
            console.error('Error al guardar en Redis:', error);
            return false;
        }
    }

    /**
     * Obtiene un valor de Redis
     * @param {string} key - Clave del valor a obtener
     */
    static async get(key) {
        try {
            return await redisClient.get(key);
        } catch (error) {
            console.error('Error al obtener de Redis:', error);
            return null;
        }
    }

    /**
     * Elimina un valor de Redis
     * @param {string} key - Clave del valor a eliminar
     */
    static async delete(key) {
        try {
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Error al eliminar de Redis:', error);
            return false;
        }
    }

    /**
     * Verifica si una clave existe en Redis
     * @param {string} key - Clave a verificar
     */
    static async exists(key) {
        try {
            return await redisClient.exists(key);
        } catch (error) {
            console.error('Error al verificar existencia en Redis:', error);
            return false;
        }
    }

    /**
     * Establece un tiempo de expiración para una clave
     * @param {string} key - Clave a la que se establecerá el tiempo de expiración
     * @param {number} seconds - Tiempo en segundos
     */
    static async expire(key, seconds) {
        try {
            await redisClient.expire(key, seconds);
            return true;
        } catch (error) {
            console.error('Error al establecer expiración en Redis:', error);
            return false;
        }
    }
}

module.exports = RedisService; 