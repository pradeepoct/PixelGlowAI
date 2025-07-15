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

    // Enhanced environment validation with actual values for debugging
    console.log('🔍 Checking environment variables...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
    
    // Log partial URL for debugging (without exposing full credentials)
    if (supabaseUrl) {
      const urlParts = supabaseUrl.split('.');
      console.log('Supabase URL pattern:', urlParts.length > 1 ? `${urlParts[0]}.***` : 'Invalid URL format');
    }
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return redirect(`/signup?message=${encodeURIComponent("Service configuration error. Please contact support.")}`);
    }

    // Validate URL format
    if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('localhost')) {
      console.error('❌ Invalid Supabase URL format:', supabaseUrl);
      return redirect(`/signup?message=${encodeURIComponent("Service configuration error. Invalid URL format.")}`);
    }

    console.log('🔗 Creating Supabase client...');
    const supabase = createClient();

    // Test connectivity first
    console.log('🔬 Testing Supabase connectivity...');
    try {
      // Simple test to check if Supabase is reachable
      await supabase.from('userTable').select('count', { count: 'exact', head: true });
      console.log('✅ Supabase connectivity test passed');
    } catch (connectivityError) {
      console.error('❌ Supabase connectivity test failed:', connectivityError);
      return redirect(`/signup?message=${encodeURIComponent("Service temporarily unavailable. Please try again later.")}`);
    }

    console.log('📝 Attempting Supabase signup...');
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      }
    });

    if (error) {
      console.error('❌ Supabase signup error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
        cause: error.cause
      });
      
      let errorMessage = "An error occurred during signup.";
      
      // Handle specific error types
      if (error.message && error.message.includes('JSON input')) {
        console.error('🚨 JSON parsing error detected - likely connectivity or configuration issue');
        errorMessage = "Service connectivity issue. Please try again in a few minutes.";
      } else if (error instanceof AuthError) {
        switch (error.status) {
          case 400:
            errorMessage = "Invalid email or password format.";
            break;
          case 422:
            errorMessage = "Email already in use.";
            break;
          case 429:
            errorMessage = "Too many signup attempts. Please try again later.";
            break;
          default:
            errorMessage = error.message || "Authentication service error.";
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message || "Unexpected error occurred.";
      } else {
        errorMessage = "Authentication service error.";
      }
      
      // Fixed: redirect to signup page (not login)
      return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
    }

    if (!signUpData.user) {
      console.error('❌ No user data returned from signup');
      return redirect(`/signup?message=${encodeURIComponent("Signup failed. Please try again.")}`);
    }

    console.log('✅ User created successfully:', signUpData.user.id);

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

    // Send welcome email in background (don't await to avoid blocking)
    console.log('📨 Sending welcome email...');
    sendWelcomeEmailAsync(email).catch(err => {
      console.error('Background email error:', err);
    });

    console.log('🎉 Signup completed! Redirecting to /forms?signupCompleted');
    return redirect("/forms?signupCompleted");
  } catch (error) {
    console.error('💥 Unexpected error in signup:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Enhanced error message for debugging
    let errorMessage = "An unexpected error occurred. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        errorMessage = "Service connectivity issue. Please check your internet connection and try again.";
      } else if (error.message.includes('fetch')) {
        errorMessage = "Network error. Please try again in a few minutes.";
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as any;
      if (errorObj.message?.includes('JSON')) {
        errorMessage = "Service connectivity issue. Please check your internet connection and try again.";
      } else if (errorObj.message?.includes('fetch')) {
        errorMessage = "Network error. Please try again in a few minutes.";
      }
    }
    
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }
} 