import { NextRequest } from 'next/server';
import { trackApiCall } from './api-tracking';

/**
 * Middleware to track API calls
 * Call this at the beginning of your API routes
 */
export async function trackApiRequest(request: NextRequest, endpoint: string): Promise<void> {
  try {
    // Extract business ID from query params or headers
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || request.headers.get('x-business-id');
    
    if (businessId) {
      const method = request.method;
      await trackApiCall(businessId, endpoint, method);
    }
  } catch (error) {
    console.error('Error in API tracking middleware:', error);
    // Don't throw error to avoid breaking the main API call
  }
}

/**
 * Higher-order function to wrap API routes with tracking
 */
export function withApiTracking(endpoint: string) {
  return function(handler: (request: NextRequest) => Promise<Response>) {
    return async function(request: NextRequest): Promise<Response> {
      // Track the API call
      await trackApiRequest(request, endpoint);
      
      // Call the original handler
      return handler(request);
    };
  };
}






