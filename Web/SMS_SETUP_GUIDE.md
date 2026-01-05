# SMS Verification Setup Guide

## 🚀 Setting Up Twilio for SMS Verification

### 1. Create a Twilio Account
1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Verify your phone number

### 2. Get Your Twilio Credentials
1. Go to your [Twilio Console Dashboard](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the main dashboard
3. Go to **Phone Numbers** → **Manage** → **Active numbers**
4. Note your Twilio phone number (starts with +1)

### 3. Add Environment Variables
Add these to your `.env.local` file:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Test Your Setup
1. Start your development server: `npm run dev`
2. Go to the booking page: `http://localhost:3000/book/[businessId]`
3. Try the customer login flow
4. Enter a phone number and check if you receive an SMS

### 5. Twilio Trial Account Limitations
- **Trial accounts** can only send SMS to verified phone numbers
- **Verified numbers** are numbers you add in the Twilio console
- **Production accounts** can send to any valid phone number

### 6. Adding Verified Numbers (Trial Account)
1. Go to [Phone Numbers → Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click **Add a new number**
3. Enter the phone number you want to test with
4. Twilio will call/SMS that number with a verification code
5. Enter the code to verify the number

### 7. Production Setup
For production, you'll need to:
1. **Upgrade your Twilio account** (remove trial limitations)
2. **Purchase a phone number** if you haven't already
3. **Set up webhooks** for delivery status (optional)
4. **Configure rate limiting** for security

## 🔧 How It Works

1. **User enters phone number** on booking page
2. **System generates 6-digit code** (e.g., 123456)
3. **Twilio sends SMS** to user's phone
4. **User enters code** to verify
5. **System validates code** and logs user in

## 📱 SMS Message Format
```
Your Zentra verification code is: 123456. This code expires in 10 minutes.
```

## 🛠️ Development Fallback
If Twilio credentials are not set up, the system will:
1. **Log the code to console** (for development)
2. **Still allow verification** to work
3. **Show helpful error messages** in console

## 💰 Cost Information
- **Trial account**: Free SMS to verified numbers
- **Production**: ~$0.0075 per SMS in US
- **International**: Varies by country

## 🔒 Security Notes
- Codes expire after 10 minutes
- Codes are single-use only
- Rate limiting prevents spam
- Phone numbers are validated before sending








