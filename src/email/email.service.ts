import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckoutPickupDetails } from '../checkout/dto/checkout.dto';

export interface BankTransferEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderId: number;
  amount: number;
  currency: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    swiftCode?: string;
    iban?: string;
  };
  deadlineHours: number;
}

export interface CashOnPickupEmailData {
  orderNumber: string;
  orderId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  totalAmount: number;
  currency: string;
  pickupDetails: CheckoutPickupDetails;
  orderItems: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  async sendBankTransferInstructions(data: BankTransferEmailData): Promise<void> {
    // In a real implementation, you would use an email service like SendGrid, Resend, or Nodemailer
    // For now, we'll log the email content
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() + data.deadlineHours);

    const emailContent = {
      to: data.customerEmail,
      subject: `Bank Transfer Instructions for Order ${data.orderNumber}`,
      html: this.generateBankTransferEmailHtml(data, deadlineDate),
      text: this.generateBankTransferEmailText(data, deadlineDate),
    };

    console.log('Bank Transfer Email:', JSON.stringify(emailContent, null, 2));

    // TODO: Integrate with actual email service
    // Example with Resend:
    // await this.resend.emails.send({
    //   from: 'orders@shreeji.co.zm',
    //   to: data.customerEmail,
    //   subject: emailContent.subject,
    //   html: emailContent.html,
    // });
  }

  async sendCashOnPickupNotification(data: CashOnPickupEmailData): Promise<void> {
    const teamEmail = this.configService.get<string>('SHREEJI_TEAM_EMAIL') || 'orders@shreeji.co.zm';

    const emailContent = {
      to: teamEmail,
      cc: data.customerEmail,
      subject: `🛒 New Cash on Pickup Order: ${data.orderNumber}`,
      html: this.generateCashOnPickupEmailHtml(data),
      text: this.generateCashOnPickupEmailText(data),
    };

    console.log('Cash on Pickup Notification Email:', JSON.stringify(emailContent, null, 2));

    // TODO: Integrate with actual email service
    // Example with Resend:
    // await this.resend.emails.send({
    //   from: 'orders@shreeji.co.zm',
    //   to: teamEmail,
    //   cc: data.customerEmail,
    //   subject: emailContent.subject,
    //   html: emailContent.html,
    // });
  }

  private generateCashOnPickupEmailHtml(data: CashOnPickupEmailData): string {
    const pickupDate = new Date(data.pickupDetails.preferredPickupDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background-color: #807045; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .section { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #807045; }
            .section h3 { margin-top: 0; color: #807045; }
            .highlight { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            table td { padding: 8px; border-bottom: 1px solid #eee; }
            table td:first-child { font-weight: bold; width: 40%; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 New Cash on Pickup Order</h1>
              <p>Order Number: ${data.orderNumber}</p>
            </div>
            <div class="content">
              <div class="highlight">
                <strong>⚠️ ACTION REQUIRED:</strong> Please prepare this order for pickup and notify the customer when ready.
              </div>

              <div class="section">
                <h3>Customer Information</h3>
                <table>
                  <tr><td>Name:</td><td>${data.customerName}</td></tr>
                  <tr><td>Email:</td><td>${data.customerEmail}</td></tr>
                  ${data.customerPhone ? `<tr><td>Phone:</td><td>${data.customerPhone}</td></tr>` : ''}
                  <tr><td>Order Total:</td><td><strong>${data.currency} ${data.totalAmount.toFixed(2)}</strong></td></tr>
                </table>
              </div>

              <div class="section">
                <h3>📅 Pickup Schedule</h3>
                <table>
                  <tr><td>Preferred Date:</td><td><strong>${pickupDate}</strong></td></tr>
                  <tr><td>Preferred Time:</td><td><strong>${data.pickupDetails.preferredPickupTime}</strong></td></tr>
                </table>
              </div>

              <div class="section">
                <h3>👤 Collection Details</h3>
                <table>
                  ${data.pickupDetails.collectingPersonName ? `
                    <tr><td>Collecting Person:</td><td><strong>${data.pickupDetails.collectingPersonName}</strong></td></tr>
                    <tr><td>Phone:</td><td>${data.pickupDetails.collectingPersonPhone || 'N/A'}</td></tr>
                    <tr><td>Relationship:</td><td>${data.pickupDetails.collectingPersonRelationship || 'N/A'}</td></tr>
                  ` : `
                    <tr><td>Collecting Person:</td><td><strong>${data.customerName}</strong> (Customer)</td></tr>
                  `}
                  <tr><td>ID Type:</td><td>${data.pickupDetails.idType.toUpperCase()}</td></tr>
                  <tr><td>ID Number:</td><td><strong>${data.pickupDetails.idNumber}</strong></td></tr>
                  ${data.pickupDetails.vehicleInfo ? `
                    <tr><td>Vehicle Info:</td><td>${data.pickupDetails.vehicleInfo}</td></tr>
                  ` : ''}
                </table>
              </div>

              <div class="section">
                <h3>📦 Order Items</h3>
                <table>
                  ${data.orderItems.map(item => `
                    <tr>
                      <td>${item.productName}</td>
                      <td>Qty: ${item.quantity} × ${data.currency} ${item.price.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              ${data.pickupDetails.specialInstructions ? `
                <div class="section">
                  <h3>📝 Special Instructions</h3>
                  <p>${data.pickupDetails.specialInstructions}</p>
                </div>
              ` : ''}

              <div class="highlight">
                <strong>✅ Preparation Checklist:</strong>
                <ul>
                  <li>Verify all items are in stock and ready</li>
                  <li>Prepare order for pickup</li>
                  <li>Notify customer when order is ready</li>
                  <li>Have exact change ready (${data.currency} ${data.totalAmount.toFixed(2)})</li>
                  <li>Verify ID upon collection</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>Shreeji E-commerce System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateCashOnPickupEmailText(data: CashOnPickupEmailData): string {
    const pickupDate = new Date(data.pickupDetails.preferredPickupDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
🛒 New Cash on Pickup Order: ${data.orderNumber}

⚠️ ACTION REQUIRED: Please prepare this order for pickup and notify the customer when ready.

CUSTOMER INFORMATION
Name: ${data.customerName}
Email: ${data.customerEmail}
${data.customerPhone ? `Phone: ${data.customerPhone}\n` : ''}Order Total: ${data.currency} ${data.totalAmount.toFixed(2)}

PICKUP SCHEDULE
Preferred Date: ${pickupDate}
Preferred Time: ${data.pickupDetails.preferredPickupTime}

COLLECTION DETAILS
${data.pickupDetails.collectingPersonName ? `
Collecting Person: ${data.pickupDetails.collectingPersonName}
Phone: ${data.pickupDetails.collectingPersonPhone || 'N/A'}
Relationship: ${data.pickupDetails.collectingPersonRelationship || 'N/A'}
` : `
Collecting Person: ${data.customerName} (Customer)
`}ID Type: ${data.pickupDetails.idType.toUpperCase()}
ID Number: ${data.pickupDetails.idNumber}
${data.pickupDetails.vehicleInfo ? `Vehicle Info: ${data.pickupDetails.vehicleInfo}\n` : ''}

ORDER ITEMS
${data.orderItems.map(item => `${item.productName} - Qty: ${item.quantity} × ${data.currency} ${item.price.toFixed(2)}`).join('\n')}

${data.pickupDetails.specialInstructions ? `\nSPECIAL INSTRUCTIONS\n${data.pickupDetails.specialInstructions}\n` : ''}

✅ PREPARATION CHECKLIST:
- Verify all items are in stock and ready
- Prepare order for pickup
- Notify customer when order is ready
- Have exact change ready (${data.currency} ${data.totalAmount.toFixed(2)})
- Verify ID upon collection

Shreeji E-commerce System
    `.trim();
  }

  private generateBankTransferEmailHtml(data: BankTransferEmailData, deadline: Date): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #807045; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .bank-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #807045; }
            .bank-details ul { list-style: none; padding: 0; }
            .bank-details li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .bank-details li:last-child { border-bottom: none; }
            .bank-details strong { display: inline-block; width: 150px; }
            .deadline { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank Transfer Instructions</h1>
            </div>
            <div class="content">
              <p>Dear ${data.customerName},</p>
              <p>Thank you for your order <strong>${data.orderNumber}</strong>.</p>
              <p>To complete your payment, please transfer the amount of <strong>${data.currency} ${data.amount.toFixed(2)}</strong> to our bank account using the details below:</p>
              
              <div class="bank-details">
                <ul>
                  <li><strong>Bank Name:</strong> ${data.bankDetails.bankName}</li>
                  <li><strong>Account Number:</strong> ${data.bankDetails.accountNumber}</li>
                  <li><strong>Account Name:</strong> ${data.bankDetails.accountName}</li>
                  ${data.bankDetails.swiftCode ? `<li><strong>SWIFT Code:</strong> ${data.bankDetails.swiftCode}</li>` : ''}
                  ${data.bankDetails.iban ? `<li><strong>IBAN:</strong> ${data.bankDetails.iban}</li>` : ''}
                  <li><strong>Reference:</strong> ${data.orderNumber}</li>
                </ul>
              </div>

              <div class="deadline">
                <strong>⚠️ Important:</strong> Please complete the transfer within <strong>${data.deadlineHours} hours</strong> (by ${deadline.toLocaleString()}) to confirm your order. Orders not paid within this timeframe will be automatically cancelled.
              </div>

              <p>After completing the transfer, you can upload proof of payment in your order details page.</p>
              <p>Once we verify your payment, your order will be processed and you'll receive a confirmation email.</p>
              
              <p>If you have any questions, please contact us at sales@shreeji.co.zm</p>
            </div>
            <div class="footer">
              <p>Shreeji - Your Trusted Partner</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateBankTransferEmailText(data: BankTransferEmailData, deadline: Date): string {
    return `
Bank Transfer Instructions for Order ${data.orderNumber}

Dear ${data.customerName},

Thank you for your order ${data.orderNumber}.

To complete your payment, please transfer ${data.currency} ${data.amount.toFixed(2)} to:

Bank Name: ${data.bankDetails.bankName}
Account Number: ${data.bankDetails.accountNumber}
Account Name: ${data.bankDetails.accountName}
${data.bankDetails.swiftCode ? `SWIFT Code: ${data.bankDetails.swiftCode}\n` : ''}${data.bankDetails.iban ? `IBAN: ${data.bankDetails.iban}\n` : ''}Reference: ${data.orderNumber}

IMPORTANT: Please complete the transfer within ${data.deadlineHours} hours (by ${deadline.toLocaleString()}) to confirm your order.

After completing the transfer, you can upload proof of payment in your order details page.

If you have any questions, please contact us at sales@shreeji.co.zm

Shreeji - Your Trusted Partner
    `.trim();
  }
}

