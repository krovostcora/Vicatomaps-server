// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { verifyIdToken, getFirebaseUser } = require('../config/firebase');
const User = require('../models/User');
const { authenticate } = require('../middleware/authenticate');

/**
 * POST /api/auth/register
 * Реєстрація нового користувача або оновлення існуючого
 * Body: немає (всі дані з Firebase token)
 * Headers: Authorization: Bearer <firebase_id_token>
 */
router.post('/register', async (req, res) => {
    try {
        // Отримати токен
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No authorization token provided'
            });
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify токен
        const decodedToken = await verifyIdToken(idToken);

        // Отримати повну інформацію з Firebase
        const firebaseUser = await getFirebaseUser(decodedToken.uid);

        // Перевірити чи користувач вже існує
        let user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (user) {
            // Оновити існуючого користувача
            user.email = firebaseUser.email;
            user.displayName = firebaseUser.displayName || user.displayName;
            user.photoURL = firebaseUser.photoURL || user.photoURL;
            user.lastLogin = new Date();
            await user.save();

            return res.json({
                success: true,
                message: 'User logged in successfully',
                user: user.toPublicProfile(),
                isNewUser: false
            });
        }

        // Створити нового користувача
        user = new User({
            firebaseUid: decodedToken.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || null,
            photoURL: firebaseUser.photoURL || null,
            provider: firebaseUser.providerData[0]?.providerId || 'email',
            lastLogin: new Date()
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: user.toPublicProfile(),
            isNewUser: true
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            details: error.message
        });
    }
});

/**
 * GET /api/auth/me
 * Отримати інформацію про поточного користувача
 * Headers: Authorization: Bearer <firebase_id_token>
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.toPublicProfile()
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Оновити профіль користувача
 * Body: { displayName?, preferences? }
 */
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { displayName, preferences } = req.body;

        const user = req.user;

        // Оновити дозволені поля
        if (displayName !== undefined) {
            user.displayName = displayName;
        }

        if (preferences) {
            if (preferences.language) user.preferences.language = preferences.language;
            if (preferences.darkMode !== undefined) user.preferences.darkMode = preferences.darkMode;
            if (preferences.defaultVehicleId) user.preferences.defaultVehicleId = preferences.defaultVehicleId;
            if (preferences.measurementSystem) user.preferences.measurementSystem = preferences.measurementSystem;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.toPublicProfile()
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            details: error.message
        });
    }
});

/**
 * DELETE /api/auth/account
 * Видалити акаунт користувача
 * IMPORTANT: це тільки видаляє з MongoDB, з Firebase треба видаляти окремо
 */
router.delete('/account', authenticate, async (req, res) => {
    try {
        const user = req.user;

        // Видалити користувача з MongoDB
        await User.deleteOne({ _id: user._id });

        // TODO: Також видалити всі його trips, custom vehicles тощо

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (optional, Firebase revoke token)
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        // На клієнті просто видалити токен з storage
        // Можна додати revoke token якщо потрібно

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

module.exports = router;