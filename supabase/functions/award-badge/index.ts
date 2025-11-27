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

    const { eventType, metadata } = await req.json();

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log event
    await supabaseClient.from('user_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata: metadata || {},
    });

    // Check badges to award based on event
    const { data: badges } = await supabaseClient
      .from('badge_types')
      .select('*');

    const newBadges = [];

    for (const badge of badges || []) {
      // Check if user already has this badge
      const { data: existingBadge } = await supabaseClient
        .from('user_badges')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_id', badge.id)
        .maybeSingle();

      if (existingBadge) continue;

      let shouldAward = false;
      const metric = badge.condition_metric;
      const target = badge.condition_value;

      // Check conditions
      if (metric === 'sessions_completed' && profile.total_sessions_taught >= target) {
        shouldAward = true;
      } else if (metric === 'sessions_attended' && profile.total_sessions_attended >= target) {
        shouldAward = true;
      } else if (metric === 'doubts_answered') {
        const { count } = await supabaseClient
          .from('doubts')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .eq('is_resolved', true);
        if ((count || 0) >= target) shouldAward = true;
      } else if (metric === 'materials_shared') {
        const { count } = await supabaseClient
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user.id);
        if ((count || 0) >= target) shouldAward = true;
      } else if (metric === 'contribution_score' && profile.contribution_score >= target) {
        shouldAward = true;
      } else if (metric === 'points' && profile.credits >= target) {
        shouldAward = true;
      }

      if (shouldAward) {
        await supabaseClient.from('user_badges').insert({
          user_id: user.id,
          badge_id: badge.id,
        });
        newBadges.push(badge);
      }
    }

    // Update contribution score
    const score = 
      (profile.credits || 0) +
      (10 * (profile.total_sessions_taught || 0)) +
      (5 * (profile.total_sessions_attended || 0));

    await supabaseClient
      .from('profiles')
      .update({ contribution_score: score })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true, newBadges }),
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