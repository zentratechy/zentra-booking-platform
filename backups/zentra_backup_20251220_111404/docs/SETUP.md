# Zentra Setup Guide

This guide will help you set up the Zentra platform from scratch.

## 📋 Prerequisites

Before you begin, make sure you have:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Firebase](https://firebase.google.com/) account
- A code editor (VS Code recommended)
- Git installed on your machine

## 🔥 Firebase Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `zentra-platform` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Register Your Web App

1. In your Firebase project dashboard, click the web icon (`</>`)
2. Register app with nickname: "Zentra Web"
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need this later

### Step 3: Enable Authentication

1. In Firebase Console, go to "Authentication" in the left menu
2. Click "Get started"
3. Click on "Email/Password" in the Sign-in method tab
4. Enable "Email/Password"
5. Click "Save"

### Step 4: Create Firestore Database

1. Go to "Firestore Database" in the left menu
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select your preferred location
5. Click "Enable"

### Step 5: Enable Storage

1. Go to "Storage" in the left menu
2. Click "Get started"
3. Start in test mode
4. Click "Done"

### Step 6: Set Up Firestore Collections

Create these collections manually or they will be created automatically when the app runs:

- `businesses`
- `staff`
- `appointments`
- `clients`
- `loyalty`
- `services`
- `consultations`

## 💻 Local Development Setup

### Step 1: Install Dependencies

```bash
cd zentra-web
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### Step 3: Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 🔐 Security Rules

### Firestore Security Rules

1. Go to Firestore Database → Rules
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(businessId) {
      return isSignedIn() && request.auth.uid == businessId;
    }
    
    // Businesses
    match /businesses/{businessId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isOwner(businessId);
      
      // Staff subcollection
      match /staff/{staffId} {
        allow read, write: if isOwner(businessId);
      }
      
      // Services subcollection
      match /services/{serviceId} {
        allow read: if true;
        allow write: if isOwner(businessId);
      }
    }
    
    // Appointments
    match /appointments/{appointmentId} {
      allow read: if isSignedIn();
      allow create: if true; // Anyone can book
      allow update: if isSignedIn();
      allow delete: if isSignedIn();
    }
    
    // Clients
    match /clients/{clientId} {
      allow read: if isSignedIn();
      allow create: if true;
      allow update: if isSignedIn() && request.auth.uid == clientId;
      allow delete: if isSignedIn() && request.auth.uid == clientId;
    }
    
    // Loyalty
    match /loyalty/{loyaltyId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }
    
    // Consultations
    match /consultations/{consultationId} {
      allow read, write: if isSignedIn();
    }
  }
}
```

3. Click "Publish"

### Storage Security Rules

1. Go to Storage → Rules
2. Replace with these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /businesses/{businessId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == businessId;
    }
    
    match /clients/{clientId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == clientId;
    }
  }
}
```

3. Click "Publish"

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables from `.env.local`
6. Click "Deploy"

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```
- Select "Hosting"
- Choose your Firebase project
- Set public directory to `out`
- Configure as single-page app: Yes

4. Build your app:
```bash
npm run build
```

5. Deploy:
```bash
firebase deploy
```

## 🧪 Testing

### Create Test Accounts

1. **Business Account**:
   - Go to `/signup`
   - Create a business account
   - Complete the onboarding

2. **Test Booking**:
   - Go to `/book/[your-business-id]`
   - Make a test booking

3. **Staff Account**:
   - Login to dashboard
   - Add staff members from Staff Management

## 📱 Mobile App Setup (Future)

The iOS app will be built with UIKit in Xcode. Setup instructions will be added when development begins.

## 🔧 Troubleshooting

### Firebase Connection Issues
- Verify environment variables are correct
- Check Firebase project settings
- Ensure all Firebase services are enabled

### Build Errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Next.js cache: `rm -rf .next`
- Update dependencies: `npm update`

### Authentication Issues
- Verify Email/Password auth is enabled in Firebase
- Check Firebase Auth security rules
- Clear browser cache and cookies

## 📞 Support

If you encounter any issues during setup:
1. Check the main README.md for additional information
2. Review Firebase Console logs
3. Check Next.js build logs
4. Contact the development team

## ✅ Setup Checklist

- [ ] Node.js and npm installed
- [ ] Firebase project created
- [ ] Firebase Authentication enabled
- [ ] Firestore Database created
- [ ] Storage enabled
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Development server running
- [ ] Security rules published
- [ ] Test account created
- [ ] Test booking completed

---

🎉 **Congratulations!** Your Zentra platform should now be up and running!


