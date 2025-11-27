import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { badgeId } = await req.json();

    // Get badge and user details
    const { data: badge } = await supabaseClient
      .from('badge_types')
      .select('*')
      .eq('id', badgeId)
      .single();

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!badge || !profile) {
      return new Response(JSON.stringify({ error: 'Badge or profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate certificate HTML (simple version without Puppeteer for now)
    const certificateHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: Georgia, serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .certificate {
              background: white;
              padding: 60px;
              border: 10px solid #FFD700;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { color: #333; font-size: 48px; margin: 20px 0; }
            .recipient { font-size: 36px; color: #667eea; margin: 30px 0; }
            .badge-title { font-size: 28px; color: #764ba2; margin: 20px 0; }
            .date { color: #666; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1>Certificate of Achievement</h1>
            <p>This is to certify that</p>
            <div class="recipient">${profile.username || user.email}</div>
            <p>has earned the</p>
            <div class="badge-title">${badge.title}</div>
            <p>${badge.description}</p>
            <div class="date">Issued on ${new Date().toLocaleDateString()}</div>
          </div>
        </body>
      </html>
    `;

    // Generate share token
    const shareToken = crypto.randomUUID();

    // Create certificate record
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .insert({
        user_id: user.id,
        badge_id: badgeId,
        title: `${badge.title} - ${profile.username || user.email}`,
        share_token: shareToken,
      })
      .select()
      .single();

    if (certError) {
      console.error('Certificate creation error:', certError);
      return new Response(JSON.stringify({ error: certError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        certificate,
        shareUrl: `${Deno.env.get('SUPABASE_URL')}/certificates/${shareToken}`,
        html: certificateHtml 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});