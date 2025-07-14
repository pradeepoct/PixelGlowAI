'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AuthError } from "@supabase/supabase-js";
import { sendEmail } from "./sendEmail";

async function sendWelcomeEmail(email: string) {
  try {
    return await sendEmail({
      to: email,
      from: process.env.NOREPLY_EMAIL || 'noreply@pixelglowai.app',
      templateId: 'welcome',
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't fail signup if email fails
    return { success: false, error: 'Email service unavailable' };
  }
}

export async function signUp(formData: FormData): Promise<never> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return redirect(`/signup?message=${encodeURIComponent("Service configuration error. Please try again later.")}`);
  }

  const supabase = createClient();

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    let errorMessage = "An error occurred during signup.";
    if (error instanceof AuthError) {
      switch (error.status) {
        case 400:
          errorMessage = "Invalid email or password format.";
          break;
        case 422:
          errorMessage = "Email already in use.";
          break;
        default:
          errorMessage = error.message;
      }
    }
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }

  const { error: updateError } = await supabase
    .from("userTable")
    .upsert({ id: signUpData.user?.id, email })
    .select();

  if (updateError) {
    console.error("Error updating userTable:", updateError);
  }

  // Send welcome email (non-blocking)
  await sendWelcomeEmail(email);

  return redirect("/forms?signupCompleted");
} 