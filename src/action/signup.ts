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
  console.log('🚀 Starting signup process...');
  
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    console.log('📧 Email:', email ? 'provided' : 'missing');
    console.log('🔐 Password:', password ? 'provided' : 'missing');

    // Validate input
    if (!email || !password) {
      console.error('❌ Missing email or password');
      return redirect(`/signup?message=${encodeURIComponent("Email and password are required.")}`);
    }

    // Validate environment variables
    console.log('🔍 Checking environment variables...');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return redirect(`/signup?message=${encodeURIComponent("Service configuration error. Please try again later.")}`);
    }

    console.log('🔗 Creating Supabase client...');
    const supabase = createClient();

    console.log('📝 Attempting Supabase signup...');
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('❌ Supabase signup error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
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
      console.error('❌ No user data returned from signup');
      return redirect(`/signup?message=${encodeURIComponent("Signup failed. Please try again.")}`);
    }

    console.log('✅ User created successfully:', signUpData.user.id);

    // TEMPORARILY SKIP userTable update to isolate the issue
    console.log('⚠️ Skipping userTable update temporarily for debugging');
    
    /*
    // Try to update userTable, but don't fail signup if this fails
    console.log('💾 Updating userTable...');
    try {
      const { error: updateError } = await supabase
        .from("userTable")
        .upsert({ id: signUpData.user.id, email })
        .select();

      if (updateError) {
        console.error("⚠️ Error updating userTable:", updateError);
        // Continue with signup even if userTable update fails
      } else {
        console.log('✅ UserTable updated successfully');
      }
    } catch (updateError) {
      console.error("⚠️ Exception updating userTable:", updateError);
      // Continue with signup even if userTable update fails
    }
    */

    // TEMPORARILY SKIP email sending
    console.log('⚠️ Skipping email sending temporarily for debugging');
    /*
    // Send welcome email in background (don't await to avoid blocking)
    console.log('📨 Sending welcome email...');
    sendWelcomeEmailAsync(email).catch(err => {
      console.error('Background email error:', err);
    });
    */

    console.log('🎉 Signup completed! Redirecting to /forms?signupCompleted');
    return redirect("/forms?signupCompleted");
  } catch (error) {
    console.error('💥 Unexpected error in signup:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return redirect(`/signup?message=${encodeURIComponent("An unexpected error occurred. Please try again.")}`);
  }
} 