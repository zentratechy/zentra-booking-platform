# 🔷 Stripe Connect Setup Guide for Zentra Platform

This guide will help you set up Stripe Connect so that **payments go directly to each business's Stripe account** (not through your platform account).

## 🎯 How Zentra Payments Work

```
Client Books Appointment → Pays $100
         ↓
Payment goes DIRECTLY to Business's Stripe Account
         ↓
Business receives $97.10 ($100 - 2.9% - $0.30 Stripe fees)
         ↓
Zentra receives $0 from booking payments
         ↓
Zentra only charges monthly subscription ($29-$149/month)
```

**Key Point:** Each business connects their own Stripe account. Payments flow directly to them. Zentra does NOT take a cut of booking revenue.

---

## ⚡ Step-by-Step Setup (10 minutes)

### **Step 1: Create Stripe Account (If New)**

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification
3. You'll use this account for:
   - Managing Zentra's subscription billing
   - Stripe Connect platform features
   - **NOT for receiving business payments** (those go to businesses)

### **Step 2: Enable Stripe Connect**

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **"Connect"** in the left sidebar
3. If you see "Get started", click it
4. Choose: **"Platform or marketplace"**
5. Fill in the form:
   - **Platform name:** Zentra (or Zentra Booking Platform)
   - **Website:** https://zentrabooking.com
   - **Description:** Booking platform for beauty and wellness businesses
   - **Support email:** your support email
6. Click **"Submit"**

### **Step 3: Get Your Connect Client ID**

After enabling Connect, find your Client ID using one of these methods:

**Method 1: Direct URL (Easiest) ⭐**
1. Go directly to: **https://dashboard.stripe.com/settings/applications**
2. You should see your Connect application listed
3. Find **"Client ID"** (starts with `ca_`)
4. Copy this value (it looks like: `ca_1234567890abcdef`)

**Method 2: From Connect Settings**
1. In Stripe Dashboard, click **"Connect"** in the left sidebar
2. Click **"Settings"** (usually at the top of the Connect page)
3. Look for a section called **"Integration"**, **"OAuth"**, or **"Client ID"**
4. Find the value starting with `ca_` - this is your Client ID
5. Copy this value

**Method 3: From Developers → OAuth**
1. Go to **"Developers"** in the left sidebar
2. Click **"OAuth"** 
3. You should see your Connect application listed
4. Find **"Client ID"** (starts with `ca_`)
5. Copy this value

**Method 4: From API Keys Page**
1. Go to **"Developers"** → **"API keys"**
2. Scroll down to find a **"Connect"** section
3. Find **"Client ID"** (starts with `ca_`)
4. Copy this value

**Still can't find it?**
- Make sure you've completed Step 2 (enabled Connect)
- Try refreshing the Stripe Dashboard
- The Client ID appears after Connect is fully activated

### **Step 4: Configure OAuth Redirect URI**

You need to tell Stripe where to redirect users after they authorize Zentra.

**Method 1: Direct URL (Easiest) ⭐**
1. Go to: **https://dashboard.stripe.com/settings/applications**
2. Find your Connect application
3. Look for **"Redirect URIs"** or **"Redirect URLs"** section
4. Click **"Add redirect URI"** or **"Add URI"**
5. Add: `https://zentrabooking.com/api/stripe/oauth`
6. **For local development:** Also add `http://localhost:3000/api/stripe/oauth`
7. Click **"Add"** or **"Save"**

**Method 2: From Connect Settings**
1. Go to **"Connect"** → **"Settings"**
2. Look for **"Redirect URIs"** or **"Redirect URLs"** section
3. Click **"Add redirect URI"**
4. Add: `https://zentrabooking.com/api/stripe/oauth`
5. Add: `http://localhost:3000/api/stripe/oauth` (for development)
6. Click **"Save"**

**Important:** The redirect URI must match exactly what's in your code (including `https://` and the full path `/api/stripe/oauth`)

### **Step 5: Get Your API Keys**

1. Go to **Developers** → **API keys** in Stripe Dashboard
   - Direct link: https://dashboard.stripe.com/apikeys
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
     - This is visible by default
     - Copy this value
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
     - Click **"Reveal test key"** or **"Reveal live key"** to see it
     - Copy this value (keep it secret!)

**Important:** 
- Use **test mode** keys for development/testing (`pk_test_...` and `sk_test_...`)
- Use **live mode** keys for production (`pk_live_...` and `sk_live_...`)
- Toggle between test/live mode using the toggle switch at the top of the API keys page

### **Step 6: Get Your Webhook Secret (Optional)**

**Note:** Webhook secret is only needed if you're using Stripe webhooks. You can skip this for now and add it later if needed.

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
   - Direct link: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"** (if you don't have one yet)
3. Enter your webhook URL: `https://zentrabooking.com/api/stripe/webhook`
4. Select events you want to listen to (e.g., `payment_intent.succeeded`)
5. Click **"Add endpoint"**
6. After creating, click on the webhook endpoint
7. Find **"Signing secret"** (starts with `whsec_`)
8. Click **"Reveal"** and copy the value

**For local testing:** Use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
This will give you a test webhook secret starting with `whsec_`

### **Step 7: Add Environment Variables**

Add these to your **Vercel environment variables** (Settings → Environment Variables):

**Required Variables:**
```env
# Stripe API Keys (from Step 5)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Stripe Connect Client ID (from Step 3 - REQUIRED for OAuth)
NEXT_PUBLIC_STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxx
```

