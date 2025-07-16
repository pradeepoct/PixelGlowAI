import { NextResponse } from "next/server";

export async function GET() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    vercel_env: process.env.VERCEL_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? {
        exists: true,
        length: supabaseUrl.length,
        starts_with: supabaseUrl.substring(0, 8),
        ends_with: supabaseUrl.substring(supabaseUrl.length - 3),
        format_check: supabaseUrl.includes('supabase.co') ? 'VALID' : 'INVALID'
      } : { exists: false },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? {
        exists: true,
        length: supabaseKey.length,
        starts_with: supabaseKey.substring(0, 8),
        format_check: supabaseKey.startsWith('eyJ') ? 'VALID' : 'INVALID'
      } : { exists: false }
    }
  });
}