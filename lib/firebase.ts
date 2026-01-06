import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if we have valid config
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

// Only initialize if we're in a browser environment and config is valid
if (typeof window !== 'undefined') {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (error) {
      console.error('Firebase initialization error:', error);
      // Don't throw - allow the app to continue without Firebase in some contexts
    }
  } else {
    console.warn('Firebase configuration is missing. Please check your environment variables.');
  }
}

export { auth, db, storage };
export default app;

