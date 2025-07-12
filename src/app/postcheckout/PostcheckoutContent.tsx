// app/postcheckout/PostcheckoutContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyPayment } from "@/action/verifyPayment";

export default function PostcheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPayment = async () => {
      // Check for PayPal orderID (new) or Stripe session_id (legacy)
      const orderID = searchParams.get("orderID");
      const sessionId = searchParams.get("session_id");
      const success = searchParams.get("success");

      // If success=true and orderID exists, it's a PayPal payment
      if (success === "true" && orderID) {
        try {
          const result = await verifyPayment(orderID);

          if (result.success) {
            setPaymentStatus("paid");
            console.log("PayPal payment successful", result);
            // Redirect to dashboard after a short delay
            setTimeout(() => router.push("/upload"), 2000);
          } else {
            setPaymentStatus(result.status);
          }
        } catch (error) {
          setPaymentStatus("error");
          setError(
            error instanceof Error ? error.message : "Unknown error occurred"
          );
        }
      } 
      // Legacy Stripe support (if session_id exists)
      else if (sessionId) {
        try {
          const result = await verifyPayment(sessionId);

          if (result.success) {
            setPaymentStatus("paid");
            console.log("Stripe payment successful", result);
            // Redirect to dashboard after a short delay
            setTimeout(() => router.push("/upload"), 2000);
          } else {
            setPaymentStatus(result.status);
          }
        } catch (error) {
          setPaymentStatus("error");
          setError(
            error instanceof Error ? error.message : "Unknown error occurred"
          );
        }
      } else {
        setError("No payment ID provided");
      }
    };

    checkPayment();
  }, [searchParams, router]);

  if (paymentStatus === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-mainBlack text-mainWhite">
        <div className="loader mb-8"></div>
        <h2 className="text-2xl font-bold mb-4 text-center text-mainOrange">
          Confirming payment
        </h2>
        <p className="text-lg text-mainWhite text-center">
          Please do not close or reload this page
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-mainBlack text-mainWhite">
      {paymentStatus === "paid" || paymentStatus === "COMPLETED" ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-mainGreen">
            Payment Successful!
          </h2>
          <p className="text-lg text-mainWhite mb-4">
            Thank you for your purchase! Your AI headshots are being generated.
          </p>
          <p className="text-sm text-mainWhite">
            Redirecting you to the upload page...
          </p>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-mainOrange">
            Payment Failed
          </h2>
          <p className="text-lg text-mainWhite">Please try again</p>
          {error && <p className="mt-2 text-mainOrange">{error}</p>}
          <button 
            onClick={() => router.push("/checkout")}
            className="mt-4 px-6 py-2 bg-mainOrange text-mainBlack rounded hover:bg-opacity-80"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

