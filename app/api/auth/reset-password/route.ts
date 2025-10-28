import { NextResponse } from 'next/server';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      );
    }

    // Validate the reset token
    const resetDoc = await getDoc(doc(db, 'password_resets', email));
    
    if (!resetDoc.exists()) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const resetData = resetDoc.data();
    const now = new Date();
    const expires = resetData.expires.toDate();

    if (resetData.token !== token || now > expires) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin is available
    if (!adminAuth) {
      // Clean up the reset token
      await deleteDoc(doc(db, 'password_resets', email));
      
      console.log('⚠️ Firebase Admin not configured, falling back to support contact');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset token validated! Please contact support at support@mail.zentrabooking.com to complete your password reset. We will verify your identity and update your password within 24 hours.',
        requiresSupport: true
      });
    }

    // Find the user by email using Firebase Admin
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'No account found with this email address' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Update the user's password using Firebase Admin
    await adminAuth.updateUser(user.uid, {
      password: newPassword,
    });

    // Clean up the reset token
    await deleteDoc(doc(db, 'password_resets', email));

    console.log('✅ Password updated successfully for user:', email);

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully! You can now sign in with your new password.',
      requiresSupport: false
    });
  } catch (error: any) {
    console.error('❌ Error updating password:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
