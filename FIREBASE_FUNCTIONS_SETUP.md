# 🔥 Firebase Functions - Daily Reminders Setup

## ✨ Overview

The daily appointment reminders are now implemented using **Firebase Cloud Functions** with scheduled execution. This means:

- ✅ Runs automatically every day at 6:00 PM UTC
- ✅ Works with any hosting (not just Vercel)
- ✅ Integrated with your Firebase project
- ✅ Reliable and scalable
- ✅ Free tier: 2 million invocations/month

---

## 🚀 Quick Setup (First Time)

### **1. Install Firebase CLI**

```bash
npm install -g firebase-tools
```

### **2. Login to Firebase**

```bash
firebase login
```

### **3. Initialize Firebase Functions** (if not already done)

```bash
cd "/Users/jamesclark/Library/Mobile Documents/com~apple~CloudDocs/Projects/Projects 2025/Zentra/Web"
firebase init functions
```

**When prompted:**
- Choose: **Use an existing project**
- Select your Firebase project
- Language: **TypeScript** (already set up)
- ESLint: **No** (optional)
- Install dependencies: **Yes**

### **4. Install Function Dependencies**

```bash
cd functions
npm install
```

### **5. Set Environment Variables**

Firebase Functions need the Resend API key:

```bash
firebase functions:config:set resend.api_key="re_GqmqyFqW_DkDhvgLYEagBXZ5YPSXDPkHc"
```

### **6. Deploy the Function**

```bash
firebase deploy --only functions
```

---

## 📋 What Was Created

### **File Structure:**

```
Web/
├── functions/
│   ├── src/
│   │   └── index.ts          # Scheduled function for daily reminders
│   ├── package.json          # Function dependencies
│   ├── tsconfig.json         # TypeScript config
│   └── .gitignore            # Ignore node_modules and lib
├── firebase.json             # Firebase configuration
└── FIREBASE_FUNCTIONS_SETUP.md  # This file
```

### **The Scheduled Function:**

```typescript
export const sendDailyReminders = functions.pubsub
  .schedule('0 * * * *')  // Every hour at minute 0
  .timeZone('UTC')
  .onRun(async (context) => {
    // 1. Get current UTC time
    // 2. Find all businesses with reminders enabled
    // 3. For each business, check if current hour matches their send time
    // 4. If match: get tomorrow's appointments and send email
  });
```

---

## ⚙️ How It Works

### **Hourly Execution Flow:**

```
Every hour at minute 0 (UTC):
  ↓
Firebase Cloud Scheduler triggers sendDailyReminders()
  ↓
Function gets current UTC time (e.g., 14:00, 15:00, 16:00...)
  ↓
Function fetches all businesses with dailyReminders.enabled = true
  ↓
For each business:
  - Check if current hour matches business.dailyReminders.sendTime
  - If match: Get tomorrow's appointments from Firestore
  - Generate beautiful HTML email
  - Send via Resend to business owner/staff
  - If no match: Skip this business
  ↓
Done! ✅
```

### **Email Contains:**
- 📅 Tomorrow's date
- 📊 Total appointments count
- 💰 Expected revenue
- 📝 Table with: Time | Client | Service | Staff | Price
- 🎨 Your brand colors (spa theme)

---

## 🧪 Testing

### **Option 1: Use Test Button in Settings**
1. Go to **Settings** → **General**
2. Enable "Daily Appointment Reminders"
3. Click **"Send Test Reminder Now"**
4. Check your email!

This uses the `/api/test/send-reminders` endpoint (still works on localhost).

### **Option 2: Test Firebase Function Locally**

```bash
# Start Firebase emulator
cd functions
npm run serve

# The function will show in emulator UI
# Visit: http://localhost:4000
```

### **Option 3: Manually Trigger in Firebase Console**

After deployment:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Functions**
3. Find `sendDailyReminders`
4. Click **"Test function"** (runs immediately)

---

## 🔧 Configuration

### **Per-Business Send Times:**

Each business can set their own send time in Settings:

1. **Go to Settings → General → Daily Appointment Reminders**
2. **Select "Send Time (Hour)"** from the dropdown (e.g., 9:00 PM, 9:00 AM, 6:00 PM)
3. **The function runs every hour** and only sends to businesses whose send time matches the current hour

**Examples:**
- Business A selects "9:00 AM" → Gets reminders at 9 AM UTC
- Business B selects "6:00 PM" → Gets reminders at 6 PM UTC  
- Business C selects "9:00 PM" → Gets reminders at 9 PM UTC

