import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { name, email, subject, message, businessId, businessName } = await request.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create ticket in Firestore
    const ticketData = {
      name,
      email,
      subject,
      message,
      businessId: businessId || null,
      businessName: businessName || null,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ticketRef = await addDoc(collection(db, 'supportTickets'), ticketData);
    const ticketId = ticketRef.id;

    // Email template for support notification
    const supportEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Support Ticket</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d4a574 0%, #c8965f 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Support Ticket</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #d4a574; margin-top: 0; font-size: 20px;">Ticket #${ticketId}</h2>
              <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Open</span></p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">Contact Information</h3>
              <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #d4a574; text-decoration: none;">${email}</a></p>
              ${businessName ? `<p style="margin: 8px 0;"><strong>Business:</strong> ${businessName}</p>` : ''}
              ${businessId ? `<p style="margin: 8px 0;"><strong>Business ID:</strong> ${businessId}</p>` : ''}
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">Subject</h3>
              <p style="margin: 0; font-size: 16px; font-weight: 600;">${subject}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">Message</h3>
              <div style="white-space: pre-wrap; margin: 0; line-height: 1.8;">${message}</div>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                This ticket was created through the Zentra support form.<br>
                Please respond to <a href="mailto:${email}" style="color: #d4a574; text-decoration: none;">${email}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Email template for customer confirmation
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Ticket Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d4a574 0%, #c8965f 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Thank You for Contacting Us</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 16px; color: #333;">Hi ${name},</p>
              <p style="margin: 15px 0 0 0; font-size: 16px; color: #333;">We've received your support request and our team will get back to you as soon as possible.</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">Ticket Details</h3>
              <p style="margin: 8px 0;"><strong>Ticket #:</strong> ${ticketId}</p>
              <p style="margin: 8px 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Open</span></p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">Your Message</h3>
              <div style="white-space: pre-wrap; margin: 0; line-height: 1.8; color: #666;">${message}</div>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>⏱️ Response Time:</strong> We typically respond within 24-48 hours during business days.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                If you have any urgent questions, please contact us directly at<br>
                <a href="mailto:support@zentrabooking.com" style="color: #d4a574; text-decoration: none; font-weight: bold;">support@zentrabooking.com</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send both emails in parallel with error handling
    console.log('📧 Sending support ticket emails...');
    console.log('📧 Confirmation to:', email);
    console.log('📧 Notification to: support@zentrabooking.com');
    
    const emailResults = await Promise.allSettled([
      // Send confirmation email to ticket creator
      resend.emails.send({
        from: 'Zentra Support <noreply@mail.zentrabooking.com>',
        to: email,
        subject: `[Ticket #${ticketId}] We've received your support request`,
        html: confirmationEmailHtml,
      }),
      // Send notification email to support team
      resend.emails.send({
        from: 'Zentra Support <noreply@mail.zentrabooking.com>',
        to: 'support@zentrabooking.com',
        replyTo: email,
        subject: `[Ticket #${ticketId}] ${subject}`,
        html: supportEmailHtml,
      }),
    ]);

    // Log results
    emailResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Email ${index + 1} sent successfully:`, result.value);
      } else {
        console.error(`❌ Email ${index + 1} failed:`, result.reason);
      }
    });

    // Check if any emails failed
    const failedEmails = emailResults.filter(r => r.status === 'rejected');
    if (failedEmails.length > 0) {
      console.error('⚠️ Some emails failed to send:', failedEmails);
      // Still return success since ticket was created, but log the error
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Support ticket created successfully',
    });
  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

