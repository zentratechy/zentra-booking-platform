'use client';

import TrialExpirationGuard from '@/components/TrialExpirationGuard';
import LandscapeOrientation from '@/components/LandscapeOrientation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TrialExpirationGuard>
      <LandscapeOrientation />
      {children}
    </TrialExpirationGuard>
  );
}

