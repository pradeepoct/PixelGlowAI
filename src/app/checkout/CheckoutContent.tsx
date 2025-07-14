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

interface PromoCode {
  code: string;
  discount: number; // percentage
  description: string;
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

// Available promotional codes
const promoCodes: PromoCode[] = [
  { code: 'SAVE10', discount: 10, description: '10% off your order' },
  { code: 'WELCOME20', discount: 20, description: '20% off for new customers' },
  { code: 'PIXEL15', discount: 15, description: '15% off special offer' },
  { code: 'LAUNCH50', discount: 50, description: '50% off launch special' },
];

export default function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlanName = searchParams.get('plan') || 'basic';
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

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

  // Calculate discounted price
  const getDiscountedPrice = () => {
    if (!selectedPlan || !appliedPromo) return selectedPlan?.price || 0;
    const discount = (selectedPlan.price * appliedPromo.discount) / 100;
    return selectedPlan.price - discount;
  };

  const getFinalPrice = () => {
    return getDiscountedPrice();
  };

  // Apply promotional code
  const applyPromoCode = () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promotional code');
      return;
    }

    setIsApplyingPromo(true);
    setPromoError('');

    // Simulate API call delay
    setTimeout(() => {
      const foundPromo = promoCodes.find(
        (promo) => promo.code.toLowerCase() === promoCode.toLowerCase()
      );

      if (foundPromo) {
        setAppliedPromo(foundPromo);
        setPromoError('');
        toast.success(`🎉 Promo code applied! ${foundPromo.discount}% off`);
      } else {
        setPromoError('Invalid promotional code');
        setAppliedPromo(null);
      }
      setIsApplyingPromo(false);
    }, 500);
  };

  // Remove promotional code
  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
    toast.info('Promotional code removed');
  };

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
      const finalAmount = getFinalPrice();
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: selectedPlan.name,
          amount: finalAmount, // Use discounted price
          promoCode: appliedPromo?.code || null,
          originalAmount: selectedPlan.price,
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

          <div className="text-gray-800 border-t pt-4">
            <p className="text-sm line-through text-gray-500">Original Price: ${selectedPlan.price * 2}.00</p>
            <p className="text-lg font-medium">Price: ${selectedPlan.price}.00</p>
            
            {/* Promotional Code Section */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Promotional Code</h3>
              
              {!appliedPromo ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isApplyingPromo}
                    />
                    <button
                      onClick={applyPromoCode}
                      disabled={isApplyingPromo || !promoCode.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isApplyingPromo ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-red-500 text-xs">{promoError}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Try: SAVE10, WELCOME20, PIXEL15, or LAUNCH50
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      🎉 {appliedPromo.code} Applied!
                    </p>
                    <p className="text-xs text-green-600">{appliedPromo.description}</p>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="mt-4 space-y-2">
              {appliedPromo && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${selectedPlan.price}.00</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedPromo.discount}%):</span>
                    <span>-${((selectedPlan.price * appliedPromo.discount) / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>${getFinalPrice().toFixed(2)}</span>
              </div>
            </div>
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


