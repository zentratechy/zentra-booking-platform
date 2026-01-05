/**
 * One-time script to create the admin user in Firebase Authentication
 * Run this with: node scripts/create-admin-user.js
 * 
 * Make sure to set FIREBASE_ADMIN_SDK_KEY environment variable
 * or update the Firebase config below
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin (you may need to adjust this based on your setup)
// If you have a service account key, use it here:
// const serviceAccount = require('../path/to/serviceAccountKey.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Or if using environment variables:
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // Add your Firebase config here or use environment variables
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ADMIN_EMAIL = 'james@zentrabooking.com';

function askPassword() {
  return new Promise((resolve) => {
    rl.question('Enter password for admin user: ', (password) => {
      resolve(password);
    });
  });
}

async function createAdminUser() {
  try {
    const password = await askPassword();
    
    if (!password || password.length < 6) {
      console.error('Password must be at least 6 characters long');
      rl.close();
      process.exit(1);
    }

    console.log(`Creating admin user: ${ADMIN_EMAIL}...`);
    
    const userRecord = await admin.auth().createUser({
      email: ADMIN_EMAIL,
      password: password,
      emailVerified: true,
      disabled: false,
    });

    console.log('✅ Admin user created successfully!');
    console.log('User UID:', userRecord.uid);
    console.log('Email:', userRecord.email);
    console.log('\nYou can now login at /admin/login');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists. You can reset the password if needed.');
    } else {
      console.error('Error creating admin user:', error);
    }
    rl.close();
    process.exit(1);
  }
}

createAdminUser();



