# 🔥 Firebase Setup Guide

Your Firebase configuration is already in `.env.local`. Now you need to enable the services in Firebase Console.

## ✅ Step-by-Step Setup

### 1️⃣ Enable Authentication (Required)

1. Go to [Firebase Console](https://console.firebase.google.com/project/zentra-d9671)
2. Click **Authentication** in the left sidebar
3. Click **Get Started** button
4. Go to the **Sign-in method** tab
5. Click on **Email/Password**
6. Toggle **Enable** switch to ON
7. Click **Save**

✅ **Test it**: Try signing up at http://localhost:3000/signup

---

### 2️⃣ Create Firestore Database (Required)

1. Click **Firestore Database** in the left sidebar
2. Click **Create database** button
3. Choose **Start in test mode** (we'll secure it later)
4. Select your location (choose closest to your users)
   - Recommended: `us-central` or `us-east`
5. Click **Enable**

⏳ Takes about 1-2 minutes to provision

---

### 3️⃣ Set Up Firestore Security Rules (Important!)

Once Firestore is created:

1. Go to **Firestore Database** → **Rules** tab
2. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Businesses collection
    match /businesses/{businessId} {
      // Anyone can read business info (for booking)
      allow read: if true;
      // Only owner can create/update their business
      allow create: if isAuthenticated() && request.auth.uid == businessId;
      allow update: if isOwner(businessId);
      allow delete: if isOwner(businessId);
    }
    
    // Appointments collection
    match /appointments/{appointmentId} {
      allow read: if isAuthenticated();
      allow create: if true; // Anyone can book
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Clients collection
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow create: if true; // Clients can sign up
      allow update: if isOwner(clientId);
      allow delete: if isOwner(clientId);
    }
    
    // Staff collection
    match /staff/{staffId} {
      allow read: if true; // Public for booking
      allow write: if isAuthenticated();
    }
    
    // Services collection
    match /services/{serviceId} {
      allow read: if true; // Public for booking
      allow write: if isAuthenticated();
    }
    
    // Password resets collection (for forgot password)
    match /password_resets/{email} {
      allow read: if true; // Anyone can read (for validation)
      allow write: if true; // Anyone can create/update (for password reset)
    }
    
    // Loyalty collection
    match /loyalty/{loyaltyId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Consultations collection
    match /consultations/{consultationId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

3. Click **Publish**

✅ **Test it**: Sign up and check if data is saved in Firestore

---

### 4️⃣ Enable Storage (Optional but Recommended)

For profile pictures, business logos, etc.

1. Click **Storage** in the left sidebar
2. Click **Get started**
3. Choose **Start in test mode**
4. Click **Next**
5. Select same location as Firestore
6. Click **Done**

#### Storage Security Rules:

1. Go to **Storage** → **Rules** tab
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Business files
    match /businesses/{businessId}/{allPaths=**} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == businessId;
    }
    
    // Client files
    match /clients/{clientId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == clientId;
    }
    
    // Staff files
    match /staff/{staffId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

---

## 🧪 Testing Your Setup

### Test Authentication:

1. Go to http://localhost:3000/signup
2. Fill in the form:
   - Business Name: "Test Spa"
   - Your Name: "John Doe"
   - Email: "test@example.com"
   - Phone: "(555) 123-4567"
   - Password: "password123"
3. Click "Create Account"
4. You should be redirected to `/onboarding`
5. Complete onboarding
6. You should land on the dashboard

### Verify in Firebase Console:

1. **Authentication** → **Users** tab
   - You should see your new user listed
   
2. **Firestore Database** → **Data** tab
   - You should see a `businesses` collection
   - Click it to see your business document
   - The document ID should match your user UID

### Test Login:

1. Open a new incognito/private window
2. Go to http://localhost:3000/login
3. Enter your email and password
4. You should be redirected to the dashboard

---

## 📊 Firestore Data Structure

Your app will create these collections:

```
firestore/
├── businesses/
│   └── {userId}/
│       ├── businessName
│       ├── ownerName
│       ├── email
│       ├── phone
│       ├── businessType
│       ├── address
│       ├── services[]
│       ├── hours{}
│       ├── onboardingComplete
│       └── createdAt
│
├── appointments/
│   └── {appointmentId}/
│       ├── businessId
│       ├── clientId
│       ├── staffId
│       ├── serviceId
│       ├── date
│       ├── time
│       ├── status
│       └── payment{}
│
├── clients/
│   └── {clientId}/
│       ├── name
│       ├── email
│       ├── phone
│       ├── loyaltyPoints
│       └── membershipLevel
│
├── staff/
│   └── {staffId}/
│       ├── businessId
│       ├── name
│       ├── email
│       ├── role
│       └── services[]
│
├── services/
│   └── {serviceId}/
│       ├── businessId
│       ├── name
│       ├── duration
│       ├── price
│       └── category
│
└── loyalty/
    └── {loyaltyId}/
        ├── clientId
        ├── points
        ├── level
        └── history[]
```

---

## 🔒 Security Best Practices

### Current Setup (Development):
- ✅ Authentication enabled
- ✅ Basic security rules
- ⚠️ Test mode for quick development

### Before Production:
1. **Review security rules** - Make them more strict
2. **Add rate limiting** - Prevent abuse
3. **Enable App Check** - Prevent unauthorized access
4. **Set up billing alerts** - Monitor usage
5. **Add logging** - Track suspicious activity

---

## 🎯 What's Working Now

After completing the setup above:

✅ **User Sign Up**
- Create business accounts
- Firebase Authentication
- Data stored in Firestore

✅ **User Login**
- Email/password authentication
- Session management
- Auto-redirect to dashboard

✅ **Protected Routes**
- Dashboard requires login
- Auto-redirect to login if not authenticated

✅ **Onboarding Flow**
- 3-step business setup
- Data saved to Firestore
- Complete business profile

✅ **Data Persistence**
- All form data saved to Firebase
- Real-time updates
- Secure access control

---

## ❓ Troubleshooting

### "Firebase: Error (auth/operation-not-allowed)"
→ Email/Password authentication not enabled. Go back to Step 1.

### "Missing or insufficient permissions"
→ Firestore rules not published. Check Step 3.

### "Firebase: Error (auth/weak-password)"
→ Password must be at least 6 characters.

### "Firebase: Error (auth/email-already-in-use)"
→ This email is already registered. Try logging in instead.

### Data not saving to Firestore
→ Check browser console for errors. Verify security rules are published.

---

## 🚀 Next Steps

After Firebase is set up:

1. **Test the full flow** - Sign up → Onboarding → Dashboard
2. **Add test data** - Create services, staff, appointments
3. **Integrate payments** - Set up Stripe (coming next)
4. **Deploy** - Push to production when ready

---

## 📞 Need Help?

- **Firebase Docs**: https://firebase.google.com/docs
- **Firebase Console**: https://console.firebase.google.com/project/zentra-d9671
- **Support**: Check Firebase Console → Support tab

---

**Ready to test? Complete steps 1 & 2 above, then go to http://localhost:3000/signup!** 🎉


