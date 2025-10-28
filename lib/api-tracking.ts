import { db } from './firebase';
import { collection, doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

export interface ApiUsage {
  businessId: string;
  year: number;
  month: number;
  totalCalls: number;
  callsByEndpoint: Record<string, number>;
  lastUpdated: Date;
}

export interface ApiCallData {
  businessId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
}

/**
 * Track an API call for a business
 */
export async function trackApiCall(businessId: string, endpoint: string, method: string = 'GET'): Promise<void> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    
    // Create document ID for the month (e.g., "2024-01")
    const docId = `${year}-${month.toString().padStart(2, '0')}`;
    const usageRef = doc(db, 'apiUsage', `${businessId}_${docId}`);
    
    // Get current usage data
    const usageDoc = await getDoc(usageRef);
    
    if (usageDoc.exists()) {
      // Update existing usage
      const currentData = usageDoc.data() as ApiUsage;
      const endpointKey = `${method}:${endpoint}`;
      
      await setDoc(usageRef, {
        ...currentData,
        totalCalls: increment(1),
        callsByEndpoint: {
          ...currentData.callsByEndpoint,
          [endpointKey]: (currentData.callsByEndpoint[endpointKey] || 0) + 1
        },
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } else {
      // Create new usage record
      const endpointKey = `${method}:${endpoint}`;
      
      await setDoc(usageRef, {
        businessId,
        year,
        month,
        totalCalls: 1,
        callsByEndpoint: {
          [endpointKey]: 1
        },
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error tracking API call:', error);
    // Don't throw error to avoid breaking the main API call
  }
}

/**
 * Get API usage for a business for a specific month
 */
export async function getApiUsage(businessId: string, year?: number, month?: number): Promise<ApiUsage | null> {
  try {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    const docId = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
    const usageRef = doc(db, 'apiUsage', `${businessId}_${docId}`);
    
    const usageDoc = await getDoc(usageRef);
    
    if (usageDoc.exists()) {
      return usageDoc.data() as ApiUsage;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting API usage:', error);
    return null;
  }
}

/**
 * Get API usage for a business for the current month
 */
export async function getCurrentMonthApiUsage(businessId: string): Promise<ApiUsage | null> {
  return getApiUsage(businessId);
}

/**
 * Get API usage summary for a business (last 3 months)
 */
export async function getApiUsageSummary(businessId: string): Promise<ApiUsage[]> {
  try {
    const now = new Date();
    const usageData: ApiUsage[] = [];
    
    // Get last 3 months
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      const usage = await getApiUsage(businessId, year, month);
      if (usage) {
        usageData.push(usage);
      }
    }
    
    return usageData;
  } catch (error) {
    console.error('Error getting API usage summary:', error);
    return [];
  }
}

/**
 * Check if business has exceeded API limits for current month
 */
export async function isApiLimitExceeded(businessId: string, limit: number): Promise<boolean> {
  try {
    const currentUsage = await getCurrentMonthApiUsage(businessId);
    
    if (!currentUsage) {
      return false; // No usage yet, not exceeded
    }
    
    return currentUsage.totalCalls >= limit;
  } catch (error) {
    console.error('Error checking API limit:', error);
    return false; // Don't block on error
  }
}

/**
 * Get API usage statistics for dashboard
 */
export async function getApiUsageStats(businessId: string): Promise<{
  currentMonth: number;
  lastMonth: number;
  totalCalls: number;
  topEndpoints: Array<{ endpoint: string; calls: number }>;
}> {
  try {
    const now = new Date();
    const currentUsage = await getCurrentMonthApiUsage(businessId);
    
    // Get last month's usage
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthUsage = await getApiUsage(businessId, lastMonth.getFullYear(), lastMonth.getMonth() + 1);
    
    // Get top endpoints from current month
    const topEndpoints = currentUsage 
      ? Object.entries(currentUsage.callsByEndpoint)
          .map(([endpoint, calls]) => ({ endpoint, calls }))
          .sort((a, b) => b.calls - a.calls)
          .slice(0, 5)
      : [];
    
    return {
      currentMonth: currentUsage?.totalCalls || 0,
      lastMonth: lastMonthUsage?.totalCalls || 0,
      totalCalls: (currentUsage?.totalCalls || 0) + (lastMonthUsage?.totalCalls || 0),
      topEndpoints
    };
  } catch (error) {
    console.error('Error getting API usage stats:', error);
    return {
      currentMonth: 0,
      lastMonth: 0,
      totalCalls: 0,
      topEndpoints: []
    };
  }
}


