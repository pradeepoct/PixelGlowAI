import { createClient } from '@/utils/supabase/server';

export default async function DebugPage() {
  let envVarsStatus = {};
  let supabaseStatus = {};
  
  // Check environment variables
  try {
    envVarsStatus = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'MISSING',
      NOREPLY_EMAIL: process.env.NOREPLY_EMAIL ? 'SET' : 'MISSING',
    };
  } catch (error) {
    envVarsStatus = { error: String(error) };
  }

  // Test Supabase connection
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    supabaseStatus = {
      connection: 'SUCCESS',
      error: error?.message || 'None',
      hasUser: !!data.user
    };
  } catch (error) {
    supabaseStatus = {
      connection: 'FAILED',
      error: String(error)
    };
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Information</h1>
      
      <h2>Environment Variables Status:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        {JSON.stringify(envVarsStatus, null, 2)}
      </pre>

      <h2>Supabase Connection Status:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        {JSON.stringify(supabaseStatus, null, 2)}
      </pre>

      <h2>Node Environment:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        NODE_ENV: {process.env.NODE_ENV || 'undefined'}
        VERCEL: {process.env.VERCEL || 'undefined'}
      </pre>
    </div>
  );
}