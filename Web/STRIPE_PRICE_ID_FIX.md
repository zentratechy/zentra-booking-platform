# 🔧 Stripe Price ID Fix Guide

## 🚨 **Issue Identified**

The subscription system is failing because the price IDs in your `.env.local` file don't exist in your Stripe account.

**Error**: `No such price: 'price_1SLU3JRaDTxyaF11KSCZDLfJ'`

## 🔍 **How to Fix This**

### **Step 1: Check Your Stripe Dashboard**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **All Products**
3. Look for products named:
   - Zentra Starter
   - Zentra Professional  
   - Zentra Business

### **Step 2: Get the Correct Price IDs**

1. Click on each product
2. Look for the **Pricing** section
3. Copy the **Price ID** (starts with `price_`)
4. It should look like: `price_1ABC123DEF456GHI789`

### **Step 3: Update Your Environment Variables**

Replace the price IDs in your `.env.local` file:

```bash
# Current (incorrect) values:
STRIPE_STARTER_PRICE_ID=price_1SLU3JRaDTxyaF11KSCZDLfJ
STRIPE_PROFESSIONAL_PRICE_ID=price_1SLU5iRaDTxyaF11p0GP9Ki0
STRIPE_BUSINESS_PRICE_ID=price_1SLU6zRaDTxyaF111Y5Uph5i

# Replace with your actual price IDs from Stripe Dashboard
STRIPE_STARTER_PRICE_ID=price_YOUR_ACTUAL_STARTER_PRICE_ID
STRIPE_PROFESSIONAL_PRICE_ID=price_YOUR_ACTUAL_PROFESSIONAL_PRICE_ID
STRIPE_BUSINESS_PRICE_ID=price_YOUR_ACTUAL_BUSINESS_PRICE_ID
```

### **Step 4: Create Products if They Don't Exist**

If you don't see the products in your Stripe Dashboard:

#### **Create Starter Plan**
1. Click **Add Product**
2. **Name**: Zentra Starter
3. **Description**: Perfect for small businesses getting started
4. **Pricing**: 
   - Amount: $29
   - Billing period: Monthly
   - Currency: USD
5. Click **Save Product**
6. Copy the **Price ID**

#### **Create Professional Plan**
1. Click **Add Product**
2. **Name**: Zentra Professional
3. **Description**: Ideal for growing businesses
4. **Pricing**: 
   - Amount: $79
   - Billing period: Monthly
   - Currency: USD
5. Click **Save Product**
6. Copy the **Price ID**

#### **Create Business Plan**
1. Click **Add Product**
2. **Name**: Zentra Business
3. **Description**: For established businesses with multiple locations
4. **Pricing**: 
   - Amount: $149
   - Billing period: Monthly
   - Currency: USD
5. Click **Save Product**
6. Copy the **Price ID**

### **Step 5: Test the Fix**

1. Update your `.env.local` with the correct price IDs
2. Restart your development server
3. Go to: http://localhost:3000/dashboard/subscription
4. Try selecting a plan

## 🧪 **Test Your Setup**

Run this command to test if your price IDs are correct:

```bash
curl -X POST "http://localhost:3000/api/subscriptions/create" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"test123","planId":"starter"}'
```

**Expected Success Response:**
```json
{
  "subscriptionId": "sub_...",
  "clientSecret": "pi_...",
  "plan": {
    "name": "Starter",
    "price": 29
  }
}
```

**If Still Getting Errors:**
- Double-check the price IDs are correct
- Make sure you're using the right Stripe account (test vs live)
- Verify the products are set to "Active" in Stripe

## 🎯 **Quick Fix Commands**

If you want to quickly test with placeholder values, you can temporarily use:

```bash
# Add these to your .env.local for testing
STRIPE_STARTER_PRICE_ID=price_test_starter
STRIPE_PROFESSIONAL_PRICE_ID=price_test_professional  
STRIPE_BUSINESS_PRICE_ID=price_test_business
```

But you'll need real price IDs from Stripe for the subscription system to work properly.

## ✅ **Once Fixed**

Your subscription system will be fully functional and users will be able to:
- View subscription plans
- Select and purchase subscriptions
- Complete Stripe Checkout
- Manage their subscriptions

The error will be resolved and the subscription flow will work end-to-end! 🎉








