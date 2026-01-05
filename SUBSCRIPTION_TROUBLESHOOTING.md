# Subscription Troubleshooting Guide

If subscriptions appear to complete but don't show up in Stripe, follow these steps:

## 1. Check Test vs Live Mode

**Important:** Make sure you're checking the correct mode in Stripe Dashboard:
- If using test cards (4242 4242 4242 4242), check **Test Mode** in Stripe Dashboard
- If using real cards, check **Live Mode** in Stripe Dashboard

The toggle is in the top right of the Stripe Dashboard.

## 2. Verify Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint: `https://www.zentrabooking.com/api/stripe/webhook`
3. Ensure these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `payment_intent.succeeded`

4. Check the webhook logs for recent events:
   - Click on your webhook endpoint
   - View "Recent events" to see if events are being received
   - Check if any events failed

## 3. Check Checkout Session Status

1. Go to Stripe Dashboard → Payments → Checkout Sessions
2. Find the session ID from your logs (or search by customer email)
3. Check:
   - **Status**: Should be "complete"
   - **Payment Status**: Should be "paid"
   - **Mode**: Should be "subscription"
   - **Subscription ID**: Should have a subscription ID (starts with `sub_`)

## 4. Verify Subscription Was Created

1. Go to Stripe Dashboard → Customers
2. Find the customer (search by email or customer ID)
3. Click on the customer
4. Check the "Subscriptions" tab
5. You should see an active subscription

## 5. Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Search for:
   - "Creating Stripe Checkout Session"
   - "Checkout Session created"
   - "Processing checkout.session.completed"
   - "Processing customer.subscription.created"
   - "Subscription created and saved to Firestore"

3. Look for any errors or warnings

## 6. Common Issues

### Issue: Checkout completes but no subscription
**Possible causes:**
- Payment failed (check payment status in checkout session)
- Webhook not receiving events (check webhook configuration)
- Test/live mode mismatch

### Issue: Subscription created but not in Firestore
**Possible causes:**
- Webhook handler failed (check Vercel logs)
- Missing `businessId` in subscription metadata
- Firestore write failed (check Vercel logs)

### Issue: Subscription in wrong Stripe account
**Possible causes:**
- Using wrong `STRIPE_SECRET_KEY` (test vs live)
- Connected account vs platform account confusion

## 7. Manual Verification

To manually check if a subscription exists:

1. Get the customer ID from Firestore (`businesses/{businessId}/stripeCustomerId`)
2. In Stripe Dashboard → Customers → Search for customer ID
3. Check the customer's subscriptions

Or use Stripe CLI:
```bash
stripe subscriptions list --customer cus_xxxxx
```

## 8. Test Subscription Creation

1. Use a test card: `4242 4242 4242 4242`
2. Any future expiry date (e.g., 12/25)
3. Any 3-digit CVC
4. Any UK postal code (e.g., SW1A 1AA)
5. Complete checkout
6. Check Stripe Dashboard in **Test Mode**
7. Verify subscription appears

## 9. Check Environment Variables

Ensure these are set correctly in Vercel:
- `STRIPE_SECRET_KEY` - Must match the mode you're testing (test or live)
- `STRIPE_WEBHOOK_SECRET` - Must match your webhook endpoint secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Must match the secret key mode

## 10. Contact Support

If none of the above resolves the issue:
1. Check Vercel logs for specific errors
2. Check Stripe Dashboard → Developers → Events for failed events
3. Share the checkout session ID and customer ID for investigation


