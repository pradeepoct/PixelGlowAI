// app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import paypal from 'paypal-rest-sdk';
import { createClient } from "@/utils/supabase/server";

paypal.configure({
  'mode': process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  'client_id': process.env.PAYPAL_CLIENT_ID!,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET!
});

export async function POST(request: NextRequest) {
  try {
    const { orderID, payerID } = await request.json();

    if (!orderID || !payerID) {
      return NextResponse.json(
        { error: 'Missing orderID or payerID' },
        { status: 400 }
      );
    }

    return new Promise<NextResponse>(async (resolve) => {
      paypal.payment.execute(orderID, { payer_id: payerID }, async function (error, payment) {
        if (error) {
          console.error('PayPal execute payment error:', error.response);
          resolve(NextResponse.json(
            { error: 'Failed to execute PayPal payment' },
            { status: 500 }
          ));
        } else {
          const order = payment;
          console.log('PayPal order executed:', order);

          if (order.state === 'approved') {
            const purchaseUnit = order.transactions?.[0];
            const amount = purchaseUnit?.amount?.total;
            const description = purchaseUnit?.description;
            const planTypeMatch = description ? description.match(/^(.*?) Package - AI Headshots$/) : null;
            const planType = planTypeMatch ? planTypeMatch[1] : 'professional';

            if (!order.id) {
              resolve(NextResponse.json(
                { error: 'PayPal order ID is undefined' },
                { status: 500 }
              ));
              return;
            }

            await updateUserPlan({
              paymentStatus: 'paid',
              amount: parseFloat(amount || '0') * 100,
              planType: planType,
              paypalOrderId: order.id,
            });

            const payer = order.payer as any; // Cast to any to access payer_info safely
            resolve(NextResponse.json({
              success: true,
              orderID: order.id,
              status: order.state,
              payerEmail: payer?.payer_info?.email || payer?.email, // Prioritize payer_info.email, then payer.email
              amount: amount,
              planType: planType,
            }));
          } else {
            resolve(NextResponse.json(
              { error: 'Payment not completed', status: order.state },
              { status: 400 }
            ));
          }
        }
      });
    });

  } catch (error) {
    console.error('PayPal capture order error:', error);
    return NextResponse.json(
      { error: 'Failed to capture PayPal order' },
      { status: 500 }
    );
  }
}

async function updateUserPlan({
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
    paid_at: new Date().toISOString(),
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


