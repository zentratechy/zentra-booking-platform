// Utility to get Stripe configuration for both local development and Firebase Functions
export const getStripeKey = (): string => {
  // First try environment variable (for local development)
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
  }
  
  // Fallback for Firebase Functions
  try {
    const functions = require('firebase-admin/functions');
    return functions.config().stripe?.secret_key || '';
  } catch (error) {
    console.error('Error getting Firebase Functions config:', error);
    return '';
  }
};

export const getStripePublishableKey = (): string => {
  // First try environment variable (for local development)
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  }
  
  // Fallback for Firebase Functions
  try {
    const functions = require('firebase-admin/functions');
    return functions.config().stripe?.publishable_key || '';
  } catch (error) {
    console.error('Error getting Firebase Functions config:', error);
    return '';
  }
};

