'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AuthError } from "@supabase/supabase-js";

// Simple background email sending
async function sendWelcomeEmailAsync(email: string) {
  try {
    const { sendEmail } = await import("./sendEmail");
    await sendEmail({
      to: email,
      from: process.env.NOREPLY_EMAIL || 'noreply@pixelglowai.app',
      templateId: 'welcome',
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Email failure should not affect signup
  }
}

export async function signUp(formData: FormData): Promise<never> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Validate input
    if (!email || !password) {
      return redirect(`/signup?message=${encodeURIComponent("Email and password are required.")}`);
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return redirect(`/signup?message=${encodeURIComponent("Service configuration error. Please try again later.")}`);
    }

    const supabase = createClient();

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signup error:', error);
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

    if (!signUpData.user) {
      return redirect(`/signup?message=${encodeURIComponent("Signup failed. Please try again.")}`);
    }

    // Try to update userTable, but don't fail signup if this fails
    try {
      const { error: updateError } = await supabase
        .from("userTable")
        .upsert({ id: signUpData.user.id, email })
        .select();

      if (updateError) {
        console.error("Error updating userTable:", updateError);
        // Continue with signup even if userTable update fails
      }
    } catch (updateError) {
      console.error("Error updating userTable:", updateError);
      // Continue with signup even if userTable update fails
    }

    // Send welcome email in background (don't await to avoid blocking)
    sendWelcomeEmailAsync(email).catch(err => {
      console.error('Background email error:', err);
    });

    return redirect("/forms?signupCompleted");
  } catch (error) {
    console.error('Unexpected error in signup:', error);
    return redirect(`/signup?message=${encodeURIComponent("An unexpected error occurred. Please try again.")}`);
  }
} 