# ⚡ Zentra Quick Start Guide

Get up and running with Zentra in under 10 minutes!

## 🏃‍♂️ Fast Setup (3 Steps)

### 1️⃣ Install & Configure (2 minutes)

```bash
# Navigate to project
cd Web

# Install dependencies (this may take a minute)
npm install

# Copy environment template
cp .env.local.example .env.local
```

### 2️⃣ Set Up Firebase (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" → Name it "Zentra" → Create
3. Click the web icon `</>` → Register app
4. **Copy your config** and paste into `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=paste_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paste_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paste_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paste_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=paste_here
NEXT_PUBLIC_FIREBASE_APP_ID=paste_here
```

5. **Enable Services:**
   - Authentication → Email/Password → Enable
   - Firestore Database → Create database → Test mode
   - Storage → Get started → Test mode

### 3️⃣ Launch (30 seconds)

```bash
npm run dev
```

🎉 **Done!** Open [http://localhost:3000](http://localhost:3000)

---

## 🗺️ What to Explore

### For Business Owners:
1. **Landing Page** → `localhost:3000`
2. **Sign Up** → Create your business account
3. **Dashboard** → View your business overview
4. **Staff Management** → Add your team
5. **Loyalty Program** → Set up rewards
6. **Consultations** → Manage virtual bookings

### For Clients:
1. **Book Appointment** → `localhost:3000/book/[businessId]`
2. Select service → Choose staff → Pick date/time → Confirm

---

## 📱 Key Pages

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Landing page |
| Login | `/login` | Business login |
| Sign Up | `/signup` | Create business account |
| Dashboard | `/dashboard` | Business overview |
| Staff | `/dashboard/staff` | Manage team |
| Loyalty | `/dashboard/loyalty` | Rewards program |
| Consultations | `/dashboard/consultations` | Virtual meetings |
| Booking | `/book/[id]` | Client booking flow |

---

## 🎨 Design Colors

```css
Primary Gold:    #d4a574
Primary Dark:    #b88f61
Soft Cream:      #faf8f5
Soft Pink:       #fdf6f0
```

---

## 🔥 Firebase Collections

The app will automatically create these when you use features:

- `businesses` - Business profiles
- `staff` - Team members
- `appointments` - Bookings
- `clients` - Customer data
- `loyalty` - Points & rewards
- `consultations` - Virtual meetings

---

## 🚨 Common Issues

### "Firebase not configured"
→ Check `.env.local` has all Firebase variables

### "npm install fails"
→ Try: `rm -rf node_modules package-lock.json && npm install`

### "Port 3000 already in use"
→ Kill process: `lsof -ti:3000 | xargs kill` or use different port: `npm run dev -- -p 3001`

### Changes not showing
→ Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

---

## 📚 Need More Help?

- **Detailed Setup**: See `SETUP.md`
- **Full Documentation**: See `README.md`
- **Project Overview**: See `PROJECT_OVERVIEW.md`

---

## ✅ Quick Checklist

- [ ] `npm install` completed
- [ ] Firebase project created
- [ ] `.env.local` configured with Firebase keys
- [ ] Authentication enabled in Firebase
- [ ] Firestore created
- [ ] `npm run dev` running
- [ ] Can access localhost:3000
- [ ] Created test business account

---

## 🎯 Next Steps After Setup

1. **Create Security Rules** (See SETUP.md)
2. **Add Real Business Data**
3. **Set Up Payment Processing** (Stripe recommended)
4. **Configure Email/SMS Notifications**
5. **Customize Branding**
6. **Deploy to Production** (Vercel recommended)

---

## 💡 Pro Tips

- Use Chrome DevTools for debugging
- Check Firebase Console logs for backend issues
- Install React DevTools extension
- Use Next.js DevTools
- Keep Firebase rules in test mode during development
- Switch to production rules before launch

---

## 🌟 Features at a Glance

✅ Beautiful landing page  
✅ Business registration  
✅ Staff management  
✅ Client booking system  
✅ Loyalty rewards program  
✅ Digital consultations  
✅ Payment UI (integration ready)  
✅ Responsive design  
✅ TypeScript throughout  
✅ Firebase backend  

---

**You're all set! Start building your beauty business empire! 💅✨**


