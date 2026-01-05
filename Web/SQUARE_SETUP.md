# Square Integration Setup Guide

## Prerequisites
You need a Square account to accept payments. If you don't have one, sign up at [squareup.com](https://squareup.com)

## Step 1: Create a Square Application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click **"Create App"** or **"+"** button
3. Enter your app name (e.g., "Zentra Bookings")
4. Click **Create Application**

## Step 2: Get Your Credentials

### Application ID
1. In your Square app dashboard, go to **Credentials**
2. Copy your **Application ID** (starts with `sq0idp-` for production or `sandbox-sq0idb-` for sandbox)

### Application Secret  
1. In the same **Credentials** section
2. Copy your **Application Secret**

## Step 3: Configure OAuth Redirect URI

1. In your Square app dashboard, go to **OAuth**
2. Add redirect URI: `http://localhost:3000/api/square/oauth` (for development)
3. For production, add: `https://yourdomain.com/api/square/oauth`
4. Click **Save**

## Step 4: Add to Environment Variables

Add these to your `.env.local` file:

```env
# Square API Keys
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your_application_id_here
SQUARE_APPLICATION_SECRET=your_application_secret_here
```

**For Sandbox/Testing:**
```env
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-xxxxxxxxxxxxx
SQUARE_APPLICATION_SECRET=sandbox-sq0csb-xxxxxxxxxxxxx
```

**For Production:**
```env
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-xxxxxxxxxxxxx
SQUARE_APPLICATION_SECRET=sq0csp-xxxxxxxxxxxxx
```

## Step 5: Restart Your Development Server

After adding the environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 6: Connect Square in Zentra

1. Log in to your Zentra dashboard
2. Go to **Settings** → **Payments** tab
3. Click **Connect Square**
4. You'll be redirected to Square to authorize
5. After authorization, you'll return to Zentra
6. Square will be connected and ready to accept payments!

## Testing

### Sandbox Mode
- Use test card: `4111 1111 1111 1111`
- Any future expiry date
- Any CVV (e.g., 111)

### Production Mode
- Real card payments will be processed
- Square takes 2.9% + $0.30 per transaction
- Funds deposited to your Square account

## Features Enabled

Once connected, you can:
- ✅ Accept online payments through Square
- ✅ Process in-person payments (if you have Square readers)
- ✅ Issue refunds through Zentra dashboard
- ✅ View payment history
- ✅ Collect deposits for bookings

## Important Notes

- **Fees**: Square charges 2.9% + $0.30 per online transaction
- **Payout**: Funds typically transfer to your bank in 1-2 business days
- **Security**: All credentials are stored securely in Firestore
- **PCI Compliance**: Square handles all card data securely

## Troubleshooting

### "Square is not configured" error
- Make sure you've added the environment variables
- Restart your development server
- Check that the Application ID starts with `sq0idp-` or `sandbox-sq0idb-`

### OAuth redirect fails
- Verify the redirect URI in Square matches exactly: `http://localhost:3000/api/square/oauth`
- Check there are no extra slashes or typos

### Payments fail
- Ensure your Square account is activated
- Check that you've completed Square's verification process
- Verify you're using the correct sandbox/production credentials

## Support

For Square-specific issues:
- [Square Developer Docs](https://developer.squareup.com/docs)
- [Square Support](https://squareup.com/help)

For Zentra integration issues, contact support.
















