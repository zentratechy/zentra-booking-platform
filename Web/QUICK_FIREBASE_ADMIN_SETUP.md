# 🚀 Quick Firebase Admin Setup

## Current Status
✅ Password reset is working but requires manual support contact  
🔧 To make it fully automatic, add Firebase Admin credentials

## Quick Setup (2 minutes)

### 1️⃣ Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/zentra-d9671)
2. Click **Settings** (gear icon) → **Project settings**
3. Go to **Service accounts** tab
4. Click **Generate new private key**
5. Download the JSON file

### 2️⃣ Create .env.local File

Create a file called `.env.local` in your `Web` folder with this content:

```env
# Your existing Firebase config (get from Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=zentra-d9671.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=zentra-d9671
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=zentra-d9671.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Firebase Admin SDK (from downloaded JSON file)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zentra-d9671.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Resend API (already working)
RESEND_API_KEY=re_GqmqyFqW_DkDhvgLYEagBXZ5YPSXDPkHc
```

### 3️⃣ Copy Values from JSON

From the downloaded JSON file, copy:
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n)

### 4️⃣ Restart Server

```bash
npm run dev
```

## ✅ After Setup

- **Automatic password reset** - No more support contact needed
- **Instant password updates** - Users can reset and login immediately
- **Professional experience** - Fully automated flow

## 🔍 Current Behavior

**Without Firebase Admin:**
- User requests reset → Email sent ✅
- User clicks link → "Contact support" message ⚠️

**With Firebase Admin:**
- User requests reset → Email sent ✅
- User clicks link → Password reset form ✅
- User enters new password → **Password updated automatically** ✅
- User redirected to login → **Can sign in immediately** ✅












