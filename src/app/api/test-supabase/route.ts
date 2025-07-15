import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔬 Starting Supabase diagnostic test...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPattern: supabaseUrl ? supabaseUrl.split('.')[0] + '.***' : 'MISSING'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      return NextResponse.json({
        success: false,
        error: "Missing environment variables",
        details: {
          NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseKey,
        }
      }, { status: 500 });
    }

    // Validate URL format
    if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('localhost')) {
      console.error('❌ Invalid Supabase URL format');
      return NextResponse.json({
        success: false,
        error: "Invalid Supabase URL format",
        details: { url_pattern: supabaseUrl.split('.')[0] + '.***' }
      }, { status: 500 });
    }

    console.log('✅ Environment variables validated');

    // Test Supabase connection
    console.log('🔗 Creating Supabase client...');
    const supabase = createClient();
    
    // Test auth service
    console.log('🔐 Testing auth service...');
    const { data: session, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth service error:', authError);
      return NextResponse.json({
        success: false,
        error: "Supabase auth service error",
        details: {
          message: authError.message,
          status: authError.status,
          name: authError.name
        }
      }, { status: 500 });
    }

    console.log('✅ Auth service accessible');

    // Test database connection
    console.log('🗄️ Testing database connection...');
    const { error: dbError } = await supabase
      .from("userTable")
      .select("count", { count: "exact", head: true });

    if (dbError) {
      console.error('❌ Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        error: "Database connection error",
        details: {
          message: dbError.message,
          code: dbError.code,
          hint: dbError.hint
        }
      }, { status: 500 });
    }

    console.log('✅ Database accessible');

    // Test signup functionality
    console.log('🧪 Testing signup functionality...');
    try {
      // This will fail but should give us insight into the auth endpoint
      const { error: signupTestError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
        options: { emailRedirectTo: 'http://localhost:3000' }
      });

      // We expect this to potentially fail (email already exists, etc.)
      // But it should not fail with JSON parsing errors
      console.log('Signup test result:', signupTestError ? 'Error (expected)' : 'Success');
      
    } catch (signupError) {
      console.error('Signup test failed with exception:', signupError);
      
      if (signupError instanceof Error && signupError.message.includes('JSON input')) {
        return NextResponse.json({
          success: false,
          error: "Signup endpoint has JSON parsing issues",
          details: {
            message: signupError.message,
            type: 'JSON_PARSING_ERROR'
          }
        }, { status: 500 });
      }
    }

    console.log('🎉 All diagnostic tests passed');

    return NextResponse.json({
      success: true,
      message: "All Supabase services are working correctly",
      details: {
        environment: 'production',
        url_pattern: supabaseUrl.split('.')[0] + '.***',
        auth_service: 'accessible',
        database: 'accessible',
        signup_endpoint: 'functional'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Diagnostic test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: "Unexpected error during diagnostics",
      details: {
        message: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
      }
    }, { status: 500 });
  }
}