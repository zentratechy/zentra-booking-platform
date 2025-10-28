'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function BookingConfirmed() {
  const searchParams = useSearchParams();
  const website = searchParams.get('website');
  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-pink via-soft-cream to-secondary/30 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          Booking Confirmed!
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Your appointment has been successfully booked and payment processed.
        </p>

        <div className="bg-soft-pink/30 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
          <ul className="text-left space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>You'll receive a confirmation email shortly</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>We'll send you a reminder 24 hours before your appointment</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your payment receipt has been sent to your email</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link 
            href={website || "/"}
            className="block w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-lg font-semibold transition-colors"
          >
            Return to Website
          </Link>
          
          <p className="text-sm text-gray-600">
            Need to make changes? Contact the business directly.
          </p>
        </div>
      </div>
    </div>
  );
}


