import { supabase } from '@/integrations/supabase/client';

interface SessionReminderData {
  sessionId: string;
  title: string;
  mentorName: string;
  studentName: string;
  scheduledTime: string;
  duration: number;
  roomId: string;
  recipientEmail: string;
  recipientName: string;
  role: 'student' | 'mentor';
}

export const sendSessionReminderEmail = async (data: SessionReminderData) => {
  try {
    const formattedTime = new Date(data.scheduledTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .room-id { background: #667eea; color: white; padding: 10px 15px; border-radius: 5px; font-family: monospace; font-size: 16px; display: inline-block; margin: 10px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Session Reminder</h1>
              <p>Your learning session is coming up soon!</p>
            </div>
            <div class="content">
              <p>Hi ${data.recipientName},</p>
              <p>This is a friendly reminder about your upcoming peer learning session.</p>
              
              <div class="session-details">
                <h3>📚 ${data.title}</h3>
                <div class="detail-row">
                  <span class="label">🕒 Time:</span> ${formattedTime}
                </div>
                <div class="detail-row">
                  <span class="label">⏱️ Duration:</span> ${data.duration} minutes
                </div>
                <div class="detail-row">
                  <span class="label">${data.role === 'student' ? '👨‍🏫 Mentor:' : '👨‍🎓 Student:'}</span> 
                  ${data.role === 'student' ? data.mentorName : data.studentName}
                </div>
                
                <div style="margin-top: 20px;">
                  <strong>🔑 Room ID:</strong>
                  <div class="room-id">${data.roomId}</div>
                </div>
              </div>
              
              <p><strong>How to Join:</strong></p>
              <ol>
                <li>Go to your PeerPivot dashboard</li>
                <li>Find the session in "Approved Sessions"</li>
                <li>Click "Join Video Call" button</li>
                <li>Or paste the Room ID directly: <code>${data.roomId}</code></li>
              </ol>
              
              <div style="text-align: center;">
                <a href="https://your-app-url.com/dashboard" class="button">Go to Dashboard</a>
              </div>
              
              <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                ⚠️ <strong>Tip:</strong> Make sure to test your camera and microphone before the session starts!
              </p>
            </div>
            <div class="footer">
              <p>PeerPivot - Learn Together, Grow Together</p>
              <p>You're receiving this because you have an upcoming session.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: result, error } = await supabase.functions.invoke('send-email-reminder', {
      body: {
        to: data.recipientEmail,
        subject: `🔔 Reminder: "${data.title}" session starts soon!`,
        html: emailHtml,
        sessionDetails: {
          title: data.title,
          mentorName: data.mentorName,
          studentName: data.studentName,
          scheduledTime: data.scheduledTime,
          duration: data.duration,
          roomId: data.roomId,
        },
      },
    });

    if (error) {
      console.error('❌ Error sending reminder email:', error);
      throw error;
    }

    console.log('✅ Reminder email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    throw error;
  }
};

// Function to schedule reminder for a session (call this after approval)
export const scheduleSessionReminder = async (sessionId: string) => {
  try {
    // Fetch session details
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        student:profiles!sessions_student_id_fkey(user_id, username),
        teacher:profiles!sessions_teacher_id_fkey(user_id, username)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Session not found');
    }

    // Get user emails
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .in('id', [sessionData.student_id, sessionData.teacher_id]);

    if (usersError) {
      console.error('Error fetching user emails:', usersError);
      return;
    }

    // In a real app, you would schedule these emails to be sent 24 hours before
    // For now, we'll just log that reminders should be sent
    console.log('📧 Reminder scheduled for session:', sessionId);
    console.log('   Scheduled time:', sessionData.scheduled_time);
    console.log('   Room ID:', sessionData.video_room_id);

    return { success: true, message: 'Reminder scheduled' };
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
    throw error;
  }
};
