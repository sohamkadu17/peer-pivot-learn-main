import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl?.replace('/functions/v1', '')}/dashboard?google=error&message=${encodeURIComponent(error)}`,
        },
      });
    }

    if (!code || !state) {
      return new Response('Missing code or state parameter', { status: 400 });
    }

    // Parse state to get user ID
    const [stateParam, userId] = state.split('|');
    if (!userId) {
      return new Response('Invalid state parameter', { status: 400 });
    }

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!googleClientId || !googleClientSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${supabaseUrl}/functions/v1/google-auth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${supabaseUrl?.replace('//', '//').replace('::', '://')}/dashboard?google=error`,
        },
      });
    }

    const tokens = await tokenResponse.json();
    
    if (!tokens.refresh_token) {
      console.warn('No refresh token received - user may have already granted consent');
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Encrypt refresh token (simple base64 encoding for now - in production use proper encryption)
    const encryptedToken = tokens.refresh_token ? btoa(tokens.refresh_token) : null;

    // Update user profile with Google credentials
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_refresh_token: encryptedToken,
        google_connected_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to save tokens:', updateError);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${supabaseUrl?.replace('//', '//').replace('::', '://')}/dashboard?google=error`,
        },
      });
    }

    console.log('Google Calendar connected for user:', userId);

    // Redirect to dashboard with success
    const baseUrl = supabaseUrl?.replace('supabase.co', 'supabase.co');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl?.replace('/functions/v1', '')}/dashboard?google=connected`,
      },
    });
  } catch (error) {
    console.error('Error in google-auth-callback:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').replace('::', '://')}/dashboard?google=error`,
      },
    });
  }
});