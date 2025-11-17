// src/middleware/authenticate.js
const { verifyIdToken } = require('../config/firebase');
const User = require('../models/User');

/**
 * Middleware для верифікації Firebase токена
 * Додає req.user з інформацією про користувача
 */
const authenticate = async (req, res, next) => {
    try {
        // Отримати токен з headers
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No authorization token provided'
            });
        }

        // Витягти токен
        const idToken = authHeader.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format'
            });
        }

        // Verify токен з Firebase
        const decodedToken = await verifyIdToken(idToken);

        // Знайти користувача в MongoDB
        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found in database. Please complete registration.'
            });
        }

        // Оновити lastLogin
        user.updateLastLogin().catch(err =>
            console.error('Failed to update lastLogin:', err)
        );

        // Додати user та decoded token в request
        req.user = user;
        req.firebaseUser = decodedToken;

        next();
    } catch (error) {
        console.error('Authentication error:', error);

        if (error.message.includes('expired')) {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.message.includes('Invalid')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication - не блокує якщо немає токена
 * Корисно для endpoints що працюють і для гостей і для залогінених
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(idToken);
        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        req.user = user || null;
        req.firebaseUser = decodedToken;

        next();
    } catch (error) {
        // При помилці просто ставимо user як null
        req.user = null;
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth
};