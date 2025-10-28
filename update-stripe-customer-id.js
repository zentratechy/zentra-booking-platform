// Script to update Stripe Customer ID in Firestore
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateCustomerId() {
  const businessId = 'SoCML8OQZ5d8KqY6uyU0vaFd1I33';
  const newCustomerId = process.argv[2]; // Get customer ID from command line argument
  
  if (!newCustomerId) {
    console.log('Usage: node update-stripe-customer-id.js <new-customer-id>');
    console.log('Example: node update-stripe-customer-id.js cus_ABC123');
    process.exit(1);
  }
  
  try {
    console.log(`Updating business ${businessId} with new customer ID: ${newCustomerId}`);
    
    await db.collection('businesses').doc(businessId).update({
      stripeCustomerId: newCustomerId
    });
    
    console.log('Successfully updated Stripe Customer ID!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating customer ID:', error);
    process.exit(1);
  }
}

updateCustomerId();


