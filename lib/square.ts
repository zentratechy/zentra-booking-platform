// Square Web Payments SDK helper
export const loadSquarePayments = async (applicationId: string, locationId: string) => {
  if (typeof window === 'undefined') return null;
  
  // Load Square Web Payments SDK
  if (!(window as any).Square) {
    const script = document.createElement('script');
    script.src = 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    document.head.appendChild(script);
    
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }
  
  const payments = (window as any).Square.payments(applicationId, locationId);
  return payments;
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












