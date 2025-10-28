# 💳 Subscription System Setup Guide

## 🚀 Setting Up Stripe Subscriptions

### 1. Create Stripe Products and Prices

1. **Go to Stripe Dashboard**: [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Navigate to Products**: Products → Add Product
3. **Create 3 Products**:

#### **Starter Plan**
- **Name**: Zentra Starter
- **Description**: Perfect for small businesses getting started
- **Pricing**: $29/month (recurring)
- **Note the Price ID** (starts with `price_`)

#### **Professional Plan**
- **Name**: Zentra Professional  
- **Description**: Ideal for growing businesses
- **Pricing**: $79/month (recurring)
- **Note the Price ID** (starts with `price_`)

#### **Business Plan**
- **Name**: Zentra Business
- **Description**: For established businesses with multiple locations
- **Pricing**: $149/month (recurring)
- **Note the Price ID** (starts with `price_`)

### 2. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Subscription Price IDs
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxx
STRIPE_BUSINESS_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxx
```

### 3. Test Your Setup

1. **Start your development server**: `npm run dev`
2. **Go to subscription page**: `http://localhost:3000/dashboard/subscription`
3. **Test the flow**: Try selecting a plan and going through checkout

## 🎯 Subscription Features

### **Plan Limits & Features**

#### **Starter Plan ($29/month)**
- ✅ Up to 2 staff members
- ✅ Up to 50 clients  
- ✅ Basic appointment management
- ✅ Email notifications
- ✅ Basic reporting
- ✅ Mobile responsive booking

#### **Professional Plan ($79/month)**
- ✅ Up to 10 staff members
- ✅ Unlimited clients
- ✅ Advanced calendar features
- ✅ SMS notifications
- ✅ Loyalty program
- ✅ Advanced reporting
- ✅ Digital consultations
- ✅ Multi-service bookings
- ✅ Buffer time management

#### **Business Plan ($149/month)**
- ✅ Unlimited staff members
- ✅ Unlimited clients
- ✅ All Professional features
- ✅ Multi-location support
- ✅ API access
- ✅ Priority support
- ✅ Custom integrations
- ✅ Advanced analytics
- ✅ White-label options

## 🔧 Implementation Details

### **API Endpoints Created**

1. **`/api/subscriptions/plans`** - Get available subscription plans
2. **`/api/subscriptions/create`** - Create new subscription
3. **`/api/subscriptions/current`** - Get current subscription status
4. **`/api/subscriptions/cancel`** - Cancel subscription

### **Components Created**

1. **`SubscriptionGuard`** - Protect features based on subscription
2. **`StaffLimitGuard`** - Enforce staff limits
3. **`ClientLimitGuard`** - Enforce client limits
4. **`useSubscription` hook** - Manage subscription state

### **Pages Created**

1. **`/dashboard/subscription`** - Subscription management page
2. **Added to sidebar** - Easy access to subscription settings

## 🛡️ Feature Protection

### **How to Protect Features**

```tsx
import SubscriptionGuard from '@/components/SubscriptionGuard';

// Protect a feature
<SubscriptionGuard feature="sms_notifications">
  <SMSNotificationSettings />
</SubscriptionGuard>

// Protect with custom fallback
<SubscriptionGuard 
  feature="loyalty_program" 
  fallback={<div>Loyalty program coming soon!</div>}
>
  <LoyaltyProgram />
</SubscriptionGuard>
```

### **Check Limits**

```tsx
import { useSubscription } from '@/hooks/useSubscription';

function StaffManagement() {
  const { checkLimit, checkFeatureAccess } = useSubscription();
  
  // Check if user can add more staff
  const canAddStaff = checkLimit('staff', currentStaffCount);
  
  // Check if feature is available
  const hasSMS = checkFeatureAccess('sms_notifications');
}
```

## 📊 Subscription Status

### **Status Types**
- `active` - Subscription is active and paid
- `inactive` - No subscription
- `past_due` - Payment failed, needs attention
- `canceled` - Subscription cancelled
- `unpaid` - Payment required

### **Usage Tracking**
- Staff count is tracked automatically
- Client count is tracked automatically
- Feature access is checked in real-time
- Limits are enforced at the UI level

## 🔄 Subscription Lifecycle

### **New Subscription**
1. User selects plan on `/dashboard/subscription`
2. Stripe Checkout handles payment
3. Webhook confirms subscription creation
4. User gains access to plan features

### **Upgrade/Downgrade**
1. User selects new plan
2. Stripe prorates billing
3. Features update immediately
4. Limits adjust to new plan

### **Cancellation**
1. User cancels on subscription page
2. Access continues until period end
3. Features become restricted
4. Data is preserved

## 🚨 Important Notes

### **Development vs Production**
- **Development**: Uses Stripe test mode
- **Production**: Requires live Stripe keys
- **Webhooks**: Must be configured for production

### **Security**
- All subscription checks happen server-side
- Client-side checks are for UX only
- Stripe handles all payment security

### **Data Protection**
- Cancelled subscriptions preserve data
- Users can reactivate anytime
- No data loss on plan changes

## 🎉 Next Steps

1. **Set up Stripe products** (follow step 1)
2. **Add environment variables** (follow step 2)
3. **Test the subscription flow** (follow step 3)
4. **Protect premium features** using `SubscriptionGuard`
5. **Set up webhooks** for production (optional)

Your subscription system is now ready! 🚀