**Note:** 
- Times are in 24-hour format and run on UTC
- Only hour selection is available (no minutes) - reminders send at the top of each hour
- **For local time zones:** If you want 6 PM local time, calculate the UTC equivalent:
  - 6 PM EST (US East) = 23:00 UTC (winter) or 22:00 UTC (summer)
  - 6 PM GMT (UK) = 18:00 UTC
  - 6 PM PST (US West) = 02:00 UTC (next day)

### **Change Timezone:**

```typescript
.timeZone('America/New_York')  // Eastern Time
.timeZone('Europe/London')     // UK Time
.timeZone('America/Los_Angeles') // Pacific Time
```

---

## 💰 Pricing

### **Firebase Functions Free Tier:**
- ✅ **2,000,000 invocations/month** (your function runs once per day)
- ✅ **400,000 GB-seconds/month**
- ✅ **200,000 CPU-seconds/month**
- ✅ **5 GB network egress/month**

**For this use case:** Completely free! Even with 1000 businesses, that's only 30,000 invocations/month.

### **Resend Free Tier:**
- ✅ **100 emails/day**
- ✅ **3,000 emails/month**

---

## 🚀 Deployment Steps

### **Initial Deployment:**

```bash
# 1. Build the functions
cd functions
npm run build

# 2. Deploy to Firebase
firebase deploy --only functions
```

### **Update After Changes:**

```bash
cd functions
npm run build
firebase deploy --only functions:sendDailyReminders
```

---

## 📊 Monitoring

### **View Logs:**

```bash
# Real-time logs
firebase functions:log --only sendDailyReminders

# Or in Firebase Console
# Functions → sendDailyReminders → Logs
```

### **Check Execution:**

In Firebase Console:
1. Go to **Functions** section
2. Click **sendDailyReminders**
3. View **Metrics** tab (shows execution count, errors, duration)

---

## 🔐 Security & Environment Variables

### **Set Environment Variables:**

```bash
# Resend API Key
firebase functions:config:set resend.api_key="your-api-key-here"

# Optional: Add other secrets
firebase functions:config:set app.url="https://zentrabooking.com"
```

### **Access in Code:**

```typescript
const resendApiKey = functions.config().resend.api_key;
```

### **View Current Config:**

```bash
firebase functions:config:get
```

---

## 🆘 Troubleshooting

### **Function not deploying?**
```bash
# Check Firebase CLI version
firebase --version

# Update if needed
npm install -g firebase-tools@latest

# Re-initialize
cd functions
npm install
npm run build
```

### **Function not running on schedule?**
1. Check Firebase Console → Functions → sendDailyReminders
2. Verify the schedule in the UI
3. Check logs for errors
4. Ensure Cloud Scheduler is enabled (it's automatic)

### **Emails not sending?**
1. Verify `RESEND_API_KEY` is set: `firebase functions:config:get`
2. Check Resend dashboard for delivery status
3. Check function logs for errors
4. Verify businesses have `dailyReminders.enabled = true`

### **Testing locally?**
Use the **"Send Test Reminder Now"** button in Settings - it works on localhost without deploying!

---

## 📝 Next Steps

### **After First Deployment:**

1. ✅ **Enable in Settings:**
   - Go to Dashboard → Settings → General
   - Toggle "Send Tomorrow's Appointments" ON
   - Click "Send Test Reminder Now" to verify

2. ✅ **Create Test Appointment:**
   - Create an appointment for tomorrow
   - Wait until 6 PM UTC (or manually trigger)
   - Check your email!

3. ✅ **Monitor:**
   - Check Firebase Console → Functions for execution logs
   - Verify emails are being delivered

---

## 🎯 Benefits of Firebase Functions vs Vercel Cron

| Feature | Firebase Functions | Vercel Cron |
|---------|-------------------|-------------|
| **Hosting Independence** | ✅ Works anywhere | ❌ Only on Vercel |
| **Firebase Integration** | ✅ Native | ⚠️ Requires API calls |
| **Free Tier** | ✅ 2M invocations | ✅ Included |
| **Monitoring** | ✅ Firebase Console | ✅ Vercel Dashboard |
| **Logs** | ✅ Cloud Logging | ✅ Vercel Logs |
| **Local Testing** | ✅ Emulator | ❌ Need workarounds |
| **Setup Complexity** | ⚠️ Moderate | ✅ Very simple |

---

## ✅ You're Ready!

The Firebase Function is configured and ready to deploy. 

**To activate:**
```bash
cd "/Users/jamesclark/Library/Mobile Documents/com~apple~CloudDocs/Projects/Projects 2025/Zentra/Web/functions"
npm install
npm run build
firebase deploy --only functions
```

Once deployed, it will automatically run every day at 6:00 PM UTC! 🎉

**Questions?** The test button in Settings works right now for immediate testing!