**Optional (only if using webhooks):**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**For Testing/Sandbox (use test mode keys):**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxx  # From test mode Connect
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Optional, from test webhook endpoint
```

**Where to find each key:**
- **Publishable Key** (`pk_...`): Developers → API keys → Publishable key (visible by default)
- **Secret Key** (`sk_...`): Developers → API keys → Secret key (click "Reveal")
- **Client ID** (`ca_...`): https://dashboard.stripe.com/settings/applications → Client ID
- **Webhook Secret** (`whsec_...`): Developers → Webhooks → Your endpoint → Signing secret (optional)

**Important:** 
- Make sure Client ID and Secret Key are from the **same Stripe account**
- Make sure they're both from the **same mode** (both test OR both live)
- The Client ID should start with `ca_`
- The Secret Key should start with `sk_test_` (test) or `sk_live_` (live)
- Webhook secret is **optional** - only add if you're using webhooks

### **Step 7: Deploy and Test**

1. Deploy your application with the new environment variables
2. Go to Settings → Payments
3. Click "Connect Stripe"
4. You should be redirected to Stripe OAuth
5. Complete the connection flow

---

## ✅ How Payments Flow (Technical Details)

### **When a Client Pays:**

1. **Payment Intent Created:**
   ```javascript
   stripe.paymentIntents.create({
     amount: 10000, // $100.00 in cents
     currency: 'usd',
     transfer_data: {
       destination: 'acct_xxxxx' // Business's connected account ID
     }
   })
   ```

2. **Payment Processed:**
   - Client enters card details
   - Stripe processes payment
   - **Funds go directly to business's account** (via `transfer_data.destination`)
   - Platform account never receives the funds

3. **Business Receives:**
   - Full payment amount minus Stripe fees (2.9% + $0.30)
   - Funds appear in their Stripe Dashboard
   - They can transfer to their bank account

### **Zentra Revenue Model:**

- ✅ Monthly subscription fees (handled separately via Stripe Billing)
- ✅ No transaction fees on bookings
- ✅ Businesses keep 100% of booking revenue (minus Stripe's standard fees)

---

## 🔍 Verify Setup is Correct

### **Check 1: Connect is Enabled**
- Go to Stripe Dashboard → Connect
- Should see "Platform or marketplace" status
- Should see your platform name

### **Check 2: Client ID is Set**
- Verify `NEXT_PUBLIC_STRIPE_CLIENT_ID` is in environment variables
- Should start with `ca_`

### **Check 3: Redirect URI is Configured**
- In Connect → Settings (or Developers → OAuth)
- Should see `https://zentrabooking.com/api/stripe/oauth` in redirect URIs/URLs

### **Check 4: Test Connection**
1. Go to Zentra Settings → Payments
2. Click "Connect Stripe"
3. Should redirect to Stripe OAuth
4. After connecting, should return to Zentra
5. Should show "Connected" status

---

## 🧪 Testing

### **Test Mode:**
1. Use test API keys (`pk_test_` and `sk_test_`)
2. Use test Connect Client ID (from test mode Connect settings)
3. Test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### **Verify Payments Go to Business:**
1. Connect a test business account
2. Process a test payment
3. Check Stripe Dashboard → Connect → Accounts
4. Select the connected account
5. Verify payment appears in **their account**, not yours

---

## 📊 What Gets Stored

When a business connects Stripe:

```javascript
businesses/{businessId}
{
  paymentProvider: 'stripe',
  paymentConfig: {
    stripe: {
      accountId: 'acct_1234567890', // Their Stripe account ID
      connected: true,
      connectedAt: '2025-01-15T10:30:00Z'
    }
  }
}
```

---

## 🚨 Common Issues

### **"Stripe OAuth is not configured"**
- **Fix:** Add `NEXT_PUBLIC_STRIPE_CLIENT_ID` to environment variables
- **Get it from:** 
  - https://dashboard.stripe.com/settings/applications (easiest), OR
  - Connect → Settings → Client ID, OR
  - Developers → OAuth → Client ID
- **Make sure:** You've enabled Stripe Connect first (Step 2)

### **"Authorization code provided does not belong to you" or "client_id_mismatch"**
- **Fix:** Your Client ID and Secret Key don't match
- **Check:**
  1. Both are from the same Stripe account
  2. Both are from the same mode (test or live)
  3. Client ID starts with `ca_`
  4. Secret Key starts with `sk_test_` (test) or `sk_live_` (live)
- **Solution:** Get both from the same Stripe Dashboard account and mode

### **"Redirect URI mismatch"**
- **Fix:** Add exact redirect URI to Stripe Connect settings
- **Where to add:** 
  - Connect → Settings → Redirect URIs, OR
  - Developers → OAuth → Redirect URIs, OR
  - https://dashboard.stripe.com/settings/applications
- **Must match:** `https://zentrabooking.com/api/stripe/oauth` (or your domain)

### **"Stripe Connect is not enabled"**
- **Fix:** Enable Connect in Stripe Dashboard → Connect → Get started
- **Choose:** "Platform or marketplace"

### **Payments going to wrong account**
- **Check:** Payment intent uses `transfer_data.destination`
- **Verify:** Connected account ID is correct in business data

---

## 🎉 You're All Set!

Once configured:
- ✅ Businesses can connect their Stripe accounts
- ✅ Payments flow directly to businesses
- ✅ Zentra only charges subscriptions
- ✅ No transaction fees on bookings

**Next:** Test the connection flow and verify payments go to the correct accounts!

---

## 📞 Need Help?

- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Support:** Excellent email support available
