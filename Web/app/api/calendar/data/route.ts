import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { trackApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/calendar/data');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Fetch all calendar data
    const [appointmentsSnapshot, clientsSnapshot, staffSnapshot, servicesSnapshot, businessDoc] = await Promise.all([
      getDocs(query(collection(db, 'appointments'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'clients'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'staff'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'services'), where('businessId', '==', businessId))),
      getDoc(doc(db, 'businesses', businessId))
    ]);

    const appointments = appointmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamps to ISO strings for serialization
      const processedData: any = { id: doc.id };
      
      Object.keys(data).forEach(key => {
        const value = data[key];
        // Check if it's a Firestore Timestamp
        if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
          processedData[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
          // Also handle Timestamp-like objects
          processedData[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString();
        } else {
          processedData[key] = value;
        }
      });
      
      return processedData;
    });

    const clients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const staff = staffSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const services = servicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const businessData = businessDoc.exists() ? businessDoc.data() : null;

    return NextResponse.json({
      success: true,
      data: {
        appointments,
        clients,
        staff,
        services,
        business: businessData
      }
    });

  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}


