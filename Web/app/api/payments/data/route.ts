import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { trackApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/payments/data');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Fetch payments data (appointments with payment info)
    const [appointmentsSnapshot, businessDoc] = await Promise.all([
      getDocs(query(
        collection(db, 'appointments'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc'),
        limit(100)
      )),
      getDoc(doc(db, 'businesses', businessId))
    ]);

    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const businessData = businessDoc.exists() ? businessDoc.data() : null;

    return NextResponse.json({
      success: true,
      data: {
        appointments,
        business: businessData
      }
    });

  } catch (error) {
    console.error('Error fetching payments data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments data' },
      { status: 500 }
    );
  }
}






