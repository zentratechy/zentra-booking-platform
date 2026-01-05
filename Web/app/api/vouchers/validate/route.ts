import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { code, businessId, amount } = await request.json();

    if (!code || !businessId) {
      return NextResponse.json(
        { error: 'Voucher code and business ID are required' },
        { status: 400 }
      );
    }

    // Find the voucher
    const vouchersQuery = query(
      collection(db, 'vouchers'),
      where('code', '==', code.toUpperCase()),
      where('businessId', '==', businessId)
    );
    
    const vouchersSnapshot = await getDocs(vouchersQuery);
    
    if (vouchersSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid voucher code' },
        { status: 404 }
      );
    }

    const voucher = vouchersSnapshot.docs[0].data();
    const voucherId = vouchersSnapshot.docs[0].id;

    // Check if voucher is active
    if (voucher.status !== 'active' || voucher.redeemed) {
      return NextResponse.json(
        { error: 'This voucher has already been used' },
        { status: 400 }
      );
    }

    // Check if voucher is expired
    if (voucher.expiryDate) {
      const expiryDate = voucher.expiryDate?.toDate ? voucher.expiryDate.toDate() : new Date(voucher.expiryDate);
      if (new Date() > expiryDate) {
        return NextResponse.json(
          { error: 'This voucher has expired' },
          { status: 400 }
        );
      }
    }

    // Check if voucher has enough balance
    const remainingBalance = amount || 0;
    if (voucher.balance < remainingBalance) {
      return NextResponse.json(
        { 
          error: 'Insufficient voucher balance',
          available: voucher.balance 
        },
        { status: 400 }
      );
    }

    // Return voucher details
    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucherId,
        code: voucher.code,
        value: Number(voucher.value),
        balance: Number(voucher.balance),
        originalValue: Number(voucher.originalValue),
        expiryDate: voucher.expiryDate,
      }
    });

  } catch (error: any) {
    console.error('Error validating voucher:', error);
    return NextResponse.json(
      { error: 'Failed to validate voucher' },
      { status: 500 }
    );
  }
}
