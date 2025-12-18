// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Firebase connection
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
    },

    // Basic information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    displayName: {
        type: String,
        trim: true
    },

    photoURL: {
        type: String
    },

    // Provider info (google, apple, email)
    provider: {
        type: String,
        enum: ['email', 'google.com', 'apple.com'],
        default: 'email'
    },

    // User preferences
    preferences: {
        language: {
            type: String,
            enum: ['en', 'uk', 'pl', 'de', 'fr', 'es', 'hr', 'lt', 'ru', 'nl'],
            default: 'en'
        },
        darkMode: {
            type: Boolean,
            default: false
        },
        defaultVehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            default: null
        },
        measurementSystem: {
            type: String,
            enum: ['metric', 'imperial'],
            default: 'metric'
        }
    },

    // User's custom vehicles
    customVehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }],

    // Trip history
    tripHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    }],

    // Metadata
    lastLogin: {
        type: Date,
        default: Date.now
    },

    // TODO: Unused, for future features (premium tier and account deactivation)
    isActive: {
        type: Boolean,
        default: true
    },

    isPremium: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Method to update lastLogin
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Method to get public profile
userSchema.methods.toPublicProfile = function() {
    return {
        id: this._id,
        displayName: this.displayName,
        email: this.email,
        photoURL: this.photoURL,
        preferences: this.preferences,
        isPremium: this.isPremium,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
