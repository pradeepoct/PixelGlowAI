// app/checkout/CheckoutContent.tsx
"use client";

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'sonner';

interface PricingPlan {
  name: string;
  price: number;
  features: string[];
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Basic',
    price: 29,
    features: [
      '3 hours turnaround time',
      '10 headshots',
      'Unique backgrounds and clothing',
    ],
  },
  {
    name: 'Professional',
    price: 39,
    features: [
      '100 headshots',
      'Unique backgrounds and clothing',
    ],
  },
  {
    name: 'Executive',
    price: 59,
    features: [
      '200 headshots',
      'Unique backgrounds and clothing',
    ],
  },
];

export default function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlanName = searchParams.get('plan') || 'basic';
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const plan = pricingPlans.find(
      (p) => p.name.toLowerCase() === selectedPlanName.toLowerCase()
    );
    if (plan) {
      setSelectedPlan(plan);
    } else {
      // Redirect to home or pricing if plan not found
      router.push('/');
    }
  }, [selectedPlanName, router]);

  if (!selectedPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading plan details...
      </div>
    );
  }

  const paypalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    currency: 'USD',
    intent: 'capture',
  };

  const createOrder = async (data: any, actions: any) => {
    setLoading(true);
    console.log("createOrder function called.");
    console.log("PayPal Client ID from env:", process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
    console.log("Data passed to createOrder:", data);
    console.log("Actions passed to createOrder:", actions);

    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: selectedPlan.name,
          amount: selectedPlan.price,
        }),
      });

      const order = await response.json();
      console.log("PayPal create order API response:", order);

      if (response.ok && order.approvalUrl && order.id) {
        setLoading(false);
        // Instead of returning the order ID, we need to redirect to the approval URL
        window.location.href = order.approvalUrl;
        return order.id;
      } else {
        toast.error(order.error || "Failed to create PayPal order.");
        setLoading(false);
        return ""; // Return empty string to prevent PayPal from proceeding
      }
    } catch (error) {
      console.error("Error creating PayPal order:", error);
      toast.error("Failed to create PayPal order. Please try again.");
      setLoading(false);
      return ""; // Return empty string to prevent PayPal from proceeding
    }
  };

  const onApprove = async (data: any, actions: any) => {
    setLoading(true);
    console.log("onApprove function called.", data);
    try {
      const response = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderID: data.orderID, // PayPal's order ID
          payerID: data.payerID, // PayPal's Payer ID
        }),
      });

      const result = await response.json();
      console.log("PayPal capture order API response:", result);

      if (response.ok && result.success) {
        toast.success('Payment successful!');
        router.push(`/postcheckout?orderId=${data.orderID}`); // Redirect to success page
      } else {
        toast.error(result.error || 'Payment failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      toast.error('Failed to process payment. Please try again.');
      setLoading(false);
    }
  };

  const onError = (err: any) => {
    console.error('PayPal onError:', err);
    toast.error('An error occurred with PayPal. Please try again.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl flex flex-col md:flex-row">
        <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Checkout for {selectedPlan.name} Package
          </h1>
          <p className="text-gray-600 mb-6">
            Get {selectedPlan.name} headshots with unique backgrounds and outfits.
          </p>

          <div className="space-y-3 text-gray-700 mb-8">
            {selectedPlan.features.map((feature, index) => (
              <div key={index} className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span>{feature}</span>
              </div>
             ))}
          </div>

          <div className="text-gray-800">
            <p className="text-sm line-through text-gray-500">Original Price: ${selectedPlan.price * 2}.00</p>
            <p className="text-2xl font-bold">Total: ${selectedPlan.price}.00</p>
          </div>
        </div>

        <div className="md:w-1/2 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Select your preferred payment method</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center text-lg font-medium text-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked
                    readOnly
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="ml-3">Pay with PayPal</span>
                </label>
                <Image src="/paypal-logo.png" alt="PayPal" width={80} height={20} />
              </div>

              <div className="mt-6">
                <PayPalScriptProvider options={paypalOptions}>
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'blue' }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onError}
                    disabled={loading}
                  />
                </PayPalScriptProvider>
              </div>

              <div className="mt-4 text-sm text-gray-500 space-y-2">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 text-green-500 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>Secure checkout - PayPal encrypted</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 text-green-500 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>Trusted by more than 100+ customers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


