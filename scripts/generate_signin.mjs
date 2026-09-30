/**
 * Generate sign-in link for Lyrixis using admin SDK
 * Run: node /tmp/generate_signin.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkuvgkjakxkytscfvnkf.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = 'awad+lyrixis-w1@apixis.dev';

try {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: 'https://lyrixis.vercel.app/auth/callback?next=/dashboard'
    }
  });
  
  if (error) throw error;
  
  const hashedToken = data.properties.hashed_token;
  const signinUrl = `https://lyrixis.vercel.app/auth/callback?token_hash=${hashedToken}&type=magiclink&next=/dashboard`;
  
  console.log(JSON.stringify({
    ok: true,
    email,
    hashed_token: hashedToken,
    signin_url: signinUrl
  }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
}
