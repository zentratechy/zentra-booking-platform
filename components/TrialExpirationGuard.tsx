'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Simple approach: just check if we're on subscription page
const shouldSkipTrialCheck = () => {
  if (typeof window === 'undefined') return false;
  
  // Skip trial check if we're on subscription pages
  if (window.location.pathname === '/dashboard/subscription' || window.location.pathname === '/subscription') {
    return true;
  }
  
  return false;
};

interface TrialStatus {
  active: boolean;
  expired: boolean;
  overridden: boolean;
  startDate: any;
  endDate: any;
  daysRemaining: number;
  totalDays: number;
}

interface TrialExpirationGuardProps {
  children: React.ReactNode;
}

export default function TrialExpirationGuard({ children }: TrialExpirationGuardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Check if we should skip trial check
    if (shouldSkipTrialCheck()) {
      setIsChecking(false);
      return;
    }

    // If we're already navigating, don't check trial status
    if (isNavigating) {
      setIsChecking(false);
      return;
    }

    const checkTrialStatus = async () => {
      try {
        const response = await fetch(`/api/trial/status?businessId=${user.uid}`);
        
        if (!response.ok) {
          console.error('Failed to fetch trial status:', response.status);
          setIsChecking(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.trial) {
          setTrialStatus(data.trial);
          
          // If trial has expired and not overridden by subscription, show trial expired page
          if (data.trial.expired && !data.trial.overridden && !isNavigating) {
            console.log('Trial expired and not overridden, showing expired state');
            setTrialStatus(data.trial);
          } else if (data.trial.overridden) {
            console.log('Trial overridden by active subscription, allowing access');
            setTrialStatus({ ...data.trial, expired: false }); // Ensure expired is false
          }
          // Otherwise, allow access to dashboard
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
        // On error, allow access to dashboard (don't block user)
        // This prevents blocking users due to API/Stripe sync issues
        setTrialStatus(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkTrialStatus();
  }, [user, router, pathname, isNavigating]);

  // Show loading while checking trial status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-soft-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking trial status...</p>
        </div>
      </div>
    );
  }

  // If trial has expired AND is not overridden by subscription, show a message with countdown and redirect
  // Also handle case where trialStatus is null (API error) - allow access
  if (trialStatus && trialStatus.expired && !trialStatus.overridden) {
    return <TrialExpiredPage />;
  }

  // If trial is active, overridden by subscription, user has a subscription, or API error, show the children
  return <>{children}</>;
}

// Trial Expired Page Component with Countdown
function TrialExpiredPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShouldRedirect(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle redirect when countdown reaches 0
  useEffect(() => {
    if (shouldRedirect) {
      // Try router.push first, then fallback to window.location
      try {
        router.push('/subscription?expired=true');
        // If router.push doesn't work, use window.location as fallback
        setTimeout(() => {
          window.location.href = '/subscription?expired=true';
        }, 100);
      } catch (error) {
        console.error('TrialExpiredPage: Router error, using window.location:', error);
        window.location.href = '/subscription?expired=true';
      }
    }
  }, [shouldRedirect, router]);

  const handleGoToSubscription = () => {
    try {
      router.push('/subscription?expired=true');
      // If router.push doesn't work, use window.location as fallback
      setTimeout(() => {
        window.location.href = '/subscription?expired=true';
      }, 100);
    } catch (error) {
      console.error('TrialExpiredPage: Manual router error, using window.location:', error);
      window.location.href = '/subscription?expired=true';
    }
  };

  return (
    <div className="min-h-screen bg-soft-cream flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trial Expired</h2>
        <p className="text-gray-600 mb-6">
          Your 14-day trial has ended. Please subscribe to continue using Zentra.
        </p>
        
        {/* Countdown */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">
            Redirecting to subscription page in:
          </p>
          <div className="text-3xl font-bold text-red-600">
            {countdown}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoToSubscription}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Subscription Page
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
