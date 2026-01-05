'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeProvider>
            <CustomerAuthProvider>
              {children}
            </CustomerAuthProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
