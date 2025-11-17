// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Зв'язок з Firebase
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Основна інформація
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

    // Налаштування користувача
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

    // Кастомні машини користувача
    customVehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }],

    // Історія поїздок
    tripHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    }],

    // Метадані
    lastLogin: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    // Для майбутніх фіч
    isActive: {
        type: Boolean,
        default: true
    },

    isPremium: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // автоматично керує createdAt та updatedAt
});

// Індекси для швидкого пошуку
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });

// Middleware для оновлення lastLogin
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Метод для отримання публічного профілю
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