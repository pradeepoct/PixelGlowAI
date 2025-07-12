// Simple test script to verify Resend email integration
// Run with: node email-test.js

const { Resend } = require('resend');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('Testing Resend email integration...');
    console.log('API Key:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');
    console.log('From Email:', process.env.NOREPLY_EMAIL);
    
    const result = await resend.emails.send({
      from: process.env.NOREPLY_EMAIL || 'onboarding@resend.dev',
      to: ['test@example.com'], // Replace with a real email for testing
      subject: 'PIXELGLOWAI - Resend Integration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">PIXELGLOWAI Email Test</h1>
          <p>This is a test email to verify that Resend integration is working correctly.</p>
          <p>If you receive this email, the integration is successful!</p>
          <p>Best regards,<br>The PIXELGLOWAI Team</p>
        </div>
      `
    });

    if (result.error) {
      console.error('❌ Email test failed:', result.error);
    } else {
      console.log('✅ Email test successful!');
      console.log('Email ID:', result.data?.id);
    }
  } catch (error) {
    console.error('❌ Email test error:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testEmail();
}

module.exports = { testEmail };

