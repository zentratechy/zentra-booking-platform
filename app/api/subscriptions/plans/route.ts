import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { trackApiRequest } from '@/lib/api-middleware';

// Initialize Stripe lazily to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
};

export async function GET(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/subscriptions/plans');
    
    // Fetch prices from Stripe with fallback to hardcoded values
    let starterPriceAmount = 29;
    let professionalPriceAmount = 79;
    let businessPriceAmount = 149;
    
    try {
      if (process.env.STRIPE_STARTER_PRICE_ID) {
        const stripe = getStripe();
        const starterPrice = await stripe.prices.retrieve(process.env.STRIPE_STARTER_PRICE_ID);
        starterPriceAmount = starterPrice.unit_amount! / 100;
      }
    } catch (e) {
      console.warn('Could not fetch starter price from Stripe, using fallback:', e);
    }
    
    try {
      if (process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
        const stripe = getStripe();
        const professionalPrice = await stripe.prices.retrieve(process.env.STRIPE_PROFESSIONAL_PRICE_ID);
        professionalPriceAmount = professionalPrice.unit_amount! / 100;
      }
    } catch (e) {
      console.warn('Could not fetch professional price from Stripe, using fallback:', e);
    }
    
    try {
      if (process.env.STRIPE_BUSINESS_PRICE_ID) {
        const stripe = getStripe();
        const businessPrice = await stripe.prices.retrieve(process.env.STRIPE_BUSINESS_PRICE_ID);
        businessPriceAmount = businessPrice.unit_amount! / 100;
      }
    } catch (e) {
      console.warn('Could not fetch business price from Stripe, using fallback:', e);
    }

    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: starterPriceAmount,
        interval: 'month',
        description: 'Perfect for small businesses getting started',
        features: [
          '1 staff member',
          '1 location',
          '1,000 clients',
          '5,000 appointments',
          '10,000 API calls',
          'Basic reporting',
          'Email notifications',
          'Mobile responsive booking'
        ],
        limits: {
          staff: 1,
          clients: 1000,
          locations: 1,
          appointments: 5000,
          apiCalls: 10000
        },
        popular: false
      },
      {
        id: 'professional',
        name: 'Professional',
        price: professionalPriceAmount,
        interval: 'month',
        description: 'Ideal for growing businesses with multiple staff',
        features: [
          '5 staff members',
          '1 location',
          '5,000 clients',
          '25,000 appointments',
          '25,000 API calls',
          'Staff management',
          'Advanced reporting',
          'API access',
          'Priority support',
          'SMS notifications',
          'Loyalty program',
          'Multi-service bookings',
          'Buffer time management'
        ],
        limits: {
          staff: 5,
          clients: 5000,
          locations: 1,
          appointments: 25000,
          apiCalls: 25000
        },
        popular: true
      },
      {
        id: 'business',
        name: 'Business',
        price: businessPriceAmount,
        interval: 'month',
        description: 'For established businesses with multiple locations',
        features: [
          'Unlimited staff members',
          '3 locations',
          '25,000 clients',
          '100,000 appointments',
          '50,000 API calls',
          'Multi-location support',
          'Staff management',
          'Advanced reporting',
          'API access',
          'White-label options',
          'Priority support',
          'All Professional features'
        ],
        limits: {
          staff: -1, // unlimited
          clients: 25000,
          locations: 3,
          appointments: 100000,
          apiCalls: 50000
        },
        popular: false
      }
    ];

    return NextResponse.json({ plans });

  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}