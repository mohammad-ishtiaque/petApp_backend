const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const TEST_TOKEN = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN || 'test_token';
const API_URL = 'http://127.0.0.1:8001/api/webhooks/revenuecat';
const HEALTH_URL = 'http://127.0.0.1:8001/';

// Mock Data
const mockEvent = {
  api_version: '1.0',
  event: {
    type: 'INITIAL_PURCHASE',
    id: 'evt_123456789',
    app_user_id: '69254296617710b4a784e22b', // REPLACE WITH A REAL OWNER ID FROM YOUR DB
    product_id: 'monthly_pro',
    expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    purchased_at_ms: Date.now(),
    original_transaction_id: 'trans_123',
    store: 'APP_STORE',
    environment: 'SANDBOX'
  }
};

async function runTest() {
  try {
    // Check Health
    console.log('Checking server health...');
    try {
      const healthRes = await fetch(HEALTH_URL);
      console.log('Health Check:', healthRes.status, await healthRes.json());
    } catch (e) {
      console.error('Health Check Failed:', e.message);
      return; // Stop if server is down
    }

    console.log('Sending mock webhook to:', API_URL);
    console.log('Payload:', JSON.stringify(mockEvent, null, 2));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockEvent)
    });

    const data = await response.json();
    console.log('Response:', response.status, data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runTest();
