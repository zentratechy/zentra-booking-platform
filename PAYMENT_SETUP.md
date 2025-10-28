# 💳 Payment Setup Guide - Stripe & Square

Zentra supports **both Stripe and Square** for payment processing. Businesses choose which one to use and connect their own account.

## 🎯 How Zentra Payments Work

### **Business Model: Subscription-Based (Like Timely)**

```
┌─────────────────────────────────────────────┐
│  Client Books Appointment                   │
│         ↓                                   │
│  Payment → Business's Stripe/Square Account │
│         ↓                                   │
│  Business keeps 100% (minus processor fees) │
│         ↓                                   │
│  Zentra charges monthly subscription only   │
└─────────────────────────────────────────────┘
```

### **Revenue Streams for Zentra:**
- ✅ Monthly subscription: $29-$149/month per business
- ✅ No transaction fees
- ✅ Businesses keep 100% of their booking revenue
- ✅ Clean, transparent pricing

---

## 🔥 Setup for Zentra (Your Platform Account)

### **Step 1: Create Zentra's Stripe Account** (For subscriptions)

1. Go to [stripe.com](https://stripe.com)
2. Sign up for account
3. Complete verification
4. Go to **Developers** → **API Keys**
5. Copy your keys:
   - Publishable key: `pk_test_...` (for frontend)
   - Secret key: `sk_test_...` (for backend)

### **Step 2: Enable Stripe Connect** (For business connections)

1. In Stripe Dashboard, go to **Connect** → **Settings**
2. Click "Get started with Connect"
3. Choose **Platform or marketplace**
4. Complete the Connect setup form
5. Copy your Connect keys when ready

### **Step 3: Add to Environment Variables**

Add to `.env.local`:
```env
# Stripe (for Zentra subscriptions & Connect)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Step 4: Create Subscription Products** (In Stripe Dashboard)

Create these products for your pricing tiers:

1. **Starter Plan**: $29/month
   - 1 location
   - 2 staff members
   - Basic features

2. **Professional Plan**: $79/month  
   - 1 location
   - 10 staff members
   - All features

3. **Business Plan**: $149/month
   - 3 locations
   - Unlimited staff
   - Premium features

Copy the Price IDs - you'll need them!

---

## 🔷 For Businesses Using Stripe

### **What Happens:**

1. **Business chooses Stripe** during onboarding
2. **Click "Connect Stripe"** button
3. **OAuth redirect** to Stripe Connect onboarding
4. **Stripe verifies** their identity & bank account
5. **Connected!** They can now accept payments
6. **Payments flow** directly to their Stripe account

### **What They Need:**
- Existing Stripe account OR
- Create one during Connect flow (Stripe handles this)

### **Stripe Connect Types:**

We use **Standard Accounts**:
- ✅ Business has full Stripe Dashboard access
- ✅ They manage their own payouts
- ✅ They see all transactions
- ✅ Most transparent approach

---

## 🟦 For Businesses Using Square

### **What Happens:**

1. **Business chooses Square** during onboarding
2. **Click "Connect Square"** button
3. **OAuth redirect** to Square authorization
4. **Square connects** their account
5. **Connected!** They can accept payments
6. **Payments flow** directly to their Square account

### **What They Need:**
- Existing Square account (most salons already have this!)
- Square merchant ID
- Location ID

### **Square Integration Features:**
- Online payments (2.9% + $0.30)
- In-person payments (2.6% + $0.10) if they have readers
- Syncs with their existing Square POS
- Unified reporting in Square Dashboard

---

## 💻 Technical Implementation

### **Database Structure:**

```javascript
businesses/{businessId}
{
  ...businessData,
  
  // Payment provider config
  paymentConfig: {
    provider: 'stripe' | 'square' | 'none',
    
    // If using Stripe
    stripe: {
      accountId: 'acct_xyz123',
      connected: true,
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true
    },
    
    // If using Square
    square: {
      merchantId: 'merchant_abc',
      locationId: 'location_123',
      connected: true,
      // Access token stored securely server-side only
    }
  },
  
  // Zentra subscription (charged by Zentra's Stripe)
  subscription: {
    plan: 'professional',
    status: 'active',
    stripeCustomerId: 'cus_abc123',
    stripeSubscriptionId: 'sub_xyz789',
    currentPeriodEnd: Timestamp,
    trialEnd: Timestamp
  }
}
```

### **Payment Flow - Stripe:**

```javascript
Client books appointment
    ↓
Frontend: Create Payment Intent via API route
    ↓
API: stripe.paymentIntents.create({
  amount: 8500, // $85.00
  currency: 'usd',
  metadata: { appointmentId, businessId }
}, {
  stripeAccount: business.paymentConfig.stripe.accountId
})
    ↓
Client completes payment
    ↓
Webhook: payment_intent.succeeded
    ↓
Update appointment status
    ↓
Send confirmation email
```

### **Payment Flow - Square:**

```javascript
Client books appointment
    ↓
Frontend: Initialize Square Web SDK
    ↓
Client enters card details
    ↓
API: Square Payments API (server-side)
    ↓
Payment processed in business's Square account
    ↓
Webhook: payment.updated
    ↓
Update appointment status
```

---

## 🔐 Security Considerations

### **Never Store:**
- ❌ Full credit card numbers
- ❌ CVV codes
- ❌ Unencrypted access tokens

### **Always:**
- ✅ Use Stripe/Square tokenization
- ✅ Store only payment method IDs
- ✅ Keep access tokens server-side only
- ✅ Use HTTPS everywhere
- ✅ Implement webhook signature verification

---

## 🧪 Testing

### **Stripe Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Auth Required: 4000 0025 0000 3155
```

### **Square Test Mode:**
- Use Square Sandbox environment
- Test cards provided in Square Dashboard
- No real money processed

---

## 📋 Business Onboarding Checklist

When a business signs up:

**Zentra Side:**
- [ ] Create business in Firestore
- [ ] Create Stripe Customer (for their subscription)
- [ ] Start 14-day trial
- [ ] Let them choose payment provider

**If Stripe:**
- [ ] Create Stripe Connect Account
- [ ] Generate Account Link
- [ ] Business completes Stripe onboarding
- [ ] Verify account status
- [ ] Save account ID

**If Square:**
- [ ] Redirect to Square OAuth
- [ ] Receive OAuth token
- [ ] Store merchant & location IDs
- [ ] Verify connection

**After Trial:**
- [ ] Subscribe to chosen plan
- [ ] Start charging monthly subscription

---

## 💰 Pricing Tiers

### **Starter: $29/month**
- 1 location
- 2 staff members
- 50 appointments/month
- Basic features
- Email support

### **Professional: $79/month**
- 1 location  
- 10 staff members
- Unlimited appointments
- All features
- Priority support

### **Business: $149/month**
- 3 locations
- Unlimited staff
- Unlimited appointments
- Advanced analytics
- Dedicated support
- White-label option

---

## 🚀 Next Steps

### **To Complete Integration:**

1. **Get Your Stripe Account**
   - Sign up at stripe.com
   - Get API keys
   - Enable Stripe Connect
   - Add keys to `.env.local`

2. **Optional: Get Square Developer Account**
   - Sign up at developer.squareup.com
   - Create application
   - Get OAuth credentials
   - Add to `.env.local`

3. **Create API Routes** (I'll build these)
   - `/api/stripe/create-connect-account`
   - `/api/stripe/account-link`
   - `/api/stripe/create-payment-intent`
   - `/api/stripe/webhooks`
   - `/api/square/authorize`
   - `/api/square/create-payment`
   - `/api/subscriptions/create`

4. **Test Full Flow**
   - Business connects Stripe/Square
   - Create test booking
   - Process test payment
   - Verify funds go to business account

---

## 📊 Business Dashboard Features

Once connected, businesses can:

- ✅ View all transactions
- ✅ See payment status per appointment
- ✅ Issue refunds
- ✅ Track deposits vs. full payments
- ✅ Export transaction history
- ✅ Manage saved payment methods
- ✅ View payout schedule

---

## ⚡ Quick Summary

**Your Setup:**
1. One Stripe account (for Zentra subscriptions)
2. Enable Stripe Connect
3. Optional: Square developer account

**Business Setup:**
1. Choose Stripe or Square during onboarding
2. Connect their existing account (or create new)
3. Start accepting payments immediately

**Client Experience:**
1. Book appointment
2. Choose deposit or full payment
3. Secure checkout (Stripe or Square)
4. Instant confirmation

**Revenue Model:**
- Monthly subscriptions ($29-$149/mo)
- 14-day free trial
- No transaction fees
- Clean, predictable income

---

Ready to integrate! Just get your Stripe account set up and send me the keys! 🎉


