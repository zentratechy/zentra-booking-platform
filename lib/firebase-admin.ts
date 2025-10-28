import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Check if Firebase Admin credentials are available
const hasAdminCredentials = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

let app: any = null;
let adminAuth: any = null;
let adminDb: any = null;

if (hasAdminCredentials) {
  try {
    // Initialize Firebase Admin SDK
    const firebaseAdminConfig = {
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };

    // Initialize Firebase Admin (only if not already initialized)
    app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    console.log('💡 To enable automatic password reset, add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your .env.local file');
  }
} else {
  console.log('💡 Firebase Admin SDK not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.local for automatic password reset');
}

// Export Firebase Admin services
export { adminAuth, adminDb };
export default app;
