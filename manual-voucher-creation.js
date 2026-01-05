// Manual voucher creation script
// Run this in the browser console on zentrabooking.com

const voucherData = {
  businessId: "SoCML8OQZ5d8KqY6uyU0vaFd1I33",
  voucherValue: 25,
  recipientName: "Jim",
  recipientEmail: "jamessclark@live.co.uk",
  purchaserName: "James",
  purchaserEmail: "jamesjacksonclark@gmail.com",
  message: "Hello Jim"
};

// Generate voucher code
const voucherCode = 'VCH' + Math.random().toString(36).substring(2, 8).toUpperCase();

// Calculate expiry date (1 year from now)
const expiryDate = new Date();
expiryDate.setFullYear(expiryDate.getFullYear() + 1);

// Create voucher document
const voucher = {
  businessId: voucherData.businessId,
  code: voucherCode,
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
  stripeSessionId: 'manual_' + Date.now(),
  stripePaymentIntentId: 'manual_' + Date.now(),
};

console.log('Creating voucher:', voucher);

// This would need to be run in a context where Firebase is available
// For now, let's just log the voucher data
console.log('Voucher Code:', voucherCode);
console.log('Voucher Data:', voucher);




