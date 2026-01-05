'use client';

import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';

interface SubscriptionGuardProps {
  children: ReactNode;
  feature: keyof import('@/lib/subscription-limits').SubscriptionLimits['features'];
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

export default function SubscriptionGuard({ 
  children, 
  feature, 
  fallback, 
  showUpgrade = true 
}: SubscriptionGuardProps) {
  const { isFeatureEnabled, getUpgradeMessage, loading, trialStatus, subscription } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!isFeatureEnabled(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgrade) {
      return (
        <div className="bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/20 rounded-xl p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-4">
            {trialStatus?.active 
              ? `This feature requires a subscription. Your trial ends in ${trialStatus.daysRemaining} days.`
              : getUpgradeMessage(feature)
            }
          </p>
          <Link
            href="/subscription"
            className="inline-flex items-center px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors"
          >
            {trialStatus?.active ? 'Subscribe Now' : 'Upgrade Now'}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

// Feature-specific guards
export function StaffLimitGuard({ children, currentCount }: { children: ReactNode; currentCount: number }) {
  const { isLimitReached, subscription } = useSubscription();

  if (isLimitReached('staff', currentCount)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Staff Limit Reached
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                You've reached the limit of {subscription?.plan.limits.staff} staff members for your {subscription?.plan.name} plan.
                <Link href="/subscription" className="font-medium underline ml-1">
                  Upgrade to add more staff
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function ClientLimitGuard({ children, currentCount }: { children: ReactNode; currentCount: number }) {
  const { isLimitReached, subscription } = useSubscription();

  if (isLimitReached('clients', currentCount)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Client Limit Reached
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                You've reached the limit of {subscription?.plan.limits.clients} clients for your {subscription?.plan.name} plan.
                <Link href="/subscription" className="font-medium underline ml-1">
                  Upgrade to add more clients
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


