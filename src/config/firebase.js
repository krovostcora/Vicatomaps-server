// src/config/firebase.js
const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

// Initialize Firebase Admin SDK
const ensureFirebaseInitialized = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        // Try .env variables (for Render/production)
        if (process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY) {

            console.log('Initializing Firebase from environment variables');

            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            // Remove surrounding quotes if present
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.slice(1, -1);
            }

            // Replace \\n with actual newlines
            privateKey = privateKey.replace(/\\n/g, '\n');

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                })
            });
        }
        // Fallback to file (for local development)
        else {
            console.log('Initializing Firebase from service account file');
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.join(__dirname, '../../config/serviceAccountKey.json');

            const serviceAccount = require(serviceAccountPath);

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        }

        console.log('Firebase Admin SDK initialized');
        return firebaseApp;
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
        throw error;
    }
};

// Verify Firebase ID token
const verifyIdToken = async (idToken) => {
    try {
        ensureFirebaseInitialized();
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Token verification failed:', error.message);
        throw new Error('Invalid or expired token');
    }
};

// Get user from Firebase
const getFirebaseUser = async (uid) => {
    try {
        ensureFirebaseInitialized();
        const userRecord = await admin.auth().getUser(uid);
        return userRecord;
    } catch (error) {
        console.error('Error fetching user from Firebase:', error);
        throw error;
    }
};

module.exports = {
    ensureFirebaseInitialized,
    verifyIdToken,
    getFirebaseUser,
    admin
};
