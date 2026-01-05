# Environment Variables Checklist

## Required Environment Variables

### Firebase
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

### Stripe
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_PUBLIC_STRIPE_CLIENT_ID (for Connect)
- STRIPE_WEBHOOK_SECRET (optional)

### Resend (Email)
- RESEND_API_KEY

### Square (Optional)
- NEXT_PUBLIC_SQUARE_APPLICATION_ID
- NEXT_PUBLIC_SQUARE_ENVIRONMENT
- SQUARE_ACCESS_TOKEN (stored in Firestore per business)

### Vercel
- NEXT_PUBLIC_BASE_URL

### Other
- Any other API keys or secrets used in the application

## Note
Actual values are NOT stored in this backup for security reasons.
Store them securely in a password manager or secure vault.
