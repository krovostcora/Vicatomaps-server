// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { verifyIdToken, getFirebaseUser } = require('../config/firebase');
const User = require('../models/User');
const { authenticate } = require('../middleware/authenticate');

/**
 * POST /api/auth/register
 * Register new user or update existing one
 * Body: none (all data from Firebase token)
 * Headers: Authorization: Bearer <firebase_id_token>
 */
router.post('/register', async (req, res) => {
    try {
        // Get token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No authorization token provided'
            });
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify token
        const decodedToken = await verifyIdToken(idToken);

        // Get full information from Firebase
        const firebaseUser = await getFirebaseUser(decodedToken.uid);

        // Check if user already exists
        let user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (user) {
            // Update existing user
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

        // Create new user
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
 * Get current user information
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
 * Update user profile
 * Body: { displayName?, preferences? }
 */
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { displayName, preferences } = req.body;

        const user = req.user;

        // Update allowed fields
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
 * Delete user account
 * NOTE: currently this only deletes from MongoDB, Firebase deletion must be handled separately
 */
router.delete('/account', authenticate, async (req, res) => {
    try {
        const user = req.user;

        // Delete user from MongoDB
        await User.deleteOne({ _id: user._id });

        // TODO: Also delete all user's trips, custom vehicles, etc.

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
        // NOTE: Client should delete token from storage
        // TODO: Can add token revocation here if needed

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
