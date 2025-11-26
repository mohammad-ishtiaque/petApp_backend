require('dotenv').config();
const mongoose = require('mongoose');
const Owner = require('../src/app/module/Owner/Owner');

// Connect to MongoDB and add a test user with RevenueCat ID
async function addTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if test user already exists
        const existingOwner = await Owner.findOne({ email: 'test-revenuecat@example.com' });

        if (existingOwner) {
            // Update existing user with RevenueCat ID
            existingOwner.revenueCatUserId = '1f6676d3-290f-4411-85d6-f0a1370d9aef';
            await existingOwner.save();
            console.log('✅ Updated existing test user with RevenueCat ID');
            console.log('Email:', existingOwner.email);
            console.log('RevenueCat User ID:', existingOwner.revenueCatUserId);
        } else {
            // Create new test user
            const testOwner = new Owner({
                name: 'Test RevenueCat User',
                email: 'test-revenuecat@example.com',
                password: '$2b$12$test.hashed.password', // Dummy hashed password
                revenueCatUserId: '1f6676d3-290f-4411-85d6-f0a1370d9aef', // From your test webhook
                isVerified: true
            });

            await testOwner.save();
            console.log('✅ Created test user:');
            console.log('Email:', testOwner.email);
            console.log('RevenueCat User ID:', testOwner.revenueCatUserId);
        }

        await mongoose.disconnect();
        console.log('\n✅ Done! You can now test the webhook with this user.');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addTestUser();
