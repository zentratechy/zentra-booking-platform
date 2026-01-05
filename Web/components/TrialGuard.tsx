'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface TrialGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function TrialGuard({ children, fallback }: TrialGuardProps) {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTrialStatus = async () => {
      try {
        const response = await fetch(`/api/trial/status?businessId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setTrialStatus(data.trial);
        }
      } catch (error) {
        console.error('Error fetching trial status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }

  // If trial is active or user has subscription, show content
  if (trialStatus?.active || !trialStatus) {
    return <>{children}</>;
  }

  // If trial expired, show upgrade prompt
  if (trialStatus?.expired) {
    return fallback || (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Trial Expired</h3>
        <p className="text-lg text-gray-600 mb-6">
          Your 14-day free trial has ended. Subscribe now to continue using Zentra.
        </p>
        <div className="space-y-4">
          <Link 
            href="/subscription"
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-blue-600 transition-colors"
          >
            Choose Your Plan
          </Link>
          <p className="text-sm text-gray-500">
            Plans start from £20/month
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}






