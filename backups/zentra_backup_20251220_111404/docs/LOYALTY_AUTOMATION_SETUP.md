# 🎉 Loyalty System Automation Setup

## ✅ **What's Been Implemented**

All loyalty features are now **fully automated** using Firebase Cloud Functions:

1. **Birthday Bonus Automation** 🎂
   - Runs daily at 9:00 AM UTC
   - Awards birthday points automatically
   - Sends beautiful birthday emails

2. **Points Expiration Automation** ⏰
   - Runs daily at 2:00 AM UTC
   - Expires points for inactive customers
   - Based on business settings

3. **Daily Appointment Reminders** 📅
   - Already deployed (existing function)
   - Runs hourly to match business timezones

---

## 🚀 **Deployment Instructions**

### **Step 1: Deploy Firebase Functions**

From the `Web/functions` directory, run:

```bash
cd functions
npm install
firebase deploy --only functions
```

This will deploy **three** scheduled functions:
- `sendDailyReminders` - Hourly appointment reminders
- `sendBirthdayBonuses` - Daily at 9 AM UTC
- `expireLoyaltyPoints` - Daily at 2 AM UTC

### **Step 2: Set Environment Variables**

Make sure your Firebase Functions have the `RESEND_API_KEY` set:

```bash
firebase functions:config:set resend.api_key="YOUR_RESEND_API_KEY"
```

Then redeploy:
```bash
firebase deploy --only functions
```

### **Step 3: Verify Deployment**

Check the Firebase Console:
1. Go to **Firebase Console** → **Functions**
2. You should see three deployed functions:
   - `sendDailyReminders`
   - `sendBirthdayBonuses`
   - `expireLoyaltyPoints`
3. Check the **Logs** tab to see execution history

---

## 🧪 **Testing the Functions**

### **Test Birthday Bonuses (Manual Trigger)**

You can manually trigger the function for testing:

```bash
# Using Firebase CLI
firebase functions:shell

# Then in the shell:
sendBirthdayBonuses()
```

Or call the HTTP endpoint (if you want to test via API):
```bash
curl -X POST https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/sendBirthdayBonuses
```

### **Test Points Expiration**

```bash
firebase functions:shell
expireLoyaltyPoints()
```

### **View Logs**

```bash
firebase functions:log --only sendBirthdayBonuses
firebase functions:log --only expireLoyaltyPoints
```

---

## 📊 **How It Works**

### **Birthday Bonuses (9 AM UTC Daily)**

1. Checks all businesses with active loyalty programs
2. Finds clients with birthdays today
3. Verifies they haven't already received this year's bonus
4. Awards points and sends email
5. Logs results

**Email Preview:**
- 🎂 Birthday greeting
- Points awarded notification
- How to use points
- Special birthday offer

### **Points Expiration (2 AM UTC Daily)**

1. Checks all businesses with active loyalty programs
2. Gets expiration settings (e.g., 12 months)
3. Finds clients with inactive accounts
4. Expires points for clients past the inactivity threshold
5. Tracks expired points for reporting

### **Timezone Considerations**

- Functions run in UTC
- Birthday checks are based on month/day only (timezone-agnostic)
- Expiration checks use last visit date

---

## 🔧 **Customization**

### **Change Birthday Bonus Time**

Edit `functions/src/index.ts`:
```typescript
export const sendBirthdayBonuses = functions.pubsub
  .schedule('0 9 * * *') // Change hour here (0-23 UTC)
  .timeZone('UTC')
```

### **Change Expiration Check Time**

Edit `functions/src/index.ts`:
```typescript
export const expireLoyaltyPoints = functions.pubsub
  .schedule('0 2 * * *') // Change hour here (0-23 UTC)
  .timeZone('UTC')
```

### **Change Timezone**

```typescript
.timeZone('America/New_York') // Use IANA timezone
```

---

## 💰 **Cost Estimation**

Firebase Functions (Blaze Plan):
- **Birthday Bonuses**: 1 execution/day
- **Points Expiration**: 1 execution/day
- **Daily Reminders**: 24 executions/day

**Estimated Monthly Cost:**
- Free tier: 2M invocations/month, 400K GB-seconds
- Your usage: ~750 invocations/month
- **Cost: $0** (well within free tier)

---

## 📝 **Monitoring & Logs**

### **View Function Execution**

Firebase Console → Functions → [Function Name] → Logs

### **Common Log Messages**

✅ Success:
```
🎂 Birthday bonus awarded to John Doe (john@email.com)
✅ Birthday bonus check complete: 5 bonuses awarded across 3 businesses
```

⚠️ Info:
```
📅 No clients with birthdays today
⏰ No inactive clients to expire points
```

❌ Errors:
```
❌ Error awarding birthday bonus to John Doe: [error details]
```

---

## 🎯 **Customer Experience**

### **What Customers See:**

1. **On Their Birthday:**
   - Receive beautiful birthday email at 9 AM UTC
   - See bonus points added to account
   - Can immediately use points for booking

2. **Point Expiration:**
   - Points expire silently after inactivity period
   - No email notification (by design)
   - Tracked in client record for business reference

3. **Referral Links:**
   - Every email includes referral section
   - Easy to share booking links
   - Automatic bonus when referral books

---

## ✨ **Features Summary**

| Feature | Status | Automation |
|---------|--------|------------|
| Birthday Bonuses | ✅ Live | Daily 9 AM UTC |
| Points Expiration | ✅ Live | Daily 2 AM UTC |
| Point Redemption | ✅ Live | Real-time |
| Referral Links | ✅ Live | In all emails |
| Appointment Reminders | ✅ Live | Hourly |

---

## 🆘 **Troubleshooting**

### **Functions Not Deploying**

```bash
# Check Firebase project
firebase use --add

# Re-authenticate
firebase login

# Deploy with verbose logging
firebase deploy --only functions --debug
```

### **Emails Not Sending**

1. Check Resend API key is set
2. Verify Resend domain is verified
3. Check function logs for errors
4. Ensure business has `loyaltyProgram.active = true`

### **Birthday Bonuses Not Working**

1. Check client has `birthday` field in Firestore
2. Verify business has `loyaltyProgram.settings.birthdayBonus` set
3. Check function logs for execution
4. Ensure `lastBirthdayAward` isn't from this year

---

## 📞 **Support**

For issues or questions:
1. Check Firebase Console → Functions → Logs
2. Review error messages
3. Test functions manually
4. Check Firestore data structure

---

**Deployment Date:** _To be set_
**Last Updated:** October 21, 2025
**Version:** 1.0.0



