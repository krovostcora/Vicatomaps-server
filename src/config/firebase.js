// src/config/firebase.js
const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

// Ініціалізація Firebase Admin SDK
const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        // Спробувати .env змінні (для Render/production)
        if (process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY) {

            console.log('🔥 Initializing Firebase from environment variables');
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        }
        // Fallback на файл (для локальної розробки)
        else {
            console.log('🔥 Initializing Firebase from service account file');
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.join(__dirname, '../../config/serviceAccountKey.json');

            const serviceAccount = require(serviceAccountPath);

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        }

        console.log('✅ Firebase Admin SDK initialized');
        return firebaseApp;
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
        throw error;
    }
};

// Верифікація Firebase ID токена
const verifyIdToken = async (idToken) => {
    try {
        if (!firebaseApp) {
            initializeFirebase();
        }
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Token verification failed:', error.message);
        throw new Error('Invalid or expired token');
    }
};

// Отримати користувача з Firebase
const getFirebaseUser = async (uid) => {
    try {
        if (!firebaseApp) {
            initializeFirebase();
        }
        const userRecord = await admin.auth().getUser(uid);
        return userRecord;
    } catch (error) {
        console.error('Error fetching user from Firebase:', error);
        throw error;
    }
};

module.exports = {
    initializeFirebase,
    verifyIdToken,
    getFirebaseUser,
    admin
};