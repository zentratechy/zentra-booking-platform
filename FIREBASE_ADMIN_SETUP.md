# 🔥 Firebase Admin SDK Setup for Password Reset

To enable automatic password reset functionality, you need to set up Firebase Admin SDK credentials.

## 📋 Step-by-Step Setup

### 1️⃣ Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/zentra-d9671)
2. Click the **Settings gear** → **Project settings**
3. Go to the **Service accounts** tab
4. Click **Generate new private key**
5. Download the JSON file (keep it secure!)

### 2️⃣ Add Environment Variables

Add these to your `.env.local` file:

```env
# Firebase Admin SDK (for password reset)
FIREBASE_CLIENT_EMAIL=your-service-account-email@zentra-d9671.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- Copy the `client_email` from the downloaded JSON
- Copy the `private_key` from the downloaded JSON (keep the quotes and \n characters)
- The private key should be on one line with `\n` for line breaks

### 3️⃣ Example .env.local

```env
# Existing Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=zentra-d9671.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=zentra-d9671
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=zentra-d9671.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@zentra-d9671.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Resend API
RESEND_API_KEY=re_GqmqyFqW_DkDhvgLYEagBXZ5YPSXDPkHc

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Square
SQUARE_APPLICATION_ID=sandbox-...
SQUARE_ACCESS_TOKEN=sandbox-...
```

### 4️⃣ Test the Setup

After adding the environment variables:

1. Restart your development server: `npm run dev`
2. Try the forgot password flow
3. Check the terminal for success messages

## ✅ What This Enables

- **Automatic Password Reset** - Users can reset passwords without contacting support
- **Secure Token Validation** - Reset tokens are validated before password changes
- **Clean User Experience** - No manual intervention required

## 🔒 Security Notes

- **Keep the service account key secure** - Don't commit it to version control
- **The private key is sensitive** - Only add it to `.env.local` (which should be in `.gitignore`)
- **Service account has admin privileges** - Only use it on trusted servers

## 🚀 After Setup

Once configured, the password reset flow will be:
1. User requests reset → Email sent
2. User clicks link → Password reset form
3. User enters new password → **Password updated automatically**
4. User can sign in immediately

No more "contact support" messages! 🎉








