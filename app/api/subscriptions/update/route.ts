import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getStripeKey } from '@/lib/stripe-config';

// Initialize Stripe lazily to avoid build-time errors
const getStripe = () => {
  const key = getStripeKey();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    apiVersion: '2025-09-30.clover',
  });
};

export async function POST(request: NextRequest) {
  try {
    const { businessId, planId } = await request.json();

    if (!businessId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and planId are required' },
        { status: 400 }
      );
    }

    // Define subscription plans
    const plans = {
      starter: {
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
        name: 'Starter',
        price: 29,
      },
      professional: {
        priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        name: 'Professional',
        price: 79,
      },
      business: {
        priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
        name: 'Business',
        price: 149,
      }
    };

    const selectedPlan = plans[planId as keyof typeof plans];
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get the Stripe customer ID from Firestore
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();
    const stripeCustomerId = businessData?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please create a subscription first.' },
        { status: 404 }
      );
    }

    // Get active subscriptions
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found. Please create a subscription first.' },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];
    const currentPriceId = subscription.items.data[0].price.id;

    // Check if they're already on this plan
    if (currentPriceId === selectedPlan.priceId) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      );
    }

    // Determine current plan by matching price ID
    let currentPlan: { name: string; price: number } | null = null;
    for (const [planKey, plan] of Object.entries(plans)) {
      if (plan.priceId === currentPriceId) {
        currentPlan = plan;
        break;
      }
    }

    // If we can't find the current plan, try to get price from Stripe
    let currentPrice = 0;
    if (!currentPlan) {
      try {
        const currentPriceObj = await stripe.prices.retrieve(currentPriceId);
        currentPrice = (currentPriceObj.unit_amount || 0) / 100; // Convert from cents
      } catch (e) {
        console.warn('Could not retrieve current price from Stripe');
      }
    } else {
      currentPrice = currentPlan.price;
    }

    // Determine if this is an upgrade or downgrade
    const isUpgrade = selectedPlan.price > currentPrice;
    const isDowngrade = selectedPlan.price < currentPrice;

    // Verify the new price ID exists, or create it on the fly
    let newPriceId = selectedPlan.priceId;
    let priceExists = false;
    
    if (newPriceId && newPriceId.startsWith('price_')) {
      // Try to retrieve the existing price
      try {
        await stripe.prices.retrieve(newPriceId);
        priceExists = true;
      } catch (priceError: any) {
        console.warn(`Price ID ${newPriceId} not found in Stripe, will create price on the fly:`, priceError.message);
        priceExists = false;
      }
    }
    
    // If price doesn't exist, create it on the fly
    if (!priceExists) {
      try {
        // First, check if a product exists for Zentra subscriptions
        let productId: string | null = null;
        try {
          const products = await stripe.products.list({
            limit: 100,
          });
          const zentraProduct = products.data.find(p => 
            p.name?.includes('Zentra') || p.name?.includes('Subscription')
          );
          if (zentraProduct) {
            productId = zentraProduct.id;
          }
        } catch (e) {
          console.warn('Could not list products, will create new product:', e);
        }
        
        // Create product if it doesn't exist
        if (!productId) {
          const product = await stripe.products.create({
            name: 'Zentra Subscription',
            description: 'Monthly subscription for Zentra booking platform',
          });
          productId = product.id;
        }
        
        // Create the price
        const newPrice = await stripe.prices.create({
          currency: 'gbp',
          unit_amount: selectedPlan.price * 100, // Convert to cents
          recurring: {
            interval: 'month',
          },
          product: productId,
        });
        
        newPriceId = newPrice.id;
        console.log(`Created new price on the fly: ${newPriceId} for ${selectedPlan.name} plan`);
      } catch (createPriceError: any) {
        console.error('Error creating price on the fly:', createPriceError);
        return NextResponse.json(
          { 
            error: 'Failed to create subscription price. Please contact support.',
            details: createPriceError.message || 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // For downgrades, get the latest paid invoice to find payment intent for refund
    let refundAmount = 0;
    let refundId: string | null = null;
    
    if (isDowngrade) {
      try {
        console.log('Processing downgrade refund...', {
          subscriptionId: subscription.id,
          currentPrice,
          newPrice: selectedPlan.price,
        });

        // Get invoices for this specific subscription
        const invoices = await stripe.invoices.list({
          customer: stripeCustomerId,
          subscription: subscription.id,
          status: 'paid',
          limit: 10, // Get more invoices to find the most recent paid one
        });

        console.log(`Found ${invoices.data.length} paid invoices for subscription`);

        // Also try to get the latest invoice from the subscription object
        let latestInvoice: Stripe.Invoice | null = null;
        if ((subscription as any).latest_invoice) {
          const latestInvoiceId = typeof (subscription as any).latest_invoice === 'string'
            ? (subscription as any).latest_invoice
            : (subscription as any).latest_invoice?.id;
          
          if (latestInvoiceId) {
            try {
              latestInvoice = await stripe.invoices.retrieve(latestInvoiceId);
              console.log('Retrieved latest invoice from subscription:', latestInvoice.id);
            } catch (e) {
              console.warn('Could not retrieve latest invoice:', e);
            }
          }
        }

        // Use latest invoice from subscription, or the most recent paid invoice
        const invoiceToUse = latestInvoice || (invoices.data.length > 0 ? invoices.data[0] : null);

        if (invoiceToUse) {
          console.log('Using invoice for refund:', {
            invoiceId: invoiceToUse.id,
            status: invoiceToUse.status,
            amount_paid: invoiceToUse.amount_paid,
          });

          // Try multiple ways to get the payment intent
          let paymentIntentId: string | null = null;
          
          // Method 1: Direct payment_intent field
          const paymentIntent = (invoiceToUse as any).payment_intent;
          if (paymentIntent) {
            paymentIntentId = typeof paymentIntent === 'string' 
              ? paymentIntent 
              : paymentIntent?.id || null;
          }

          // Method 2: Check charge object
          const invoiceCharge = (invoiceToUse as any).charge;
          if (!paymentIntentId && invoiceCharge) {
            const chargeId = typeof invoiceCharge === 'string' 
              ? invoiceCharge 
              : invoiceCharge?.id;
            
            if (chargeId) {
              try {
                const charge = await stripe.charges.retrieve(chargeId);
                paymentIntentId = typeof charge.payment_intent === 'string'
                  ? charge.payment_intent
                  : charge.payment_intent?.id || null;
                console.log('Got payment intent from charge:', paymentIntentId);
              } catch (e) {
                console.warn('Could not retrieve charge:', e);
              }
            }
          }

          // Method 3: Get from payment intents list
          if (!paymentIntentId) {
            try {
              const paymentIntents = await stripe.paymentIntents.list({
                customer: stripeCustomerId,
                limit: 1,
              });
              if (paymentIntents.data.length > 0) {
                paymentIntentId = paymentIntents.data[0].id;
                console.log('Got payment intent from list:', paymentIntentId);
              }
            } catch (e) {
              console.warn('Could not list payment intents:', e);
            }
          }

          if (paymentIntentId) {
            // Get the subscription's CURRENT billing period
            // We need to retrieve the subscription with expanded fields to get current_period_start and current_period_end
            let periodStart: number | undefined;
            let periodEnd: number | undefined;
            
            // Try to retrieve subscription with all fields
            try {
              const fullSubscription = await stripe.subscriptions.retrieve(subscription.id, {
                expand: ['items.data.price.product'],
              });
              
              // Access period values - they should be on the subscription object
              periodStart = (fullSubscription as any).current_period_start;
              periodEnd = (fullSubscription as any).current_period_end;
              
              console.log('Retrieved subscription period:', {
                periodStart,
                periodEnd,
                subscriptionId: fullSubscription.id,
              });
            } catch (e) {
              console.warn('Could not retrieve full subscription:', e);
            }
            
            // If still not found, try to calculate from billing_cycle_anchor and created date
            if (!periodStart || !periodEnd) {
              const billingCycleAnchor = (subscription as any).billing_cycle_anchor;
              const created = (subscription as any).created;
              
              if (billingCycleAnchor) {
                // Use billing cycle anchor as period start
                periodStart = billingCycleAnchor;
                // For monthly subscriptions, period is approximately 30 days (2592000 seconds)
                // But we should calculate based on when the subscription was created
                const now = Math.floor(Date.now() / 1000);
                const daysSinceAnchor = Math.floor((now - billingCycleAnchor) / (24 * 60 * 60));
                const daysInMonth = 30; // Approximate
                const nextAnchor = billingCycleAnchor + (daysInMonth * 24 * 60 * 60);
                
                // Find the current period by finding the most recent anchor before now
                let currentPeriodStart = billingCycleAnchor;
                while (currentPeriodStart + (daysInMonth * 24 * 60 * 60) < now) {
                  currentPeriodStart += (daysInMonth * 24 * 60 * 60);
                }
                periodStart = currentPeriodStart;
                periodEnd = currentPeriodStart + (daysInMonth * 24 * 60 * 60);
                
                console.log('Calculated period from billing cycle anchor:', {
                  billingCycleAnchor,
                  currentPeriodStart: periodStart,
                  periodEnd,
                });
              }
            }
            
            // Calculate prorated refund amount based on time remaining in billing period
            const now = Math.floor(Date.now() / 1000);
            
            console.log('Final period values:', {
              periodStart,
              periodEnd,
              now,
              periodStartType: typeof periodStart,
              periodEndType: typeof periodEnd,
            });
            
            if (periodStart && periodEnd && typeof periodStart === 'number' && typeof periodEnd === 'number') {
              const periodDuration = periodEnd - periodStart;
              const timeRemaining = Math.max(0, periodEnd - now); // Ensure non-negative
              
              // Only proceed if period is reasonable (at least 1 day = 86400 seconds)
              if (periodDuration > 86400) {
                // Retrieve payment intent first to check available amount
                let paymentIntent: Stripe.PaymentIntent;
                try {
                  paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                  console.log('Payment intent retrieved:', {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount,
                    amount_refunded: (paymentIntent as any).amount_refunded,
                  });
                } catch (piError: any) {
                  console.error('Error retrieving payment intent:', {
                    error: piError.message,
                    type: piError.type,
                    code: piError.code,
                  });
                  throw piError;
                }

                // Calculate the prorated refund (unused portion of higher plan)
                const priceDifference = currentPrice - selectedPlan.price;
                const proratedRefund = periodDuration > 0 
                  ? (priceDifference * timeRemaining) / periodDuration
                  : 0;
                
                // Round to 2 decimal places
                const calculatedRefundAmount = Math.round(proratedRefund * 100) / 100;
                
                // Get available amount for refund (total amount - already refunded)
                const alreadyRefunded = (paymentIntent as any).amount_refunded || 0;
                const availableForRefund = (paymentIntent.amount - alreadyRefunded) / 100; // Convert to pounds
                
                // Use the minimum of calculated refund and available amount
                refundAmount = Math.min(calculatedRefundAmount, availableForRefund);
                
                console.log('Refund calculation:', {
                  priceDifference,
                  periodDuration,
                  periodDurationDays: periodDuration / (24 * 60 * 60),
                  timeRemaining,
                  timeRemainingDays: timeRemaining / (24 * 60 * 60),
                  proratedRefund,
                  calculatedRefundAmount,
                  paymentIntentAmount: paymentIntent.amount / 100,
                  alreadyRefunded: alreadyRefunded / 100,
                  availableForRefund,
                  finalRefundAmount: refundAmount,
                });
                
                if (refundAmount > 0) {
                  // Create refund for the prorated amount (capped at available amount)
                  const refund = await stripe.refunds.create({
                    payment_intent: paymentIntentId,
                    amount: Math.round(refundAmount * 100), // Convert to cents
                    reason: 'requested_by_customer',
                    metadata: {
                      subscription_id: subscription.id,
                      reason: 'Subscription downgrade proration',
                      business_id: businessId,
                      from_plan: currentPlan?.name || 'Unknown',
                      to_plan: selectedPlan.name,
                      calculated_amount: calculatedRefundAmount.toFixed(2),
                      available_amount: availableForRefund.toFixed(2),
                    },
                  });
                  
                  refundId = refund.id;
                  
                  if (refundAmount < calculatedRefundAmount) {
                    console.log(`⚠️ Partial refund created: ${refund.id}, Amount: £${refundAmount} (calculated: £${calculatedRefundAmount}, available: £${availableForRefund})`);
                  } else {
                    console.log(`✅ Refund created successfully: ${refund.id}, Amount: £${refundAmount}`);
                  }
                } else {
                  console.log('Refund amount is 0 or negative, skipping refund');
                }
              } else {
                console.warn('Period duration too short, skipping refund calculation:', {
                  periodDuration,
                  periodDurationSeconds: periodDuration,
                });
              }
            } else {
              console.error('Invalid period values:', { 
                periodStart, 
                periodEnd,
              });
            }
          } else {
            console.warn('Could not find payment intent for invoice:', invoiceToUse.id);
          }
        } else {
          console.warn('No paid invoice found for subscription');
        }
      } catch (refundError: any) {
        console.error('❌ Error creating refund for downgrade:', {
          error: refundError.message,
          type: refundError.type,
          code: refundError.code,
          stack: refundError.stack,
        });
        // Don't fail the subscription update if refund fails, but log it
      }
    }

    // Update the subscription to the new plan
    // Stripe will automatically prorate the difference
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', // Immediately charge/credit the prorated amount
      metadata: {
        businessId: businessId,
        planName: selectedPlan.name,
      },
    });

    // Get current period end from the subscription
    const currentPeriodEnd = (updatedSubscription as any).current_period_end 
      ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
      : null;

    // Create appropriate message based on upgrade/downgrade
    let message: string;
    if (isUpgrade) {
      message = `Successfully upgraded to ${selectedPlan.name} plan. Access is immediate. You've been charged the prorated difference.`;
    } else if (isDowngrade) {
      if (refundId && refundAmount > 0) {
        message = `Successfully downgraded to ${selectedPlan.name} plan. Access is immediate. A refund of £${refundAmount.toFixed(2)} for the unused portion of your previous plan has been processed and will appear in your account within 5-10 business days.`;
      } else {
        message = `Successfully downgraded to ${selectedPlan.name} plan. Access is immediate. A credit for the unused portion of your previous plan has been applied to your account and will be used on your next invoice.`;
      }
    } else {
      message = `Successfully changed to ${selectedPlan.name} plan. Access is immediate.`;
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        plan: selectedPlan.name,
        currentPeriodEnd: currentPeriodEnd,
      },
      message: message,
      isUpgrade: isUpgrade,
      isDowngrade: isDowngrade,
      refund: refundId ? {
        id: refundId,
        amount: refundAmount,
      } : null,
    });

  } catch (error: any) {
    console.error('Error updating subscription:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update subscription',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

