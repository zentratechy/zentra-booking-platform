export interface SubscriptionLimits {
  staff: number;
  locations: number;
  clients: number;
  appointments: number;
  apiCalls: number;
  features: {
    multiLocation: boolean;
    staffManagement: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
  };
}

export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  trial: {
    staff: 1,
    locations: 1,
    clients: 1000,
    appointments: 5000,
    apiCalls: 10000,
    features: {
      multiLocation: false,
      staffManagement: false,
      advancedReporting: true,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  starter: {
    staff: 1,
    locations: 1,
    clients: 1000,
    appointments: 5000,
    apiCalls: 10000,
    features: {
      multiLocation: false,
      staffManagement: false,
      advancedReporting: true,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  professional: {
    staff: 5,
    locations: 1,
    clients: 5000,
    appointments: 25000,
    apiCalls: 25000,
    features: {
      multiLocation: false,
      staffManagement: true,
      advancedReporting: true,
      apiAccess: true,
      whiteLabel: false,
      prioritySupport: true,
    },
  },
  business: {
    staff: -1, // unlimited
    locations: 3,
    clients: 25000,
    appointments: 100000,
    apiCalls: 50000,
    features: {
      multiLocation: true,
      staffManagement: true,
      advancedReporting: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
    },
  },
};

export function getSubscriptionLimits(plan: string, isTrial: boolean = false): SubscriptionLimits {
  if (isTrial) {
    return SUBSCRIPTION_LIMITS.trial;
  }
  return SUBSCRIPTION_LIMITS[plan.toLowerCase()] || SUBSCRIPTION_LIMITS.starter;
}

export function checkFeatureAccess(plan: string, isTrial: boolean, feature: keyof SubscriptionLimits['features']): boolean {
  const limits = getSubscriptionLimits(plan, isTrial);
  return limits.features[feature];
}

export function checkLimit(plan: string, isTrial: boolean, limitType: keyof Omit<SubscriptionLimits, 'features'>, currentCount: number): boolean {
  const limits = getSubscriptionLimits(plan, isTrial);
  const limit = limits[limitType];
  
  // -1 means unlimited
  if (limit === -1) return true;
  
  return currentCount < limit;
}
