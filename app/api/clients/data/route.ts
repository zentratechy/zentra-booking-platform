import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { trackApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/clients/data');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Fetch clients and appointments for stats
    const [clientsSnapshot, appointmentsSnapshot, businessDoc] = await Promise.all([
      getDocs(query(collection(db, 'clients'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'appointments'), where('businessId', '==', businessId))),
      getDoc(doc(db, 'businesses', businessId))
    ]);

    const clients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const businessData = businessDoc.exists() ? businessDoc.data() : null;

    return NextResponse.json({
      success: true,
      data: {
        clients,
        appointments,
        business: businessData
      }
    });

  } catch (error) {
    console.error('Error fetching clients data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients data' },
      { status: 500 }
    );
  }
}


