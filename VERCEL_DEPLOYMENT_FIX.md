# Vercel Deployment Fix Guide

## Issues Identified

Your Vercel deployment is failing with a JSON parsing error because of several configuration issues:

### 1. Missing Environment Variables
The error occurs because Supabase client initialization is failing due to missing environment variables in Vercel.

### 2. Hardcoded Development URL
Your `next.config.mjs` has a hardcoded development URL that won't work in production.

### 3. Incorrect Output Configuration
The `output: 'standalone'` setting can cause issues with Vercel deployments.

## Fix Steps

### Step 1: Set Environment Variables in Vercel

Go to your Vercel dashboard → Project Settings → Environment Variables and add:

```bash
# Required Supabase Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required Email Variables
RESEND_API_KEY=your_resend_api_key
NOREPLY_EMAIL=noreply@pixelglowai.app

# Optional but recommended
NEXT_PUBLIC_APP_URL=https://your-vercel-app-url.vercel.app
```

**How to find your Supabase credentials:**
1. Go to your Supabase dashboard
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon key

### Step 2: Fix Next.js Configuration

Update your `next.config.mjs` to remove hardcoded URLs and standalone output:

```javascript
/** @type {import("next").NextConfig} */
const nextConfig = {
  // Remove 'output: standalone' for Vercel
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.astria.ai",
        pathname: "/rails/active_storage/blobs/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "sdbooth2-production.s3.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  // Remove the hardcoded env variable
};

export default nextConfig;
```

### Step 3: Add Error Handling to Signup Action

Update your signup action to handle missing environment variables gracefully:

```typescript
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
```

### Step 4: Improve Error Handling in Supabase Middleware

Update your middleware to handle missing environment variables:

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
    }

    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      },
    );

    await supabase.auth.getUser();
    return response;
  } catch (e) {
    console.error('Supabase middleware error:', e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
```

### Step 5: Deployment Steps

1. **Push your code changes** to your repository
2. **Set environment variables** in Vercel dashboard
3. **Redeploy** your application
4. **Test the signup functionality**

### Step 6: Verification

After deployment, verify that:
1. The signup form loads without errors
2. Form submission works correctly
3. Users can successfully create accounts
4. Welcome emails are sent (if Resend is configured)

## Common Troubleshooting

### If you still see the JSON error:
1. Check Vercel function logs for specific error messages
2. Verify all environment variables are correctly set
3. Test Supabase connection from Vercel functions

### If signup fails:
1. Check Supabase project is active and accessible
2. Verify RLS (Row Level Security) policies allow user creation
3. Check userTable exists and has proper permissions

### If emails don't send:
1. Verify Resend API key is valid
2. Check domain verification in Resend dashboard
3. Monitor Resend logs for delivery status

## Security Notes

- Never commit `.env` files to your repository
- Use Vercel's environment variable encryption
- Regularly rotate API keys
- Monitor usage in both Supabase and Resend dashboards

## Need Help?

If you continue to experience issues:
1. Check Vercel function logs
2. Monitor Supabase auth logs
3. Test locally with the same environment variables
4. Contact support with specific error messages and timestamps