import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

export async function signOutUser(): Promise<{ error: Error | null }> {
  try {
    if (!auth) {
      return { error: new Error('Firebase auth is not initialized') };
    }
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    console.error('Error signing out:', error);
    return { error: error as Error };
  }
}

