'use client';

import TrialExpirationGuard from '@/components/TrialExpirationGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TrialExpirationGuard>
      {children}
    </TrialExpirationGuard>
  );
}

