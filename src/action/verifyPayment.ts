// app/actions/verifyPayment.ts
'use server'
import { createClient } from "@/utils/supabase/server";
import paypal from 'paypal-rest-sdk';

paypal.configure({
  'mode': process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  'client_id': process.env.PAYPAL_CLIENT_ID!,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET!
});

interface VerifyPaymentResult {
  success: boolean;
  status: string;
  details: {
    id: string | undefined;
    payer: any; // Can be more specific if needed
    amount_total: number;
    currency: string | undefined;
    payment_status: string;
  };
}

export async function verifyPayment(orderID: string): Promise<VerifyPaymentResult> {
  if (!orderID) {
    throw new Error('Missing orderID parameter');
  }

  try {
    console.log('Retrieving PayPal order:', orderID);
    
    return new Promise((resolve, reject) => {
      paypal.payment.get(orderID, function (error, payment) {
        if (error) {
          console.error('PayPal get payment error:', error.response);
          reject(new Error('Failed to retrieve PayPal payment'));
        } else {
          const order = payment;
          console.log('PayPal order retrieved:', order);

          const description = order.transactions?.[0]?.description;
          const planTypeMatch = description ? description.match(/^(.*?) Package - AI Headshots$/) : null;
          const planType: string | undefined = planTypeMatch ? planTypeMatch[1] : undefined;

          const amount = order.transactions?.[0]?.amount?.total;

          console.log('Plan Type:', planType);
          console.log('Amount:', amount);

          if (order.state === 'approved') { 
            if (!order.id) {
              reject(new Error('PayPal order ID is undefined'));
              return;
            }
            updatePlan({ 
              paymentStatus: 'paid', 
              amount: parseFloat(amount || '0') * 100, // Convert to cents
              planType: planType ?? 'professional',
              paypalOrderId: order.id,
            }).then(() => {
              console.log('Payment successful', order.state);
              const payer: any = order.payer; // Cast to any
              resolve({ 
                success: true, 
                status: order.state || 'unknown',
                details: {
                  id: order.id,
                  payer: payer?.payer_info?.email || payer?.email, 
                  amount_total: parseFloat(amount || '0') * 100,
                  currency: order.transactions?.[0]?.amount?.currency,
                  payment_status: order.state || 'unknown',
                }
              });
            }).catch(updateError => {
              console.error('Error updating plan:', updateError);
              reject(updateError);
            });
          } else {
            const payer: any = order.payer; // Cast to any
            resolve({ 
              success: false, 
              status: order.state || 'unknown',
              details: {
                id: order.id,
                payer: payer?.payer_info?.email || payer?.email, 
                amount_total: parseFloat(amount || '0') * 100,
                currency: order.transactions?.[0]?.amount?.currency,
                payment_status: order.state || 'unknown',
              }
            });
          }
        }
      });
    });

  } catch (error) {
    console.error('Error in verifyPayment:', error);
    throw error;
  }
}

async function updatePlan({
  paymentStatus, 
  amount, 
  planType,
  paypalOrderId,
}: { 
  paymentStatus: string;
  amount: number;
  planType: string;
  paypalOrderId: string;
}) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("User not authenticated");
    }

    const updateObject = { 
        paymentStatus, 
        amount, 
        planType,
        paypalOrderId,
        paid_at: new Date().toISOString()
    };  

    const { data, error } = await supabase
      .from("userTable")
      .update(updateObject)
      .eq('id', user.id)
      .select();

    if (error) {
        console.error("Error updating plan:", error);
        throw error;
    }

    return data;
}


