import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== TEST CANCEL API CALLED ===');
  
  try {
    const body = await request.json();
    console.log('Test API - Request body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test API is working',
      receivedData: body
    });
  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json({
      error: 'Test API failed',
      details: error.message
    }, { status: 500 });
  }
}






