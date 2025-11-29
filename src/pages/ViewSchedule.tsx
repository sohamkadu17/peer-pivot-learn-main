import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, Video, User, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import SessionConfirmation from '@/components/SessionConfirmation';

interface Session {
  id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  status: string;
  subject: string;
  meeting_link: string;
  teacher_id: string;
  student_id: string;
  google_event_id?: string;
}

interface Profile {
  user_id: string;
  username: string;
  college_email: string;
}

export default function ViewSchedule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingSession, setConfirmingSession] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .or(`teacher_id.eq.${user.id},student_id.eq.${user.id}`)
        .order('start_ts', { ascending: true });

      if (error) throw error;
      
      setSessions(data || []);

      // Fetch profiles for all users in sessions
      if (data) {
        const userIds = Array.from(new Set([
          ...data.map(s => s.teacher_id),
          ...data.map(s => s.student_id)
        ]));

        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, username, college_email')
          .in('user_id', userIds);

        if (profileData) {
          const profileMap = profileData.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as Record<string, Profile>);
          setProfiles(profileMap);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.teacher_id !== user?.id) return;

    setConfirmingSession(sessionId);
    
    try {
      const teacherProfile = profiles[session.teacher_id];
      const studentProfile = profiles[session.student_id];

      const { data, error } = await supabase.functions.invoke('calendar-create-event', {
        body: {
          sessionId,
          teacherEmail: teacherProfile?.college_email || user?.email,
          studentEmail: studentProfile?.college_email,
        },
      });

      if (error) throw error;

      toast({
        title: 'Session Confirmed!',
        description: 'Calendar event created with Google Meet link',
      });

      // Refresh sessions
      fetchSessions();
    } catch (error: any) {
      toast({
        title: 'Confirmation Failed',
        description: error.message || 'Failed to confirm session',
        variant: 'destructive',
      });
    } finally {
      setConfirmingSession(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Time TBD';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPartnerName = (session: Session) => {
    const partnerId = session.teacher_id === user?.id ? session.student_id : session.teacher_id;
    const partner = profiles[partnerId];
    return partner?.username || 'Unknown User';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading schedule...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-magic">My Schedule</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {sessions.length === 0 ? (
          <Card className="card-clean text-center">
            <CardContent className="py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sessions scheduled yet</h3>
              <p className="text-muted-foreground mb-4">
                Find a mentor or become one to start scheduling study sessions.
              </p>
              <Button onClick={() => navigate('/find-mentor')} className="btn-primary">
                Find a Mentor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="card-clean">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {session.title}
                      </CardTitle>
                       <CardDescription>
                        Study session with {getPartnerName(session)}
                       </CardDescription>
                    </div>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Subject:</strong> {session.subject || 'General'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>When:</strong> {formatDateTime(session.start_ts)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Role:</strong> {session.teacher_id === user?.id ? 'Teaching' : 'Learning'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {session.meeting_link && (session.status === 'confirmed' || session.status === 'scheduled') && (
                        <Button
                          onClick={() => window.open(session.meeting_link, '_blank')}
                          className="btn-primary"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          Join Meeting
                        </Button>
                      )}
                      
                      {session.status === 'requested' && session.teacher_id === user?.id && (
                        <Button
                          onClick={() => handleConfirmSession(session.id)}
                          disabled={confirmingSession === session.id}
                          className="btn-primary"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {confirmingSession === session.id ? 'Confirming...' : 'Confirm & Create Meeting'}
                        </Button>
                      )}
                      
                      {session.status === 'requested' && session.student_id === user?.id && (
                        <Badge variant="outline" className="self-start">
                          Waiting for teacher confirmation
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}