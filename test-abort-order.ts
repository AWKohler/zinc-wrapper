/**
 * Test script for the abort order API endpoint
 * 
 * Usage:
 * 1. Replace REQUEST_ID with an actual order request_id from your database
 * 2. Run: npx tsx test-abort-order.ts
 */

const REQUEST_ID = 'your-request-id-here'; // Replace with actual request_id
const API_URL = 'http://localhost:3000/api/zinc/order';

async function testAbortOrder() {
  try {
    console.log(`Attempting to abort order with request_id: ${REQUEST_ID}`);
    
    const response = await fetch(`${API_URL}/${REQUEST_ID}/abort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error response:', response.status, data);
    } else {
      console.log('Success:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Run the test
testAbortOrder();