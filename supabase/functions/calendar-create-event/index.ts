import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshGoogleToken(refreshToken: string) {
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleClientId!,
      client_secret: googleClientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google token');
  }

  return await response.json();
}

async function createGoogleCalendarEvent(
  accessToken: string,
  eventData: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendees: string[];
  }
) {
  const event = {
    summary: eventData.summary,
    description: eventData.description,
    start: {
      dateTime: eventData.start,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: eventData.end,
      timeZone: 'Asia/Kolkata',
    },
    attendees: eventData.attendees.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create calendar event: ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { sessionId, teacherEmail, studentEmail } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is authorized (must be teacher or student)
    if (session.teacher_id !== user.id && session.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to create event for this session' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get teacher's Google credentials
    const { data: teacherProfile, error: teacherError } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('user_id', session.teacher_id)
      .single();

    if (teacherError || !teacherProfile?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Teacher has not connected Google Calendar' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Decrypt refresh token (simple base64 decoding - use proper decryption in production)
    const refreshToken = atob(teacherProfile.google_refresh_token);

    // Refresh Google access token
    const tokens = await refreshGoogleToken(refreshToken);

    // Create calendar event
    const eventData = {
      summary: `Study Circle: ${session.title || session.subject || 'Study Session'}`,
      description: [
        session.description || 'Study session organized through Study Circle',
        '',
        `Subject: ${session.subject || 'General'}`,
        `Duration: ${session.duration || 60} minutes`,
        '',
        'Join via Google Meet link when the session starts.',
        '',
        '📚 Study Circle - Peer-to-Peer Learning Platform',
      ].join('\n'),
      start: session.start_ts,
      end: session.end_ts,
      attendees: [teacherEmail, studentEmail].filter(Boolean),
    };

    const calendarEvent = await createGoogleCalendarEvent(tokens.access_token, eventData);

    // Extract meeting link
    const meetingLink = calendarEvent.hangoutLink || 
      calendarEvent.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
      calendarEvent.htmlLink;

    // Update session with calendar event details
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        google_event_id: calendarEvent.id,
        meeting_link: meetingLink,
        status: 'confirmed'
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session with calendar details:', updateError);
    }

    console.log('Calendar event created for session:', sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        eventId: calendarEvent.id,
        meetingLink,
        eventUrl: calendarEvent.htmlLink,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in calendar-create-event:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});