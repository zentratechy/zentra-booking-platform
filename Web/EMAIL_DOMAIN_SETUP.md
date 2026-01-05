# Email Domain Configuration

## Domain Setup
- **Domain**: `mail.zentrabooking.com`
- **Provider**: Resend
- **Status**: ✅ Configured

## Email Addresses Used

### Primary Email Addresses
- **From Address**: `noreply@mail.zentrabooking.com`
  - Used for all automated emails (booking confirmations, aftercare, etc.)
  - Prevents replies to automated emails

- **Reply-To Address**: `support@mail.zentrabooking.com`
  - Where customer replies will be sent
  - You should set up this email address to receive customer inquiries

### Recommended Additional Addresses
Consider setting up these email addresses in your Resend dashboard:

1. **support@mail.zentrabooking.com** - Customer support inquiries
2. **bookings@mail.zentrabooking.com** - Booking-related questions
3. **admin@mail.zentrabooking.com** - Administrative communications

## Email Types Sent

### 1. Booking Confirmations
- **From**: `noreply@mail.zentrabooking.com`
- **Reply-To**: `support@mail.zentrabooking.com`
- **Triggered**: When customers complete online bookings

### 2. Aftercare Documents
- **From**: `noreply@mail.zentrabooking.com`
- **Reply-To**: `support@mail.zentrabooking.com`
- **Triggered**: When staff send aftercare instructions

### 3. Payment Links
- **From**: `noreply@mail.zentrabooking.com`
- **Reply-To**: `support@mail.zentrabooking.com`
- **Triggered**: When staff send payment collection links

## Testing

To test your email configuration:

1. **Create a test booking** through the online booking form
2. **Send an aftercare document** from the calendar
3. **Send a payment link** from the payments page

All emails should now come from `noreply@mail.zentrabooking.com` instead of the default Resend domain.

## Troubleshooting

If emails are not being sent:

1. **Check Resend Dashboard**: Verify domain is verified and active
2. **Check API Key**: Ensure the new API key is correctly set in `.env.local`
3. **Check Console Logs**: Look for error messages in the browser console or server logs
4. **Test with Resend API**: Use Resend's test tools to verify domain configuration

## Next Steps

1. **Set up support@mail.zentrabooking.com** in your email client
2. **Configure SPF/DKIM records** (if not already done by Resend)
3. **Test all email flows** to ensure everything works correctly
4. **Consider setting up email templates** for different business types












