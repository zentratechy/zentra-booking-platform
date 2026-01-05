# Resend Email Integration Setup Guide

## 📧 **Email Features Implemented:**

✅ **Booking Confirmation Emails** - Sent automatically when customers book online
- Beautiful HTML email template
- Shows all appointment details
- Displays deposit/remaining balance if applicable
- Includes business contact information
- Professional branding

---

## 🚀 **Quick Setup (5 Minutes)**

### **Step 1: Create Resend Account**

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" (it's FREE!)
3. Verify your email address
4. You'll be redirected to your dashboard

### **Step 2: Get Your API Key**

1. In Resend dashboard, click "API Keys" in the left sidebar
2. Click "Create API Key"
3. Give it a name like "Zentra Production"
4. Copy the API key (starts with `re_...`)
5. **Important**: Save it somewhere safe - you won't see it again!

### **Step 3: Add API Key to Your Project**

1. Open your project folder
2. Find or create the file `.env.local` in the `Web` folder
3. Add this line:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```
4. Replace `re_your_actual_api_key_here` with your real API key

### **Step 4: Restart Your Development Server**

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart it:
cd Web
npm run dev
```

---

## 📨 **Using Resend's Test Email (For Now)**

**For testing**, we're using Resend's default sending address: `onboarding@resend.dev`

This means:
- ✅ Emails will send immediately (no domain setup needed)
- ✅ Perfect for testing
- ⚠️ Emails might go to spam
- ⚠️ You can only send to yourself initially

### **To Test:**

1. Book an appointment using **your own email address**
2. Check your inbox (and spam folder!)
3. You should receive a beautiful confirmation email

---

## 🌐 **Setting Up Your Own Domain (For Production)**

When you're ready to send emails from your own domain (e.g., `noreply@yourbusiness.com`):

### **1. Add Your Domain to Resend**

1. Go to Resend dashboard → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `yourbusiness.com`)
4. Click "Add"

### **2. Verify Domain Ownership**

Resend will give you DNS records to add. You'll need to add these to your domain registrar (GoDaddy, Namecheap, etc.):

**Records you'll need to add:**
- TXT record for domain verification
- MX record (for receiving)
- DKIM record (for authentication)

**Example DNS Records:**
```
Type: TXT
Name: _resend
Value: [provided by Resend]

Type: MX  
Name: @
Value: [provided by Resend]

Type: TXT
Name: resend._domainkey
Value: [provided by Resend]
```

### **3. Update the "From" Address**

Once verified, update this line in `/Web/app/api/email/send/route.ts`:

```typescript
// Change from:
from: 'Zentra <onboarding@resend.dev>'

// To:
from: 'Your Business Name <noreply@yourdomain.com>'
```

---

## 📊 **Resend Free Tier Limits**

- **3,000 emails per month** - FREE forever!
- **100 emails per day**
- Perfect for starting out
- Upgrade later if needed

---

## 🎨 **Email Template Customization**

The email template is in: `/Web/lib/emailTemplates.ts`

You can customize:
- Colors (currently uses your Zentra brand colors)
- Logo (add your business logo)
- Layout
- Wording
- Additional information

---

## ✅ **Testing Checklist**

1. ✅ Add RESEND_API_KEY to `.env.local`
2. ✅ Restart development server
3. ✅ Make a test booking with your email
4. ✅ Check inbox for confirmation email
5. ✅ Verify all details are correct
6. ✅ Check spam folder if not in inbox

---

## 🔮 **Future Email Features (Easy to Add)**

Once the basic setup is working, you can easily add:

### **Appointment Reminders**
- Send 24 hours before appointment
- Requires a scheduled job (cron)

### **Thank You Emails**
- Send after appointment completion
- Can include loyalty points earned

### **Cancellation Emails**
- Confirm when appointments are cancelled

### **Promotional Emails**
- Special offers
- New services announcements

---

## 🆘 **Troubleshooting**

### **Emails Not Sending?**

1. Check API key is correct in `.env.local`
2. Restart dev server after adding API key
3. Check browser console for errors
4. Check Resend dashboard → "Logs" to see delivery status

### **Emails Going to Spam?**

- Normal when using `onboarding@resend.dev`
- Will improve once you set up your own domain
- With proper domain setup, 99%+ inbox delivery rate

### **API Key Error?**

- Make sure there are no spaces in `.env.local`
- Format should be: `RESEND_API_KEY=re_...` (no quotes)
- Restart server after adding

---

## 💡 **Pro Tips**

1. **Test with Multiple Email Providers**
   - Try Gmail, Outlook, Yahoo
   - Make sure it looks good everywhere

2. **Save Email Logs**
   - Resend dashboard keeps 30 days of logs
   - See exactly what was sent and delivered

3. **Monitor Delivery Rates**
   - Check Resend dashboard analytics
   - Aim for 99%+ delivery rate

---

## 📞 **Need Help?**

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **Resend Discord**: https://resend.com/discord

---

**🎉 That's It!**

Your booking confirmations will now be sent automatically with beautiful, professional emails!














