import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface BusinessData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  createdAt: Date;
}

// Sign up a new business
export async function signUpBusiness(
  email: string,
  password: string,
  businessData: Omit<BusinessData, 'email' | 'createdAt'>
) {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save business data to Firestore
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days from now

    await setDoc(doc(db, 'businesses', user.uid), {
      ...businessData,
      email,
      currency: 'gbp',
      loyaltyProgram: {
        active: false,
        settings: {
          pointsPerDollar: 1,
          birthdayBonus: 50,
          referralBonus: 100,
          expirationMonths: 12,
        }
      },
      trial: {
        active: true,
        startDate: trialStartDate,
        endDate: trialEndDate,
        daysRemaining: 14
      },
      createdAt: new Date(),
      onboardingComplete: false,
    });

    // Send welcome email
    try {
      const response = await fetch('/api/email/send-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          businessName: businessData.businessName,
          ownerName: businessData.ownerName,
        }),
      });

      if (response.ok) {
        console.log('✅ Welcome email sent successfully');
      } else {
        console.warn('⚠️ Failed to send welcome email, but signup was successful');
      }
    } catch (emailError) {
      console.warn('⚠️ Failed to send welcome email:', emailError);
      // Don't fail the signup if email fails
    }

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

// Sign in existing user
export async function signInUser(email: string, password: string, rememberMe: boolean = true) {
  try {
    // Set persistence based on remember me checkbox
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let errorMessage = 'Failed to sign in';
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid credentials';
    }
    
    return { user: null, error: errorMessage };
  }
}

// Sign out
export async function signOutUser() {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Get business data
export async function getBusinessData(userId: string) {
  try {
    const docRef = doc(db, 'businesses', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: docSnap.data(), error: null };
    } else {
      return { data: null, error: 'Business not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// Auth state listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}


