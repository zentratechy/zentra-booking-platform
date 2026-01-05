import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const type = searchParams.get('type');

    if (!businessId) {
      return NextResponse.json({
        error: 'Business ID is required'
      }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({
        error: 'Type is required'
      }, { status: 400 });
    }

    let count = 0;

    switch (type) {
      case 'staff':
        const staffQuery = query(
          collection(db, 'staff'),
          where('businessId', '==', businessId)
        );
        const staffSnapshot = await getCountFromServer(staffQuery);
        count = staffSnapshot.data().count;
        break;

      case 'clients':
        const clientsQuery = query(
          collection(db, 'clients'),
          where('businessId', '==', businessId)
        );
        const clientsSnapshot = await getCountFromServer(clientsQuery);
        count = clientsSnapshot.data().count;
        break;

      case 'appointments':
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('businessId', '==', businessId)
        );
        const appointmentsSnapshot = await getCountFromServer(appointmentsQuery);
        count = appointmentsSnapshot.data().count;
        break;

      case 'locations':
        const locationsQuery = query(
          collection(db, 'locations'),
          where('businessId', '==', businessId)
        );
        const locationsSnapshot = await getCountFromServer(locationsQuery);
        count = locationsSnapshot.data().count;
        break;

      default:
        return NextResponse.json({
          error: 'Invalid type. Must be one of: staff, clients, appointments, locations'
        }, { status: 400 });
    }

    return NextResponse.json({
      type,
      count,
      businessId
    });

  } catch (error: any) {
    console.error('Error fetching limits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
      { status: 500 }
    );
  }
}






