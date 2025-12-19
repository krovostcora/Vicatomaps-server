// src/middleware/authenticate.js
const { verifyIdToken } = require('../config/firebase');
const User = require('../models/User');

/**
 * Middleware for Firebase token verification
 * Attaches req.user with user information
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from headers
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No authorization token provided'
            });
        }

        // Extract token
        const idToken = authHeader.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format'
            });
        }

        // Verify token with Firebase
        const decodedToken = await verifyIdToken(idToken);

        // Find user in MongoDB
        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found in database. Please complete registration.'
            });
        }

        user.updateLastLogin().catch(err =>
            console.error('Failed to update lastLogin:', err)
        );

        // Add user and decoded token to request
        req.user = user;
        req.firebaseUser = decodedToken;

        next();
    } catch (error) {
        console.error('Authentication error:', error);

        // Firebase Admin SDK error codes
        const code = error.code || '';

        if (code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (code === 'auth/invalid-id-token' || code === 'auth/invalid-argument') {
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
 * Optional authentication - does not block if no token
 * Useful for endpoints that work for both guests and logged-in users
 */
const optionalAuth = async (req, res, next) => {
    req.user = null;
    req.firebaseUser = null;

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(idToken);
        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        req.user = user || null;
        req.firebaseUser = decodedToken;

        next();
    } catch (error) {
        console.warn('Optional auth failed:', error.message);
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth
};
