# Zentra - Beauty & Wellness Booking Platform

A modern, elegant booking and appointment management platform designed specifically for health and beauty businesses. Built with Next.js, TypeScript, Tailwind CSS, and Firebase.

## 🌟 Features

### For Business Owners
- **📅 Smart Appointment Management** - Manage bookings, set availability, and prevent double bookings
- **💳 Payment Processing** - Accept full payments and deposits securely
- **👥 Staff Management** - Add team members, assign services, and track performance
- **🎯 Client Loyalty Program** - Build customer retention with points, rewards, and membership tiers
- **💬 Digital Consultations** - Offer virtual consultations with integrated video calling
- **📊 Business Analytics** - Track revenue, appointments, and business performance
- **🔔 Automated Notifications** - Send booking confirmations and reminders

### For Clients
- **📱 Easy Online Booking** - Book appointments 24/7 from any device
- **🎨 Beautiful Interface** - Clean, modern design optimized for health & beauty businesses
- **💝 Loyalty Rewards** - Earn points with every visit and redeem for rewards
- **🔒 Secure Payments** - Safe and secure payment processing
- **📞 Virtual Consultations** - Connect with professionals from anywhere

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account (for backend services)

### Installation

1. Clone the repository:
```bash
cd zentra-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a new Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Create a Firestore Database
   - Enable Storage
   - Copy your Firebase configuration

4. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
zentra-web/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/                      # Business login
│   ├── signup/                     # Business registration
│   ├── book/[businessId]/          # Client booking interface
│   └── dashboard/
│       ├── page.tsx                # Business dashboard
│       ├── staff/                  # Staff management
│       ├── loyalty/                # Loyalty program
│       └── consultations/          # Digital consultations
├── lib/
│   └── firebase.ts                 # Firebase configuration
└── public/                         # Static assets
```

## 🎨 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Icons**: Heroicons (SVG)
- **Fonts**: Inter & Playfair Display (Google Fonts)

## 🔥 Firebase Setup

### Firestore Collections

Create the following collections in Firestore:

1. **businesses** - Business profiles
```javascript
{
  businessName: string,
  ownerName: string,
  email: string,
  phone: string,
  businessType: string,
  address: object,
  services: array,
  settings: object,
  createdAt: timestamp
}
```

2. **staff** - Staff members
```javascript
{
  businessId: string,
  name: string,
  email: string,
  role: string,
  services: array,
  schedule: object,
  createdAt: timestamp
}
```

3. **appointments** - Bookings
```javascript
{
  businessId: string,
  clientId: string,
  staffId: string,
  serviceId: string,
  date: timestamp,
  status: string,
  payment: object,
  createdAt: timestamp
}
```

4. **clients** - Client profiles
```javascript
{
  name: string,
  email: string,
  phone: string,
  loyaltyPoints: number,
  membershipLevel: string,
  appointments: array,
  createdAt: timestamp
}
```

5. **loyalty** - Loyalty program data
```javascript
{
  clientId: string,
  points: number,
  level: string,
  history: array,
  rewardsRedeemed: array,
  updatedAt: timestamp
}
```

### Security Rules

Add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Businesses can read/write their own data
    match /businesses/{businessId} {
      allow read: if request.auth != null && request.auth.uid == businessId;
      allow write: if request.auth != null && request.auth.uid == businessId;
    }
    
    // Staff can read/write data for their business
    match /staff/{staffId} {
      allow read, write: if request.auth != null;
    }
    
    // Anyone can read appointments for booking
    match /appointments/{appointmentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Clients can read/write their own data
    match /clients/{clientId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🎯 Features Roadmap

### Phase 1 (Current) ✅
- Landing page and marketing site
- Business registration and authentication
- Basic dashboard
- Client booking interface
- Staff management
- Loyalty program UI
- Digital consultations

### Phase 2 (Coming Soon)
- Email notifications and reminders
- SMS notifications
- Advanced calendar with drag-and-drop
- Inventory management
- Reporting and analytics
- Mobile app (iOS with UIKit)
- Payment gateway integration (Stripe)

### Phase 3 (Future)
- Multi-location support
- Advanced marketing tools
- Automated social media posting
- Gift cards and packages
- Client mobile app
- Integration with accounting software

## 🎨 Design System

### Colors
- **Primary**: `#d4a574` (Warm Gold)
- **Primary Dark**: `#b88f61`
- **Secondary**: `#f5e6d3` (Soft Cream)
- **Accent**: `#8b7355` (Warm Brown)
- **Soft Pink**: `#fdf6f0`
- **Soft Cream**: `#faf8f5`

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 📞 Support

For support and questions, please contact the development team.

## 🙏 Acknowledgments

- Design inspiration from [Timely](https://www.gettimely.com)
- Built with modern web technologies
- Focused on user experience and business needs

---

Built with ❤️ for the health and beauty industry
