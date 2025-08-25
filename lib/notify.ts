doimport { createClient } from '@supabase/supabase-js';

export interface PickupNotification {
  phone?: string;
  email?: string;
  pin: string;
  orderId: string;
  restaurantName?: string;
  orderTotal?: number;
}

export async function notifyPickup({
  phone,
  email,
  pin,
  orderId,
  restaurantName = 'Restaurant',
  orderTotal
}: PickupNotification): Promise<{ success: boolean; errors: string[] }> {
  // Initialize Supabase inside the function
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const errors: string[] = [];
  const results = [];

  // SMS notification (if configured)
  if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const message = `Your pickup code is ${pin}. Show this to staff at ${restaurantName}. Order #${orderId.slice(0, 8)}`;
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: process.env.TWILIO_PHONE_NUMBER!,
            Body: message,
          }),
        }
      );

      if (response.ok) {
        results.push('sms_sent');
        await supabase
          .from('orders')
          .update({ 
            notification_status: { sms: 'sent', email: email ? 'pending' : 'skipped' }
          })
          .eq('id', orderId);
      } else {
        errors.push('sms_failed');
      }
    } catch (error) {
      errors.push('sms_error');
      console.error('SMS notification error:', error);
    }
  } else if (phone) {
    // SMS configured but no credentials
    results.push('sms_skipped_no_credentials');
  }

  // Email notification (if configured)
  if (email && process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: email,
          subject: `Pickup Code: ${pin} - ${restaurantName}`,
          html: `
            <h2>Your pickup code is: <strong>${pin}</strong></h2>
            <p>Show this code to staff at ${restaurantName} to collect your order.</p>
            <p><strong>Order ID:</strong> ${orderId.slice(0, 8)}</p>
            ${orderTotal ? `<p><strong>Total:</strong> $${(orderTotal / 100).toFixed(2)}</p>` : ''}
            <p>Thank you for your order!</p>
          `,
        }),
      });

      if (response.ok) {
        results.push('email_sent');
        await supabase
          .from('orders')
          .update({ 
            notification_status: { 
              sms: phone ? 'sent' : 'skipped', 
              email: 'sent' 
            }
          })
          .eq('id', orderId);
      } else {
        errors.push('email_failed');
      }
    } catch (error) {
      errors.push('email_error');
      console.error('Email notification error:', error);
    }
  } else if (email) {
    // Email configured but no credentials
    results.push('email_skipped_no_credentials');
  }

  // Log the notification attempt
  await supabase.from('widget_events').insert({
    restaurant_id: (await supabase.from('orders').select('restaurant_id').eq('id', orderId).single()).data?.restaurant_id,
    type: 'pickup_notification',
    payload: {
      orderId,
      pin,
      phone: phone ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : null,
      email: email ? (() => {
        const parts = email.split('@');
        if (parts.length === 2 && parts[0] && parts[1]) {
          return `${parts[0].slice(0, 3)}***@${parts[1]}`;
        }
        return `${email.slice(0, 3)}***`;
      })() : null,
      results,
      errors
    }
  });

  return {
    success: errors.length === 0,
    errors
  };
}
