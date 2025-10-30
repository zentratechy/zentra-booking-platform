import { getColorScheme } from './colorSchemes';

export interface BusinessEmailSettings {
  logo?: string;
  signature?: string;
  footerText?: string;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  colorScheme?: string;
}

export interface AppointmentData {
  customerName: string;
  clientId?: string; // Client ID for referral links
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  appointmentTime: string;
  locationName: string;
  businessName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  totalPrice?: number;
  currency?: string;
  notes?: string;
  appointmentId?: string;
  businessId?: string;
}

export interface PaymentData {
  customerName: string;
  amount: number;
  currency: string;
  paymentLink: string;
  businessName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface VoucherData {
  recipientName: string;
  voucherCode: string;
  voucherValue: number;
  currency: string;
  message?: string;
  purchaserName?: string;
  expiryDate?: string;
  businessName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
}

export interface DailyReminderData {
  businessName: string;
  tomorrowDate: Date;
  appointments: any[];
  currency: string;
  totalRevenue: number;
}

// Helper function to format currency
const formatPrice = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
};

// Helper function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to format expiry date
const formatExpiryDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Generate email template with business branding
export function generateEmailTemplate(
  title: string,
  content: string,
  businessSettings: BusinessEmailSettings,
  appointmentData?: AppointmentData | any // Allow any data type to extract clientId/businessId
) {
  // Get base URL from environment (for referral links)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://zentrabooking.com';
  
  // Extract clientId and businessId from any data structure
  const clientId = appointmentData?.clientId || (appointmentData as any)?.clientId;
  const businessId = appointmentData?.businessId || (appointmentData as any)?.businessId;
  // Respect referral toggle in business settings
  const referralEnabled = (businessSettings as any)?.loyaltyProgram?.settings?.referral?.enabled ??
                          (businessSettings as any)?.loyaltyProgram?.settings?.referralEnabled ?? true;
  const referralUrl = referralEnabled && (typeof businessId === 'string' && typeof clientId === 'string' && businessId && clientId)
    ? `${baseUrl}/book/${businessId}?ref=${clientId}`
    : '';
  
  const colorScheme = getColorScheme(businessSettings.colorScheme || 'classic');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { 
          font-family: 'Cormorant Garamond', 'Georgia', 'Times New Roman', serif;
          background: linear-gradient(135deg, #f5f1ed 0%, #e8e3dc 100%);
          margin: 0; 
          padding: 20px; 
          min-height: 100vh;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          border-radius: 0;
          overflow: hidden; 
          box-shadow: 0 10px 40px rgba(0,0,0,0.08);
          border: 1px solid #e8e3dc;
        }
        .header { 
          background: linear-gradient(135deg, ${colorScheme.colors.primary} 0%, ${colorScheme.colors.secondary} 100%); 
          padding: 50px 30px; 
          text-align: center; 
          color: #ffffff; 
          position: relative;
          border-bottom: 3px solid #d4af37;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.15)"/></pattern></defs><rect width="100" height="100" fill="url(%23pattern)"/></svg>') repeat;
          opacity: 0.4;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
        }
        .header-content { position: relative; z-index: 1; }
        .logo {
          max-height: 70px;
          margin-bottom: 25px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        .header h1 { 
          margin: 0; 
          font-size: 36px; 
          font-weight: 300; 
          letter-spacing: 3px;
          text-transform: uppercase;
          text-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .header p { 
          margin: 15px 0 0; 
          font-size: 16px; 
          opacity: 0.95; 
          font-style: italic;
          font-weight: 300;
          letter-spacing: 1px;
        }
        .content { 
          padding: 50px 40px; 
          color: #2c2c2c; 
          line-height: 1.8;
          font-size: 16px;
        }
        .content p {
          font-family: 'Georgia', serif;
          color: #4a4a4a;
        }
        .appointment-card { 
          background: linear-gradient(135deg, #faf8f5 0%, #f5f1ed 100%);
          margin: 35px 0;
          border-radius: 0;
          padding: 40px;
          border: 2px solid #d4af37;
          border-left: 6px solid #d4af37;
          position: relative;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .appointment-card::before {
          content: '✦';
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 24px;
          color: #d4af37;
          background: #ffffff;
          padding: 5px 15px;
          letter-spacing: 8px;
        }
        .appointment-details { 
          background-color: #faf8f5; 
          border-radius: 0; 
          padding: 35px; 
          margin: 35px 0;
          border: 1px solid #e8e3dc;
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 18px; 
          padding-bottom: 18px; 
          border-bottom: 1px dashed #d4af37; 
        }
        .detail-row:last-child { 
          margin-bottom: 0; 
          padding-bottom: 0; 
          border-bottom: none; 
        }
        .detail-label { 
          color: #8b7355; 
          font-weight: 300; 
          font-size: 13px; 
          font-family: 'Georgia', serif;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .detail-value { 
          color: #2c2c2c; 
          font-weight: 400; 
          font-size: 15px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, ${colorScheme.colors.primary} 0%, ${colorScheme.colors.secondary} 100%);
          color: white;
          padding: 16px 45px;
          border-radius: 0;
          text-decoration: none;
          font-weight: 300;
          font-size: 14px;
          margin: 25px 0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          letter-spacing: 2px;
          text-transform: uppercase;
          border: 2px solid ${colorScheme.colors.primary};
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          background: linear-gradient(135deg, ${colorScheme.colors.secondary} 0%, ${colorScheme.colors.primary} 100%);
        }
        .footer { 
          background: linear-gradient(135deg, ${colorScheme.colors.secondary} 0%, ${colorScheme.colors.primary} 100%);
          padding: 40px 30px; 
          text-align: center; 
          color: #ffffff; 
          font-size: 14px;
          border-top: 3px solid #d4af37;
        }
        .footer p { 
          margin: 0 0 12px 0;
          font-weight: 300;
          letter-spacing: 0.5px;
        }
        .footer .small { 
          font-size: 12px; 
          opacity: 0.85;
          font-style: italic;
          font-weight: 300;
        }
        .signature {
          margin-top: 25px;
          padding-top: 25px;
          border-top: 2px solid #d4af37;
        }
        .signature-content {
          white-space: pre-line;
          font-family: 'Georgia', serif;
          font-style: italic;
          line-height: 1.8;
        }
        .footer-text {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(212,175,55,0.3);
          font-size: 13px;
          opacity: 0.9;
          font-weight: 300;
        }
        .footer-text-content {
          white-space: pre-line;
          line-height: 1.7;
        }
        .divider {
          width: 60px;
          height: 2px;
          background: #d4af37;
          margin: 30px auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            ${businessSettings.logo ? 
              `<img src="${businessSettings.logo}" alt="${businessSettings.businessName || 'Business'}" class="logo">` : 
              `<div style="font-size: 28px; font-weight: 700; margin-bottom: 10px;">${businessSettings.businessName || 'Your Business'}</div>`
            }
            <h1>${title}</h1>
          </div>
        </div>
        
        <div class="content">
          ${content}
        </div>
        
        <div class="footer">
          <div class="signature">
            <div class="signature-content">
              ${businessSettings.signature || `Best regards,<br><strong>${businessSettings.businessName || 'Your Business'}</strong>`}
            </div>
          </div>
          
          ${businessSettings.footerText ? `
            <div class="footer-text">
              <div class="footer-text-content">${businessSettings.footerText}</div>
            </div>
          ` : ''}
          
          <div style="margin: 25px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
            <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">💝 Refer a Friend & Earn Rewards!</h3>
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 15px 0; line-height: 1.6;">
              Love our service? Refer a friend and you'll both earn bonus loyalty points when they book their first appointment!
            </p>
            ${referralUrl ? `
            <div style="text-align: center;">
              <a href="${referralUrl}" 
                 style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; border: 1px solid rgba(255,255,255,0.3); transition: all 0.3s ease;">
                📱 Share Booking Link
              </a>
              <div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-top: 10px; word-break: break-all;">${referralUrl}</div>
            </div>
            ` : ''}
            <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 15px 0 0 0; font-style: italic;">
              Copy and share this link with friends to earn referral rewards!
            </p>
          </div>
          
          <div class="small">
            This is an automated email. Please do not reply to this message.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate booking confirmation email
export function generateBookingConfirmationEmail(
  appointmentData: AppointmentData,
  businessSettings: BusinessEmailSettings = {}
) {
  const colorScheme = getColorScheme(businessSettings.colorScheme || 'classic');
  
  const content = `
    <p style="font-size: 16px; margin-bottom: 30px; color: #333333;">
      Dear <strong>${appointmentData.customerName}</strong>,
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px; color: #333333;">
      Thank you for your booking. We are pleased to confirm your appointment with the following details:
    </p>

    <div style="background: #f9f9f9; border-left: 4px solid ${colorScheme.colors.primary}; padding: 25px; margin: 30px 0;">
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; color: #666666; margin-bottom: 5px;">Date & Time</div>
        <div style="font-size: 20px; font-weight: 600; color: #333333;">
          ${formatDate(appointmentData.appointmentDate)}
        </div>
        <div style="font-size: 18px; color: ${colorScheme.colors.primary}; font-weight: 500; margin-top: 5px;">
          ${appointmentData.appointmentTime}
        </div>
      </div>
      
      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 20px;">
        <div style="margin-bottom: 15px;">
          <div style="font-size: 13px; color: #666666; margin-bottom: 3px;">Service</div>
          <div style="font-size: 16px; font-weight: 500; color: #333333;">${appointmentData.serviceName}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="font-size: 13px; color: #666666; margin-bottom: 3px;">Staff Member</div>
          <div style="font-size: 16px; font-weight: 500; color: #333333;">${appointmentData.staffName}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="font-size: 13px; color: #666666; margin-bottom: 3px;">Location</div>
          <div style="font-size: 16px; font-weight: 500; color: #333333;">${appointmentData.locationName}</div>
        </div>
        
        ${appointmentData.totalPrice ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <div style="font-size: 13px; color: #666666; margin-bottom: 3px;">Total Price</div>
          <div style="font-size: 20px; font-weight: 600; color: ${colorScheme.colors.primary};">${formatPrice(appointmentData.totalPrice, appointmentData.currency)}</div>
        </div>
        ` : ''}
        
        ${appointmentData.notes ? `
        <div style="margin-top: 15px;">
          <div style="font-size: 13px; color: #666666; margin-bottom: 3px;">Notes</div>
          <div style="font-size: 14px; color: #333333;">${appointmentData.notes}</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${appointmentData.businessId && (appointmentData as any).clientEmail ? `
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://zentrabooking.com'}/my-bookings?email=${encodeURIComponent((appointmentData as any).clientEmail || '')}&businessId=${appointmentData.businessId}" 
         style="display: inline-block; background: ${colorScheme.colors.primary}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 15px;">
        Manage Booking
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666666; text-align: center; margin-top: 20px;">
      Need to make changes? Use the button above to view or modify your appointment.
    </p>
    ` : ''}
    
    <p style="font-size: 15px; color: #333333; margin-top: 35px;">
      We look forward to seeing you.
    </p>
  `;

  return generateEmailTemplate('Appointment Confirmed', content, businessSettings, appointmentData);
}

// Generate payment link email
export function generatePaymentLinkEmail(
  paymentData: PaymentData,
  businessSettings: BusinessEmailSettings = {}
) {
  const content = `
    <p style="font-size: 18px; margin-bottom: 25px; font-family: Georgia, serif;">
      Dear <strong style="color: #8b7355;">${paymentData.customerName}</strong>,
    </p>
    
    <div class="divider"></div>
    
    <p style="font-size: 16px; margin-bottom: 25px; font-style: italic; text-align: center; color: #8b7355;">
      We kindly request payment for your recent appointment.
    </p>

    <div class="appointment-card">
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 12px; color: #8b7355; margin-bottom: 15px; letter-spacing: 3px; font-weight: 300; text-transform: uppercase;">Outstanding Balance</div>
        <div style="font-size: 36px; font-weight: 300; color: #2c2c2c; margin-bottom: 12px; font-family: Georgia, serif;">
          ${formatPrice(paymentData.amount, paymentData.currency)}
        </div>
        ${paymentData.serviceName ? `
        <div style="font-size: 16px; color: #8b7355; font-weight: 300; font-style: italic;">
          ${paymentData.serviceName}
        </div>
        ` : ''}
      </div>
    </div>

    ${paymentData.appointmentDate ? `
    <div class="appointment-details">
      <div class="detail-row">
        <div class="detail-label">Appointment Date</div>
        <div class="detail-value">${formatDate(paymentData.appointmentDate)}</div>
      </div>
      ${paymentData.appointmentTime ? `
      <div class="detail-row">
        <div class="detail-label">Appointment Time</div>
        <div class="detail-value">${paymentData.appointmentTime}</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <div style="text-align: center; margin: 35px 0;">
      <a href="${paymentData.paymentLink}" class="cta-button">Complete Payment</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666666; margin-top: 30px; text-align: center; line-height: 1.8;">
      This secure payment link will expire in 7 days. For any inquiries, we are at your service.
    </p>
  `;

  // Pass paymentData to template so it can extract clientId/businessId for referral link
  return generateEmailTemplate('Payment Required', content, businessSettings, paymentData);
}

// Generate reschedule confirmation email
export function generateRescheduleConfirmationEmail(
  appointmentDetails: any,
  businessSettings: BusinessEmailSettings = {}
) {
  const content = `
    <p style="font-size: 18px; margin-bottom: 25px; font-family: Georgia, serif;">
      Dear <strong style="color: #8b7355;">${appointmentDetails.customerName || appointmentDetails.clientName || 'Valued Guest'}</strong>,
    </p>
    
    <div class="divider"></div>
    
    <p style="font-size: 16px; margin-bottom: 25px; font-style: italic; text-align: center; color: #8b7355;">
      Your appointment has been successfully rescheduled.
    </p>

    <div class="appointment-card">
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 12px; color: #8b7355; margin-bottom: 15px; letter-spacing: 3px; font-weight: 300; text-transform: uppercase;">Your New Reservation</div>
        <div style="font-size: 26px; font-weight: 300; color: #2c2c2c; margin-bottom: 12px; font-family: Georgia, serif;">
          ${appointmentDetails.newDate}
        </div>
        <div style="font-size: 18px; color: #8b7355; font-weight: 300;">
          ${appointmentDetails.newTime}
        </div>
      </div>
    </div>

    <div class="appointment-details">
      <div class="detail-row">
        <div class="detail-label">Service</div>
        <div class="detail-value">${appointmentDetails.serviceName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Staff Member</div>
        <div class="detail-value">${appointmentDetails.staffName}</div>
      </div>
      ${appointmentDetails.locationName ? `
      <div class="detail-row">
        <div class="detail-label">Location</div>
        <div class="detail-value">${appointmentDetails.locationName}</div>
      </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <p style="font-size: 15px; color: #8b7355; margin-top: 35px; text-align: center; font-style: italic;">
      We look forward to welcoming you at your new appointment time.
    </p>
    
    <p style="font-size: 14px; color: #666666; margin-top: 25px; text-align: center; line-height: 1.8;">
      Should you need any further assistance, please do not hesitate to contact us.
    </p>
  `;

  // Pass appointmentDetails to template so it can extract clientId/businessId for referral link
  return generateEmailTemplate('Appointment Rescheduled', content, businessSettings, appointmentDetails);
}

// Generate voucher email
export function generateVoucherEmail(
  voucherData: VoucherData,
  businessSettings: BusinessEmailSettings = {}
) {
  const content = `
    <p style="font-size: 18px; margin-bottom: 25px; font-family: Georgia, serif;">
      Dear <strong style="color: #8b7355;">${voucherData.recipientName}</strong>,
    </p>
    
    <div class="divider"></div>
    
    <p style="font-size: 16px; margin-bottom: 25px; font-style: italic; text-align: center; color: #8b7355;">
      ${voucherData.purchaserName ? `${voucherData.purchaserName} has gifted you a luxurious experience` : 'You have received a special gift'} at <strong>${voucherData.businessName}</strong>.
    </p>

    <div class="appointment-card">
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 12px; color: #8b7355; margin-bottom: 15px; letter-spacing: 3px; font-weight: 300; text-transform: uppercase;">Voucher Code</div>
        <div style="font-size: 28px; font-weight: 400; color: #d4af37; letter-spacing: 4px; margin-bottom: 25px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${voucherData.voucherCode}
        </div>
        <div style="font-size: 12px; color: #8b7355; margin-bottom: 15px; letter-spacing: 3px; font-weight: 300; text-transform: uppercase;">Value</div>
        <div style="font-size: 36px; font-weight: 300; color: #2c2c2c; font-family: Georgia, serif;">
          ${formatPrice(voucherData.voucherValue, voucherData.currency)}
        </div>
      </div>
    </div>

    ${voucherData.message ? `
    <div style="background: linear-gradient(135deg, ${businessSettings.colorScheme ? getColorScheme(businessSettings.colorScheme).colors.primary : '#8B7355'} 0%, ${businessSettings.colorScheme ? getColorScheme(businessSettings.colorScheme).colors.secondary : '#A8B5A0'} 100%); color: white; padding: 35px; border-radius: 0; margin: 35px 0; font-style: italic; font-size: 18px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border-top: 3px solid #d4af37; border-bottom: 3px solid #d4af37;">
      <div style="font-size: 12px; margin-bottom: 15px; opacity: 0.9; letter-spacing: 2px; text-transform: uppercase; font-weight: 300;">A Personal Message</div>
      <div style="font-family: Georgia, serif; font-size: 20px; font-weight: 300; line-height: 1.8;">"${voucherData.message}"</div>
    </div>
    ` : ''}

    <div class="appointment-details">
      <div class="detail-row">
        <div class="detail-label">Recipient</div>
        <div class="detail-value">${voucherData.recipientName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Voucher Value</div>
        <div class="detail-value">${formatPrice(voucherData.voucherValue, voucherData.currency)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Voucher Code</div>
        <div class="detail-value" style="font-family: monospace; font-weight: 600;">${voucherData.voucherCode}</div>
      </div>
      ${voucherData.expiryDate ? `
      <div class="detail-row">
        <div class="detail-label">Expires</div>
        <div class="detail-value">${formatExpiryDate(voucherData.expiryDate)}</div>
      </div>
      ` : ''}
      ${voucherData.purchaserName ? `
      <div class="detail-row">
        <div class="detail-label">From</div>
        <div class="detail-value">${voucherData.purchaserName}</div>
      </div>
      ` : ''}
    </div>

    <div style="background: #faf8f5; border-radius: 0; padding: 30px; margin: 35px 0; border-left: 4px solid #d4af37; border-right: 4px solid #d4af37;">
      <h3 style="color: #8b7355; margin: 0 0 20px 0; font-size: 18px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; text-align: center;">Redeeming Your Voucher</h3>
      <ul style="margin: 0; padding-left: 30px; font-family: Georgia, serif;">
        <li style="margin-bottom: 12px; color: #4a4a4a; line-height: 1.8;">Book your appointment online or contact us directly</li>
        <li style="margin-bottom: 12px; color: #4a4a4a; line-height: 1.8;">Present your voucher code: <strong style="color: #d4af37; letter-spacing: 2px;">${voucherData.voucherCode}</strong></li>
        <li style="margin-bottom: 12px; color: #4a4a4a; line-height: 1.8;">The voucher value will be applied to your treatment</li>
        <li style="margin-bottom: 12px; color: #4a4a4a; line-height: 1.8;">${voucherData.expiryDate ? `Valid until ${formatExpiryDate(voucherData.expiryDate)}` : 'No expiry - indulge anytime'}</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 35px 0;">
      <a href="#" class="cta-button">Reserve Your Experience</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666666; margin-top: 30px; text-align: center; line-height: 1.8;">
      We are delighted to welcome you and look forward to providing exceptional service.
    </p>
  `;

  return generateEmailTemplate('🎁 Gift Voucher', content, businessSettings);
}

// Generate daily reminder email
export function generateDailyReminderEmail(
  reminderData: DailyReminderData,
  businessSettings: BusinessEmailSettings = {}
) {
  const { businessName, tomorrowDate, appointments, currency, totalRevenue } = reminderData;
  
  const content = `
    <p style="font-size: 18px; margin-bottom: 25px; font-family: Georgia, serif; color: #2c2c2c;">
      Good day,
    </p>
    
    <div class="divider"></div>
    
    <p style="font-size: 16px; margin-bottom: 25px; font-style: italic; text-align: center; color: #8b7355;">
      Here is tomorrow's appointment schedule for <strong>${businessName}</strong>.
    </p>

    <div class="appointment-card">
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 12px; color: #8b7355; margin-bottom: 15px; letter-spacing: 3px; font-weight: 300; text-transform: uppercase;">Tomorrow's Schedule</div>
        <div style="font-size: 26px; font-weight: 300; color: #2c2c2c; margin-bottom: 12px; font-family: Georgia, serif;">
          ${tomorrowDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div style="font-size: 16px; color: #8b7355; font-weight: 300; font-style: italic;">
          ${appointments.length} appointment${appointments.length !== 1 ? 's' : ''} scheduled
        </div>
      </div>
    </div>

    <div class="appointment-details">
      <div class="detail-row">
        <div class="detail-label">Total Appointments</div>
        <div class="detail-value">${appointments.length}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Expected Revenue</div>
        <div class="detail-value">${formatPrice(totalRevenue, currency)}</div>
      </div>
    </div>

    ${appointments.length > 0 ? `
    <div style="margin: 35px 0;">
      <h3 style="color: #8b7355; margin: 0 0 25px 0; font-size: 20px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; text-align: center;">Detailed Schedule</h3>
      <div style="background: #faf8f5; border-radius: 0; overflow: hidden; border: 1px solid #e8e3dc;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: linear-gradient(135deg, #f5f1ed 0%, #e8e3dc 100%); border-bottom: 2px solid #d4af37;">
              <th style="padding: 18px 15px; text-align: left; font-weight: 300; color: #8b7355; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;">Time</th>
              <th style="padding: 18px 15px; text-align: left; font-weight: 300; color: #8b7355; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;">Client</th>
              <th style="padding: 18px 15px; text-align: left; font-weight: 300; color: #8b7355; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;">Service</th>
              <th style="padding: 18px 15px; text-align: left; font-weight: 300; color: #8b7355; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;">Staff</th>
              <th style="padding: 18px 15px; text-align: left; font-weight: 300; color: #8b7355; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${appointments.map((apt: any) => `
              <tr style="border-bottom: 1px dashed #e8e3dc;">
                <td style="padding: 18px 15px; font-weight: 400; color: #2c2c2c; font-family: Georgia, serif;">${apt.time}</td>
                <td style="padding: 18px 15px; color: #4a4a4a;">${apt.clientName}</td>
                <td style="padding: 18px 15px; color: #4a4a4a;">${apt.serviceName}</td>
                <td style="padding: 18px 15px; color: #4a4a4a;">${apt.staffName}</td>
                <td style="padding: 18px 15px; font-weight: 400; color: #2c2c2c;">${formatPrice(apt.payment?.price || 0, currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666666; margin-top: 35px; text-align: center; line-height: 1.8;">
      Please ensure all preparations are complete for tomorrow's appointments.
    </p>
  `;

  return generateEmailTemplate('Tomorrow\'s Schedule', content, businessSettings);
}

export function generateVoucherConfirmationEmail(confirmationData: any, businessSettings: BusinessEmailSettings) {
  const colorScheme = getColorScheme(businessSettings.colorScheme || 'classic');
  
  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: ${colorScheme.colors.primary}; font-size: 28px; margin: 0 0 10px 0; font-weight: 600;">
        🎁 Gift Voucher Purchase Confirmed!
      </h1>
      <p style="color: #666666; font-size: 16px; margin: 0;">
        Thank you for your purchase
      </p>
    </div>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <h2 style="color: #2c2c2c; font-size: 24px; margin: 0 0 15px 0; font-weight: 600;">
        ${formatPrice(confirmationData.voucherValue, confirmationData.currency)}
      </h2>
      <p style="color: #666666; font-size: 16px; margin: 0;">
        Gift Voucher for ${confirmationData.recipientName}
      </p>
    </div>

    <div style="background: white; border: 2px solid ${colorScheme.colors.primary}; border-radius: 12px; padding: 25px; margin: 25px 0;">
      <h3 style="color: #2c2c2c; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">Voucher Details</h3>
      <div style="display: grid; gap: 12px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <span style="color: #666666; font-weight: 500;">Voucher Code:</span>
          <span style="color: #2c2c2c; font-weight: 600; font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px;">${confirmationData.voucherCode}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <span style="color: #666666; font-weight: 500;">Recipient:</span>
          <span style="color: #2c2c2c; font-weight: 600;">${confirmationData.recipientName}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <span style="color: #666666; font-weight: 500;">Recipient Email:</span>
          <span style="color: #2c2c2c; font-weight: 600;">${confirmationData.recipientEmail}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #666666; font-weight: 500;">Valid Until:</span>
          <span style="color: #2c2c2c; font-weight: 600;">12 months from purchase</span>
        </div>
      </div>
    </div>

    <div style="background: #f0f8ff; border-left: 4px solid ${colorScheme.colors.primary}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="color: #2c2c2c; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">What happens next?</h3>
      <ul style="color: #666666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>The gift voucher has been sent to <strong>${confirmationData.recipientEmail}</strong></li>
        <li>They can use it to book appointments or purchase services</li>
        <li>The voucher is valid for 12 months from today</li>
        <li>You can track the voucher status in your account</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #666666; font-size: 14px; margin: 0 0 15px 0;">
        Need help or have questions about your voucher?
      </p>
      <p style="color: #666666; font-size: 14px; margin: 0;">
        Contact ${businessSettings.businessName || 'the business'} directly for assistance.
      </p>
    </div>
  `;

  return generateEmailTemplate('Gift Voucher Purchase Confirmation', content, businessSettings);
}

export function generateBirthdayBonusEmail(bonusData: any, businessSettings: BusinessEmailSettings) {
  const colorScheme = getColorScheme(businessSettings.colorScheme || 'classic');
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: ${colorScheme.colors.primary}; font-size: 28px; margin: 0 0 10px 0; font-weight: 600;">
        🎂 Happy Birthday!
      </h1>
      <p style="color: #666666; font-size: 16px; margin: 0;">
        You've earned birthday bonus points!
      </p>
    </div>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <h2 style="color: #2c2c2c; font-size: 24px; margin: 0 0 15px 0; font-weight: 600;">
        ${bonusData.pointsAwarded} Loyalty Points
      </h2>
      <p style="color: #666666; font-size: 16px; margin: 0;">
        Birthday bonus from ${bonusData.businessName}
      </p>
    </div>

    <div style="background: white; border: 2px solid ${colorScheme.colors.primary}; border-radius: 12px; padding: 25px; margin: 25px 0;">
      <h3 style="color: #2c2c2c; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">How to use your points:</h3>
      <ul style="color: #666666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Book your next appointment and apply points for discounts</li>
        <li>Redeem points for special rewards and services</li>
        <li>Points never expire as long as you stay active</li>
        <li>Check your point balance anytime in your account</li>
      </ul>
    </div>

    <div style="background: #f0f8ff; border-left: 4px solid ${colorScheme.colors.primary}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="color: #2c2c2c; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">Special Birthday Offer!</h3>
      <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6;">
        Book your next appointment this month and get an extra 10% off when you use your loyalty points!
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #666666; font-size: 14px; margin: 0;">
        Thank you for being a valued customer. We hope you have a wonderful birthday!
      </p>
    </div>
  `;

  return generateEmailTemplate('Happy Birthday!', content, businessSettings);
}