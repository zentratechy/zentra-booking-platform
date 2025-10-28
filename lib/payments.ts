import Stripe from 'stripe';

export type PaymentProvider = 'stripe' | 'square' | 'none';

export interface PaymentConfig {
  provider: PaymentProvider;
  stripe?: {
    accountId: string;
    connected: boolean;
    onboardingComplete: boolean;
  };
  square?: {
    merchantId: string;
    locationId: string;
    connected: boolean;
    accessToken?: string; // Store securely, never expose to client
  };
}

// Initialize Stripe (for Zentra's own subscriptions and Connect)
export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
};

// Create Stripe Connect account link for business onboarding
export async function createStripeConnectAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  try {
    const stripe = getStripe();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return { url: accountLink.url, error: null };
  } catch (error: any) {
    console.error('Error creating account link:', error);
    return { url: null, error: error.message };
  }
}

// Create Stripe Connect account for business
export async function createStripeConnectAccount(email: string, businessName: string) {
  try {
    const stripe = getStripe();
    const account = await stripe.accounts.create({
      type: 'standard', // Business has full access to Stripe Dashboard
      email,
      business_profile: {
        name: businessName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return { account, error: null };
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    return { account: null, error: error.message };
  }
}

// Check Stripe Connect account status
export async function getStripeAccountStatus(accountId: string) {
  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return {
      connected: account.charges_enabled && account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      error: null,
    };
  } catch (error: any) {
    console.error('Error getting account status:', error);
    return {
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      error: error.message,
    };
  }
}

// Create payment intent for booking (routes to correct provider)
export async function createBookingPayment(
  amount: number,
  currency: string,
  businessId: string,
  paymentConfig: PaymentConfig,
  metadata: any
) {
  if (paymentConfig.provider === 'stripe' && paymentConfig.stripe?.accountId) {
    return createStripePayment(amount, currency, paymentConfig.stripe.accountId, metadata);
  } else if (paymentConfig.provider === 'square') {
    return createSquarePayment(amount, currency, metadata);
  } else {
    return { paymentIntent: null, error: 'No payment provider configured' };
  }
}

// Stripe payment
async function createStripePayment(amount: number, currency: string, connectedAccountId: string, metadata: any) {
  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
      application_fee_amount: Math.round(amount * 0.05 * 100), // 5% platform fee (optional)
    }, {
      stripeAccount: connectedAccountId, // Payment goes to business's account
    });
    
    return { paymentIntent, error: null };
  } catch (error: any) {
    console.error('Error creating Stripe payment:', error);
    return { paymentIntent: null, error: error.message };
  }
}

// Square payment (placeholder - will need Square SDK server-side)
async function createSquarePayment(amount: number, currency: string, metadata: any) {
  // TODO: Implement Square payment using Square SDK
  // This will need to be done server-side (API route)
  return { 
    paymentIntent: null, 
    error: 'Square payments not yet implemented' 
  };
}

// Subscription management for Zentra's monthly billing
export async function createSubscription(customerId: string, priceId: string) {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14, // 14-day free trial
    });
    return { subscription, error: null };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return { subscription: null, error: error.message };
  }
}

// Create Stripe customer for business (for their Zentra subscription)
export async function createStripeCustomer(email: string, name: string, businessId: string) {
  try {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        businessId,
      },
    });
    return { customer, error: null };
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return { customer: null, error: error.message };
  }
}


