import { NextRequest, NextResponse } from 'next/server';
import paypal from 'paypal-rest-sdk';

paypal.configure({
  mode: 'sandbox', //sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || '',
});

export async function POST(request: NextRequest) {
  try {
    const { planType, amount, promoCode, originalAmount } = await request.json();

    console.log('Received request to create PayPal order:');
    console.log('Plan Type:', planType);
    console.log('Amount:', amount);
    console.log('Promo Code:', promoCode);
    console.log('Original Amount:', originalAmount);

    if (!planType || !amount) {
      console.error('Missing required fields: planType, amount');
      return NextResponse.json(
        { error: 'Missing required fields: planType, amount' },
        { status: 400 }
      );
    }

    // Build item description based on whether promo code was applied
    let itemDescription = `${planType} plan`;
    let transactionDescription = `Payment for ${planType} plan`;
    
    if (promoCode && originalAmount && originalAmount > amount) {
      const discount = originalAmount - amount;
      const discountPercentage = Math.round((discount / originalAmount) * 100);
      itemDescription += ` (${discountPercentage}% off with ${promoCode})`;
      transactionDescription += ` with ${promoCode} discount (${discountPercentage}% off)`;
    }

    const create_payment_json = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal',
      },
      redirect_urls: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/postcheckout`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout`,
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: itemDescription,
                sku: `${planType}${promoCode ? '_' + promoCode : ''}`,
                price: amount.toFixed(2),
                currency: 'USD',
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: 'USD',
            total: amount.toFixed(2),
          },
          description: transactionDescription,
          // Add custom data for tracking
          custom: JSON.stringify({
            planType,
            promoCode: promoCode || null,
            originalAmount: originalAmount || amount,
            finalAmount: amount,
            discountApplied: promoCode && originalAmount ? originalAmount - amount : 0
          }),
        },
      ],
    };

    console.log('PayPal create_payment_json:', JSON.stringify(create_payment_json, null, 2));

    return new Promise<NextResponse>((resolve) => {
      paypal.payment.create(create_payment_json, function (error: any, payment: any) {
        if (error) {
          console.error('PayPal payment creation error:', error.response ? JSON.stringify(error.response, null, 2) : error);
          resolve(NextResponse.json(
            { error: 'Failed to create PayPal order', details: error.response ? error.response.details : error.message },
            { status: 500 }
          ));
        } else {
          console.log('PayPal payment created successfully:', JSON.stringify(payment, null, 2));
          for (let i = 0; i < payment.links.length; i++) {
            if (payment.links[i].rel === 'approval_url') {
              console.log('Approval URL found:', payment.links[i].href);
              resolve(NextResponse.json({ approvalUrl: payment.links[i].href, id: payment.id }));
              return;
            }
          }
          console.error('Approval URL not found in PayPal payment response.');
          resolve(NextResponse.json(
            { error: 'Approval URL not found in PayPal response' },
            { status: 500 }
          ));
        }
      });
    });
  } catch (error) {
    console.error('Unexpected error in create order route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


