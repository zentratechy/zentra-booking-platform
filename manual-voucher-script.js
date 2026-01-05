// Manual voucher creation script
// This creates a voucher directly in Firestore using the webhook data

const voucherData = {
  businessId: "SoCML8OQZ5d8KqY6uyU0vaFd1I33",
  voucherValue: 25,
  recipientName: "Jim",
  recipientEmail: "jamessclark@live.co.uk",
  purchaserName: "James",
  purchaserEmail: "jamesjacksonclark@gmail.com",
  message: "Hello Jim",
  stripeSessionId: "cs_test_a1DsEXRtnCWqU7m5Lnu9RrRVTBXqzMSUW8rlwFcCAFOWnvA3yk0PH4KBjm",
  stripePaymentIntentId: "pi_3SNFTtRaDTxyaF110z1XNN8P"
};

// Generate voucher code
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let code = '';
for (let i = 0; i < 10; i++) {
  code += chars.charAt(Math.floor(Math.random() * chars.length));
}

// Create expiry date (1 year from now)
const expiryDate = new Date();
expiryDate.setFullYear(expiryDate.getFullYear() + 1);

// Create voucher document
const voucher = {
  businessId: voucherData.businessId,
  code: code,
  value: voucherData.voucherValue,
  originalValue: voucherData.voucherValue,
  balance: voucherData.voucherValue,
  recipientName: voucherData.recipientName,
  recipientEmail: voucherData.recipientEmail,
  message: voucherData.message,
  purchaserName: voucherData.purchaserName,
  purchaserEmail: voucherData.purchaserEmail,
  purchaserPhone: "",
  expiryDate: expiryDate,
  status: 'active',
  redeemed: false,
  redeemedAmount: 0,
  createdAt: new Date(),
  source: 'manual_creation',
  stripeSessionId: voucherData.stripeSessionId,
  stripePaymentIntentId: voucherData.stripePaymentIntentId,
};

console.log('Voucher Code:', code);
console.log('Voucher Data:', voucher);

// To create this voucher, you would need to:
// 1. Go to your Firebase Console
// 2. Navigate to Firestore Database
// 3. Go to the 'vouchers' collection
// 4. Click "Add document"
// 5. Copy the voucher data above
// 6. Set the document ID to the voucher code (or let it auto-generate)

console.log('✅ Voucher data ready for manual creation in Firestore');
console.log('📧 Don\'t forget to send emails to:');
console.log('   - Recipient:', voucherData.recipientEmail);
console.log('   - Purchaser:', voucherData.purchaserEmail);




