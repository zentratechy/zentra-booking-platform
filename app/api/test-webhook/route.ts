import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('Test webhook received:', {
      bodyLength: body.length,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      bodyLength: body.length
    });
  } catch (error: any) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
