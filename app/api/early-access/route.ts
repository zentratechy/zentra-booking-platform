import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Store the email in Firestore
    const docRef = await addDoc(collection(db, 'earlyAccess'), {
      email: email.toLowerCase().trim(),
      createdAt: serverTimestamp(),
      source: 'coming-soon-page',
      status: 'pending'
    });

    console.log('📧 Early access signup:', { email, id: docRef.id });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest! We\'ll notify you when Zentra launches.',
      id: docRef.id
    });

  } catch (error) {
    console.error('Error collecting early access email:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}




