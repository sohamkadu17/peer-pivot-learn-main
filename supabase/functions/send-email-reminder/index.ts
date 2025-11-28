import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Use service role for cron job access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the database function to log reminders
    await supabaseClient.rpc('send_session_reminders')

    // Get sessions that need reminders (within 10 minutes)
    const { data: upcomingSessions, error: queryError } = await supabaseClient
      .from('sessions')
      .select(`
        id,
        scheduled_time,
        duration,
        video_room_id,
        student_id,
        teacher_id,
        subject_id
      `)
      .eq('status', 'scheduled')
      .eq('mentor_approved', true)
      .gt('scheduled_time', new Date().toISOString())
      .lte('scheduled_time', new Date(Date.now() + 10 * 60 * 1000).toISOString())

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`)
    }

    let emailsSent = 0
    const errors = []

    // Send emails for each session
    for (const session of upcomingSessions || []) {
      // Get profiles
      const { data: studentProfile } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('user_id', session.student_id)
        .single()

      const { data: mentorProfile } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('user_id', session.teacher_id)
        .single()

      const { data: subject } = await supabaseClient
        .from('subjects')
        .select('name')
        .eq('id', session.subject_id)
        .single()

      // Get email addresses from auth.users
      const { data: studentAuth } = await supabaseClient.auth.admin.getUserById(session.student_id)
      const { data: mentorAuth } = await supabaseClient.auth.admin.getUserById(session.teacher_id)

      const studentEmail = studentAuth?.user?.email
      const mentorEmail = mentorAuth?.user?.email

      if (!studentEmail || !mentorEmail) {
        errors.push(`Missing email for session ${session.id}`)
        continue
      }

      const sessionData = {
        ...session,
        student: { username: studentProfile?.username },
        teacher: { username: mentorProfile?.username },
        subject: { name: subject?.name }
      }

      // TEMPORARY: Only send to sohamkadu24@gmail.com for Resend free tier testing
      // Send to both users at the Resend-verified email
      try {
        await sendEmail('sohamkadu24@gmail.com', sessionData, 'student')
        emailsSent++
      } catch (error: any) {
        errors.push(`Failed to send to student: ${error.message}`)
      }

      try {
        await sendEmail('sohamkadu24@gmail.com', sessionData, 'mentor')
        emailsSent++
      } catch (error: any) {
        errors.push(`Failed to send to mentor: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        sessionsProcessed: upcomingSessions?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

// Helper function to send email via Resend
async function sendEmail(to: string, session: any, recipientType: 'student' | 'mentor') {
  const scheduledTime = new Date(session.scheduled_time)
  const formattedTime = scheduledTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #667eea; }
        .room-id { font-size: 24px; font-weight: bold; color: #764ba2; margin: 15px 0; padding: 15px; background: #f0f0f0; border-radius: 8px; text-align: center; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Session Reminder</h1>
          <p>Your session starts in 10 minutes!</p>
        </div>
        <div class="content">
          <p>Hi ${recipientType === 'student' ? session.student?.username : session.teacher?.username},</p>
          <p>This is a friendly reminder that your learning session is starting soon.</p>
          
          <div class="session-details">
            <h3>Session Details</h3>
            <div class="detail-row">
              <span class="label">Subject:</span> ${session.subject?.name || 'Not specified'}
            </div>
            <div class="detail-row">
              <span class="label">Time:</span> ${formattedTime}
            </div>
            <div class="detail-row">
              <span class="label">Duration:</span> ${session.duration} minutes
            </div>
            <div class="detail-row">
              <span class="label">${recipientType === 'student' ? 'Mentor' : 'Student'}:</span> ${recipientType === 'student' ? session.teacher?.username : session.student?.username}
            </div>
          </div>

          <div class="room-id">
            Room ID: ${session.video_room_id}
          </div>

          <center>
            <a href="https://your-domain.com/video-room/${session.video_room_id}" class="button">
              🎥 Join Session Now
            </a>
          </center>

          <p style="margin-top: 20px;">Make sure you have a stable internet connection and your camera/microphone are working properly.</p>
        </div>
        <div class="footer">
          <p>PeerPivot - Connecting Students and Mentors</p>
          <p>If you have any questions, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PeerPivot <onboarding@resend.dev>',
      to: [to],
      subject: '🔔 Reminder: Your session starts in 10 minutes!',
      html: html,
    }),
  })

  console.log(`Resend API status: ${response.status}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Resend error:', JSON.stringify(error))
    throw new Error(`Resend API error: ${JSON.stringify(error)}`)
  }

  const result = await response.json()
  console.log('Email sent successfully:', result.id)
  return result
}
