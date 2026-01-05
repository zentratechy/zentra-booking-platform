# Email Customization Guide

## Overview
All emails sent from Zentra now automatically use your business's branding, including your logo, color scheme, and custom signature.

## Features

### ✨ Automatic Branding
All emails now include:
- **Your business logo** - Displayed prominently in the email header
- **Your color scheme** - Emails match your dashboard theme colors
- **Custom signature** - Add personalized closing text
- **Footer text** - Include additional information like website, social media, etc.

### 📧 Customizable Email Templates
All these emails now support custom branding:
- **Booking Confirmations** - Sent when customers book appointments
- **Reschedule Confirmations** - Sent when appointments are rescheduled  
- **Payment Links** - Sent when payment is required
- **Gift Vouchers** - Beautiful branded voucher emails
- **Daily Reminders** - Tomorrow's schedule with your branding

### 🎨 Modern Email Design
- **Gradient headers** using your brand colors
- **Responsive design** that looks great on all devices
- **Professional layouts** with clear information hierarchy
- **Beautiful appointment cards** with decorative elements
- **Data tables** for detailed information

## How to Customize Your Emails

### 1. **Go to Settings**
Navigate to `Dashboard > Settings > Email Templates`

### 2. **Upload Your Logo**
- Click "Upload Logo" or "Change Logo"
- Recommended size: 200x60px (PNG or JPG)
- Your logo will appear in all email headers

### 3. **Add Your Signature**
Enter custom text that appears at the bottom of every email:
```
Best regards,
Your Business Name
Phone: (555) 123-4567
Email: info@yourbusiness.com
```

### 4. **Add Footer Text**
Include additional information:
```
Thank you for choosing us!
Visit our website: www.yourbusiness.com
Follow us on social media
```

### 5. **Preview Your Emails**
The Email Templates page shows a live preview of how your emails will look with your current settings.

## Email Template Structure

### Header
- Business logo (if uploaded) or business name
- Email title with gradient background using your primary color
- Decorative patterns for visual interest

### Content
- Personalized greeting with customer name
- Clear appointment details in styled cards
- Important information in highlighted boxes
- Call-to-action buttons in your brand colors

### Footer
- Custom signature
- Additional footer text
- Automated message disclaimer
- Consistent branding throughout

## Color Schemes

Your emails automatically use the color scheme selected in Settings > Styles:
- **Primary Color** - Headers, buttons, accents
- **Secondary Color** - Footers, gradients
- **Accent Color** - Highlights and decorative elements

Available color schemes:
- Classic (Blue & Gray)
- Spa Theme (Earthy tones) ✨
- Professional (Navy & Silver)
- Vibrant (Purple & Teal)
- Warm (Coral & Peach)
- Cool (Mint & Slate)

## Variable System

Emails automatically populate with dynamic content:
- `{customerName}` - Customer's name
- `{serviceName}` - Service(s) booked
- `{staffName}` - Assigned staff member
- `{appointmentDate}` - Formatted date
- `{appointmentTime}` - Time slot
- `{locationName}` - Business location
- `{totalPrice}` - Formatted price with currency
- `{voucherCode}` - Gift voucher code
- `{voucherValue}` - Voucher amount

## Technical Details

### Email Templates Location
`Web/lib/emailTemplates.ts`

### Template Functions
- `generateBookingConfirmationEmail()` - Booking confirmations
- `generatePaymentLinkEmail()` - Payment requests
- `generateRescheduleConfirmationEmail()` - Reschedule notices
- `generateVoucherEmail()` - Gift vouchers
- `generateDailyReminderEmail()` - Daily reminders

### Email Settings Storage
Business email settings are stored in Firestore:
```typescript
emailSettings: {
  logo: string,        // URL to email logo
  signature: string,   // Custom signature text
  footerText: string   // Additional footer text
}
```

### API Routes Updated
- `/api/email/send` - General email sending
- `/api/email/send-voucher` - Voucher-specific emails
- `/api/test/send-reminders` - Test reminder emails
- Firebase Functions: `sendDailyReminders` - Automated daily reminders

## Best Practices

### Logo Guidelines
- **Size**: 200x60px recommended (max height: 80px)
- **Format**: PNG with transparent background preferred
- **File size**: Keep under 200KB for fast loading
- **Design**: Simple, clear, and recognizable

### Signature Tips
- Keep it concise (3-5 lines maximum)
- Include essential contact information
- Use proper formatting with line breaks
- Maintain professional tone

### Footer Text Ideas
- Website and social media links
- Operating hours
- Special offers or promotions
- Privacy policy link
- Unsubscribe information

### Color Selection
- Choose colors that represent your brand
- Ensure good contrast for readability
- Test on both light and dark backgrounds
- Consider accessibility standards

## Testing

### Test Your Email Templates
1. Go to Settings > Email Templates
2. Upload your logo and add custom text
3. View the live preview
4. Send a test voucher email to yourself
5. Book a test appointment to see confirmation email

### Preview Different Email Types
The preview shows a sample booking confirmation, but all email types will use the same branding and layout structure.

## Troubleshooting

### Logo Not Showing
- Check file format (PNG, JPG only)
- Verify file size (under 2MB)
- Ensure logo uploaded successfully
- Clear browser cache and try again

### Colors Not Matching
- Verify correct color scheme selected in Styles tab
- Changes may take a few minutes to propagate
- Check if custom CSS is overriding

### Emails Not Sending
- Verify Resend API key is configured
- Check email domain settings
- Review server logs for errors
- Ensure recipient email is valid

## Future Enhancements

Planned features:
- Custom HTML email editor
- Template variations by email type
- A/B testing for subject lines
- Email analytics and open rates
- Multi-language support
- Seasonal templates

---

## Support

For questions or issues:
- Email: support@zentrabooking.com
- Documentation: https://docs.zentrabooking.com
- Support Portal: https://support.zentrabooking.com

---

**Last Updated**: October 2025
**Version**: 2.0.0













