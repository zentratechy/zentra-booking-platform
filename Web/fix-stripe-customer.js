const Stripe = require('stripe');
const fs = require('fs');

// Load environment variables
const envFile = '.env.local';
const envContent = fs.readFileSync(envFile, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const stripe = new Stripe(envVars.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

async function fixCustomer() {
  console.log('Listing all subscriptions...\n');
  
  try {
    // List all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
    });
    
    console.log(`Found ${subscriptions.data.length} subscriptions:\n`);
    
    for (const sub of subscriptions.data) {
      console.log(`  Subscription ID: ${sub.id}`);
      console.log(`  Customer ID: ${sub.customer}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Created: ${new Date(sub.created * 1000).toLocaleString()}`);
      console.log(`  Current period end: ${new Date(sub.items.data[0].current_period_end * 1000).toLocaleString()}`);
      console.log('---');
    }
    
    // Find the one we're looking for
    const targetSub = subscriptions.data.find(sub => sub.id.includes('SMBLm'));
    
    if (targetSub) {
      console.log('\n\nFound target subscription:');
      console.log(`  Subscription ID: ${targetSub.id}`);
      console.log(`  Customer ID: ${targetSub.customer}`);
      console.log(`  Status: ${targetSub.status}`);
      
      console.log('\n\nTo fix this issue, update Firestore:');
      console.log('Business ID: SoCML8OQZ5d8KqY6uyU0vaFd1I33');
      console.log(`Set stripeCustomerId to: ${targetSub.customer}`);
      console.log('\nYou can do this in the Firebase Console:');
      console.log('1. Go to Firestore Database');
      console.log('2. Navigate to businesses collection');
      console.log('3. Find document with ID: SoCML8OQZ5d8KqY6uyU0vaFd1I33');
      console.log(`4. Update the stripeCustomerId field to: ${targetSub.customer}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixCustomer();

