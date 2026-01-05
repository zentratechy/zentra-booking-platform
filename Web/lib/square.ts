// Square Web Payments SDK helper
export const loadSquarePayments = async (applicationId: string, locationId: string, isSandbox: boolean = false) => {
  if (typeof window === 'undefined') return null;
  
  // Determine if we're in sandbox mode (from app ID or explicit parameter)
  const isSandboxMode = isSandbox || applicationId?.startsWith('sandbox-');
  
  // Load Square Web Payments SDK - use sandbox script for sandbox mode
  if (!(window as any).Square) {
    const script = document.createElement('script');
    // Square SDK automatically detects environment, but we can help by using the sandbox URL if needed
    // However, Square's Web SDK uses the same URL for both - it detects from app ID
    script.src = 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Square SDK load timeout')), 10000);
    });
  }
  
  try {
    // Initialize Square payments
    // Note: Square SDK validates that sandbox app IDs are only used on localhost/test domains
    // Production domains require production app IDs
    const payments = (window as any).Square.payments(applicationId, locationId);
    return payments;
  } catch (error: any) {
    console.error('Error initializing Square payments:', error);
    
    // Handle environment mismatch error
    if (error.name === 'ApplicationIdEnvironmentMismatchError' || 
        error.message?.includes('ApplicationIdEnvironmentMismatchError') ||
        error.message?.includes('sandbox') && error.message?.includes('production')) {
      
      const isProductionDomain = typeof window !== 'undefined' && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1');
      
      if (isSandboxMode && isProductionDomain) {
        // Sandbox app ID on production domain - Square doesn't allow this
        throw new Error('SANDBOX_ON_PRODUCTION: Square sandbox applications cannot be used on production domains. To accept payments on zentrabooking.com, please connect Square using production credentials in your Square Developer Dashboard. For testing, use localhost with sandbox credentials.');
      } else {
        throw new Error('Square environment mismatch: Application ID does not match the environment. Please verify your Square configuration.');
      }
    }
    
    throw error;
  }
};

export const createSquarePaymentRequest = async (payments: any, amount: number, currency: string) => {
  try {
    const paymentRequest = payments.paymentRequest({
      countryCode: 'US',
      currencyCode: currency.toUpperCase(),
      total: {
        amount: amount.toString(),
        label: 'Total',
      },
    });

    return paymentRequest;
  } catch (error) {
    console.error('Error creating payment request:', error);
    throw error;
  }
};












