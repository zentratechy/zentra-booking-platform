# 🧪 Complete Testing Guide for Zentra

Test the full end-to-end booking and payment flow!

## 🎯 Complete User Journey Test

### **Part 1: Business Setup** (10 minutes)

#### **Step 1: Create Business Account**
1. Go to http://localhost:3000/signup
2. Fill in:
   - Business Name: "Luxe Beauty Spa"
   - Your Name: "Jane Smith"
   - Email: "jane@luxebeauty.com"
   - Phone: "(555) 123-4567"
   - Business Type: "Spa & Wellness"
   - Password: "password123"
3. Click "Create Account"

#### **Step 2: Complete Onboarding**
- **Step 1**: Add business address
- **Step 2**: Select services (choose 3-4)
- **Step 3**: Set business hours
- **Step 4**: Choose "Stripe" → Click "Connect Stripe"
  - Complete Stripe onboarding (use test data)
  - Return to Zentra

#### **Step 3: Add Data**
1. **Add Services** (`/dashboard/services`):
   - Hair Cut & Style - $85 (60 min)
   - Facial Treatment - $120 (90 min)  
   - Manicure - $45 (45 min)

2. **Add Staff** (`/dashboard/staff`):
   - Emma Wilson - Senior Stylist
   - Sophie Brown - Beauty Specialist

3. **Add Clients** (`/dashboard/clients`) - Optional
   - Or clients will be created during booking

---

### **Part 2: Client Booking Flow** (5 minutes)

#### **Step 1: Get Your Booking Link**
1. Go to **Dashboard** (http://localhost:3000/dashboard)
2. See "Your Booking Page" section at top
3. Click **"Copy"** to copy your link
4. It will look like: `http://localhost:3000/book/YOUR_USER_ID`

#### **Step 2: Open Booking Page**
1. Open booking link in **new incognito/private window** (or just click "Preview")
2. You should see:
   - Your business name
   - List of your services

#### **Step 3: Book an Appointment**

**Select Service:**
- Choose "Hair Cut & Style - $85"
- Click on it to continue

**Select Staff:**
- Choose "Emma Wilson" or "No Preference"
- Click to continue

**Select Date & Time:**
- Pick tomorrow's date
- Choose "10:00 AM"
- Click "Continue"

**Enter Details:**
- Name: "Sarah Johnson"
- Email: "sarah@example.com"  
- Phone: "(555) 987-6543"
- Notes: "First time visit"

**Choose Payment:**
- Click "Pay Full Amount ($85)" OR
- Click "Pay Deposit" (if deposit enabled)

**Complete Payment:**
- You'll see Stripe checkout form
- Use test card: **4242 4242 4242 4242**
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)
- Click "Pay"

**Confirmation:**
- See "Booking Confirmed!" page
- Appointment is created!

---

### **Part 3: Verify in Dashboard** (2 minutes)

#### **Go Back to Business Dashboard**
1. Return to logged-in window
2. Go to **Calendar** (`/dashboard/calendar`)
3. **You should see:**
   - Your appointment on the calendar
   - Client name, service, time
   - Payment status: "✓ Paid"

4. Go to **Payments** (`/dashboard/payments`)
5. **You should see:**
   - Transaction listed
   - Amount: $85.00
   - Status: Fully Paid

6. **Check Stripe Dashboard**:
   - Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Click "Payments" in left sidebar
   - See your test payment!

---

## 💳 Stripe Test Cards

### **Success:**
```
Card: 4242 4242 4242 4242
Exp: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### **Decline:**
```
Card: 4000 0000 0000 0002
(to test error handling)
```

### **Requires Authentication:**
```
Card: 4000 0025 0000 3155
(to test 3D Secure)
```

---

## ✅ What to Test

### **Booking Flow:**
- [ ] Service selection works
- [ ] Staff selection works
- [ ] Date picker works
- [ ] Time slots selectable
- [ ] Client info form validates
- [ ] Deposit option shows (if enabled)
- [ ] Full payment option works
- [ ] Stripe form appears
- [ ] Test card processes
- [ ] Confirmation page shows
- [ ] Appointment appears in calendar
- [ ] Payment shows in payments dashboard

### **Business Dashboard:**
- [ ] Dashboard shows real business name
- [ ] Today's appointments loads
- [ ] Booking link copyable
- [ ] Staff page shows added staff
- [ ] Services page shows services
- [ ] Clients page shows clients
- [ ] Calendar shows visual indicators
- [ ] Payments page shows transactions

### **Stripe Integration:**
- [ ] Settings shows "Connected" status
- [ ] Can disconnect/reconnect Stripe
- [ ] Payment goes to business account
- [ ] Transaction appears in Stripe Dashboard

---

## 🔍 Common Issues & Solutions

### **"Business has not connected Stripe yet"**
→ Go to Settings → Payments → Connect Stripe

### **"No services available"**
→ Go to /dashboard/services → Add at least 1 service

### **Payment form doesn't appear**
→ Check browser console for errors
→ Verify Stripe keys in .env.local

### **Booking doesn't save**
→ Check Firestore security rules
→ Check browser console

### **Stripe Connect fails**
→ Make sure you enabled Connect in Stripe Dashboard
→ Go to Connect → Get started

---

## 📊 Expected Results

After completing the test flow:

### **In Firestore:**
```
appointments/
└── {appointmentId}/
    ├── businessId: "your-user-id"
    ├── clientName: "Sarah Johnson"
    ├── clientEmail: "sarah@example.com"
    ├── serviceName: "Hair Cut & Style"
    ├── staffName: "Emma Wilson"
    ├── date: Timestamp
    ├── time: "10:00 AM"
    ├── price: 85
    ├── status: "confirmed"
    └── payment:
        ├── status: "paid"
        ├── method: "card"
        └── amount: 85
```

### **In Stripe Dashboard:**
```
Payment: $85.00
Status: Succeeded
Destination: Your Connected Account
Customer: sarah@example.com
Description: Booking payment
```

### **In Zentra Dashboard:**
```
Calendar: Shows appointment on selected date
Payments: Shows $85 transaction
Clients: Sarah Johnson added (if new)
```

---

## 🎉 Success Criteria

You know it's working when:

✅ Client can complete full booking flow  
✅ Payment processes in Stripe  
✅ Appointment appears in calendar  
✅ Payment shows in payments dashboard  
✅ Business receives money in their Stripe account  
✅ Confirmation page displays  

---

## 🚀 Ready to Test!

**Your complete booking flow:**
```
Client visits booking page
    ↓
Selects service & staff
    ↓
Picks date & time
    ↓
Enters contact info
    ↓
Pays with Stripe
    ↓
Booking confirmed
    ↓
Business sees appointment
    ↓
Money in business's Stripe account
```

**Everything is connected and working!** 🎊

Start testing at: http://localhost:3000/dashboard (get your booking link)

---

**Happy Testing!** 💅✨


