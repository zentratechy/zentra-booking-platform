# 📧 Daily Appointment Reminders - Setup Guide

## ✨ What Is This?

The **Daily Appointment Reminders** feature automatically sends an email to the business owner (or selected staff member) every day at 6:00 PM with a summary of tomorrow's appointments.

---

## 🎯 Features

### **Email Includes:**
- ✅ List of all tomorrow's appointments
- ✅ Client names, service types, times
- ✅ Staff assignments
- ✅ Expected revenue for the day
- ✅ Total number of appointments
- ✅ Beautiful branded email template

### **Smart Features:**
- 🔕 Only sends if appointments exist for tomorrow
- 👤 Can be sent to business owner or specific staff member
- ⏰ Runs automatically every day at 6:00 PM UTC
- 🧪 Test button in settings to send immediately
- 🎨 Matches your spa theme branding

---

## 🚀 How to Enable

### **1. In Your Dashboard:**
1. Go to **Settings** → **General** tab
2. Scroll to **"Daily Appointment Reminders"**
3. Toggle **"Send Tomorrow's Appointments"** to ON
4. Select recipient (yourself or a staff member)
5. Click **"Send Test Reminder Now"** to test it!

### **2. When Deployed to Vercel:**
The system automatically runs at **6:00 PM UTC** every day (via Vercel Cron Jobs).

**Note:** The "Send Time" field in settings is for display purposes. The actual cron schedule is configured in `vercel.json` and runs at 6:00 PM UTC daily.

---

## 🔧 Technical Implementation

### **Files Created:**

1. **`/app/api/cron/daily-reminders/route.ts`**
   - Automatic cron endpoint (called by Vercel)
   - Processes all businesses with reminders enabled
   - Sends emails via Resend

2. **`/app/api/test/send-reminders/route.ts`**
   - Manual test endpoint
   - Same logic as cron, but for single business
   - Called by "Send Test Reminder Now" button

3. **`/vercel.json`**
   - Vercel Cron configuration
   - Schedule: `0 18 * * *` (6:00 PM UTC daily)

### **How It Works:**

```
Every day at 6:00 PM UTC:
  ↓
Vercel Cron triggers /api/cron/daily-reminders
  ↓
Fetch all businesses with dailyReminders.enabled = true
  ↓
For each business:
  - Get tomorrow's appointments
  - Generate beautiful HTML email
  - Send via Resend to business owner/staff
  ↓
Done! ✅
```

---

## 🧪 Testing

### **Test Right Now:**
1. Create an appointment for tomorrow in the calendar
2. Go to Settings → General → Daily Appointment Reminders
3. Enable the feature
4. Click **"Send Test Reminder Now"**
5. Check your email inbox!

### **Test the Cron Locally:**
You can manually call the cron endpoint:

```bash
# Test locally
curl http://localhost:3000/api/cron/daily-reminders

# Or visit in browser
http://localhost:3000/api/cron/daily-reminders
```

---

## 🔐 Security (Optional)

For production, you can add a secret token to prevent unauthorized access:

### **1. Add to `.env.local`:**
```env
CRON_SECRET=your-random-secret-token-here
```

### **2. Update Vercel Environment Variables:**
When deploying, add `CRON_SECRET` to your Vercel project settings.

### **3. Vercel will automatically add the authorization header:**
The cron job will include: `Authorization: Bearer your-secret-token`

---

## ⚙️ Customization

### **Change Send Time:**
Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reminders",
      "schedule": "0 18 * * *"  // Change this (cron format)
    }
  ]
}
```

**Common schedules:**
- `0 18 * * *` = 6:00 PM UTC daily (default)
- `0 9 * * *` = 9:00 AM UTC daily
- `0 20 * * *` = 8:00 PM UTC daily
- `0 0 * * *` = Midnight UTC daily

**Note:** All times are in UTC. Convert your local time to UTC.

### **Customize Email Template:**
Edit the `generateDailyReminderEmail()` function in:
- `/app/api/cron/daily-reminders/route.ts`
- `/app/api/test/send-reminders/route.ts`

---

## 📊 What Gets Sent

### **Example Email:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tomorrow's Schedule
Monday, October 21, 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   8 Appointments
   £450.00 Expected Revenue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Appointment Schedule:

Time    | Client        | Service          | Staff  | Price
--------|---------------|------------------|--------|-------
09:00   | Sarah Johnson | Swedish Massage  | Emma   | £65.00
10:30   | Mike Brown    | Facial           | Sarah  | £45.00
12:00   | Lisa Davis    | Manicure         | Emma   | £30.00
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 Deployment

### **Vercel (Recommended):**
1. Push your code to GitHub
2. Deploy to Vercel
3. Vercel automatically detects `vercel.json`
4. Cron jobs are enabled automatically!
5. View cron logs in Vercel Dashboard

### **Free Tier:**
- ✅ Vercel Hobby plan includes cron jobs
- ✅ No additional cost
- ✅ Reliable execution

---

## 📝 Notes

- **Timezone:** The cron runs at 6:00 PM UTC. Adjust the schedule if needed.
- **Email Limits:** Resend free tier allows 100 emails/day, 3,000/month
- **No Appointments:** If there are no appointments for tomorrow, no email is sent
- **Multiple Recipients:** Currently sends to one recipient per business (owner or selected staff)
- **Cancelled Appointments:** Cancelled appointments are excluded from the summary

---

## 🆘 Troubleshooting

### **Not receiving emails?**
1. Check if reminders are enabled in Settings
2. Verify your email address is correct
3. Check spam/junk folder
4. Use "Send Test Reminder Now" button to test immediately
5. Check Vercel cron logs for errors

### **Wrong appointments showing?**
- The system shows appointments for "tomorrow" based on UTC timezone
- Adjust the cron schedule in `vercel.json` if needed

### **Want to change frequency?**
- Edit `vercel.json` to change from daily to weekly, etc.
- Example for weekly: `0 18 * * 1` (Mondays at 6 PM)

---

## ✅ You're All Set!

The daily appointment reminder system is now fully functional! 🎉

**To use:**
1. Enable in Settings
2. Click "Send Test Reminder Now" to test
3. When deployed to Vercel, it runs automatically every day at 6 PM UTC

**Questions?** The system will automatically send emails - no additional setup needed!













