# Email Deliverability Guide for Zentra

## Current Issue
Your emails are using a generic sender `Zentra <noreply@mail.zentrabooking.com>` which can trigger spam filters and reduce deliverability.

## Solutions to Improve Deliverability

### 1. **Use Business-Specific Sender Information**
Instead of generic "Zentra", use the actual business name and domain.

### 2. **Domain Authentication (SPF, DKIM, DMARC)**
Set up proper email authentication for your domain.

### 3. **Email Content Optimization**
- Avoid spam trigger words
- Proper HTML structure
- Include unsubscribe links
- Use proper headers

### 4. **Resend Domain Setup**
Configure your own domain in Resend for better deliverability.

## Implementation Steps

### Step 1: Update Email Sender Logic
Modify email routes to use business-specific sender information.

### Step 2: Add SPF Record
Add this to your domain's DNS:
```
v=spf1 include:_spf.resend.com ~all
```

### Step 3: Add DKIM Record
Resend will provide DKIM records to add to your DNS.

### Step 4: Add DMARC Record
Add this to your domain's DNS:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### Step 5: Email Content Best Practices
- Use clear, professional subject lines
- Avoid excessive capitalization
- Include proper unsubscribe links
- Use proper HTML structure
- Avoid spam trigger words

## Quick Fixes to Implement Now

1. **Update sender to use business name**
2. **Add proper reply-to addresses**
3. **Include unsubscribe links**
4. **Use professional subject lines**
5. **Avoid spam trigger words**

## Testing Deliverability

1. Send test emails to different providers (Gmail, Outlook, Yahoo)
2. Check spam folder placement
3. Use tools like Mail-Tester.com
4. Monitor bounce rates in Resend dashboard

## Long-term Solutions

1. **Set up your own domain in Resend**
2. **Configure proper DNS records**
3. **Monitor sender reputation**
4. **Implement proper email authentication**

