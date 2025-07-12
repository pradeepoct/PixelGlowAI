'use server'

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY as string);

interface EmailData {
  to: string;
  from: string;
  templateId: string;
  sendAt?: number;
  subject?: string;
  data?: any;
}

// Email templates mapping
const getEmailTemplate = (templateId: string, data?: any) => {
  switch (templateId) {
    case 'welcome':
      return {
        subject: 'Welcome to PIXELGLOWAI - Your AI Headshot Studio',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Welcome to PIXELGLOWAI!</h1>
            <p>Thank you for joining PIXELGLOWAI, the #1 AI Photo Generator.</p>
            <p>You can now create professional headshots in minutes with our AI technology.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Get Started
              </a>
            </div>
            <p>Best regards,<br>The PIXELGLOWAI Team</p>
          </div>
        `
      };
    case 'payment_success':
      return {
        subject: 'Payment Successful - Your AI Headshots are Being Generated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Payment Successful!</h1>
            <p>Thank you for your purchase. Your AI headshots are now being generated.</p>
            <p><strong>Order Details:</strong></p>
            <ul>
              <li>Plan: ${data?.planName || 'Professional'}</li>
              <li>Amount: ${data?.amount || '$39'}</li>
              <li>Headshots: ${data?.headshots || '100'}</li>
              <li>Turnaround: ${data?.turnaround || '2 hours'}</li>
            </ul>
            <p>You will receive another email once your headshots are ready for download.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                View Dashboard
              </a>
            </div>
            <p>Best regards,<br>The PIXELGLOWAI Team</p>
          </div>
        `
      };
    case 'headshots_ready':
      return {
        subject: 'Your AI Headshots are Ready! 📸',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Your Headshots are Ready!</h1>
            <p>Great news! Your professional AI headshots have been generated and are ready for download.</p>
            <p>We've created ${data?.headshots || '100'} unique headshots with various backgrounds and styles.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/results" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Download Your Headshots
              </a>
            </div>
            <p>Remember: You have full commercial rights to use these headshots anywhere!</p>
            <p>Best regards,<br>The PIXELGLOWAI Team</p>
          </div>
        `
      };
    default:
      return {
        subject: 'PIXELGLOWAI Notification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">PIXELGLOWAI</h1>
            <p>Thank you for using PIXELGLOWAI.</p>
            <p>Best regards,<br>The PIXELGLOWAI Team</p>
          </div>
        `
      };
  }
};

//Template ID
export async function sendEmail({ to, from, templateId, sendAt, subject, data }: EmailData) {
  try {
    const template = getEmailTemplate(templateId, data);
    
    const emailData = {
      from: from || process.env.NOREPLY_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject || template.subject,
      html: template.html,
      // Note: Resend doesn't support scheduled sending in the same way as SendGrid
      // If sendAt is needed, you would need to implement a queue system
    };

    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      console.error('Resend error:', result.error);
      return { 
        success: false, 
        error: result.error.message,
        details: result.error 
      };
    }

    return { success: true, message: 'Email sent successfully', id: result.data?.id };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error.message, 
      details: error 
    };
  }
}