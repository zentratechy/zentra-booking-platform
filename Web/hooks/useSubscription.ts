import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscriptionLimits, checkFeatureAccess, checkLimit, SubscriptionLimits } from '@/lib/subscription-limits';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    staff: number;
    clients: number;
    locations: number;
  };
}

interface Subscription {
  id: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'unpaid';
  plan: SubscriptionPlan;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription and trial status in parallel
      const [subscriptionResponse, trialResponse] = await Promise.all([
        fetch(`/api/subscriptions/current?businessId=${user?.uid}`),
        fetch(`/api/trial/status?businessId=${user?.uid}`)
      ]);
      
      let currentSubscription = null;
      let currentTrialStatus = null;
      
      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json();
        currentSubscription = subData.subscription;
        setSubscription(currentSubscription);
      }
      
      if (trialResponse.ok) {
        const trialData = await trialResponse.json();
        currentTrialStatus = trialData.trial;
        setTrialStatus(currentTrialStatus);
      }
      
      // Determine current plan and limits using the fresh data
      const isTrial = currentTrialStatus?.active || false;
      const plan = currentSubscription?.plan?.id || 'starter';
      const subscriptionLimits = getSubscriptionLimits(plan.toLowerCase(), isTrial);
      console.log('🔍 useSubscription Debug:', {
        plan,
        isTrial,
        subscriptionLimits,
        subscription: currentSubscription?.plan
      });
      setLimits(subscriptionLimits);
      
    } catch (err) {
      setError('Error fetching subscription data');
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (feature: keyof SubscriptionLimits['features']): boolean => {
    const isTrial = trialStatus?.active || false;
    const plan = subscription?.plan?.id || 'starter';
    
    return checkFeatureAccess(plan.toLowerCase(), isTrial, feature);
  };

  const isLimitReached = (resource: keyof Omit<SubscriptionLimits, 'features' | 'apiCalls'>, currentCount: number): boolean => {
    if (!limits) {
      console.log('❌ No limits available');
      return false;
    }
    
    const limit = limits[resource];
    const isReached = limit !== -1 && currentCount >= limit;
    console.log(`🔍 Limit Check [${resource}]:`, {
      limit,
      currentCount,
      isReached,
      limits
    });
    return isReached; // -1 means unlimited
  };

  const getUpgradeMessage = (feature: string): string => {
    if (subscription?.plan?.id === 'starter') {
      return 'Upgrade to Professional to access this feature';
    } else if (subscription?.plan?.id === 'professional') {
      return 'Upgrade to Business to access this feature';
    }
    return 'Subscribe to access this feature';
  };

  return {
    subscription,
    trialStatus,
    limits,
    loading,
    error,
    refetch: fetchSubscription,
    isFeatureEnabled,
    isLimitReached,
    getUpgradeMessage,
    isActive: subscription?.status === 'active',
    isTrial: trialStatus?.active || false,
  };
}


