import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, User, BookOpen, Copy, Check, Video } from 'lucide-react';

interface SessionRequest {
  id: string;
  student_id: string;
  mentor_id: string;
  title: string;
  description: string;
  requested_time: string;
  duration: number;
  status: string;
  video_room_id: string | null;
  created_at: string;
  subject_id: string;
  student: {
    username: string;
  };
  mentor: {
    username: string;
  };
  subject: {
    name: string;
  };
}

export const ApprovedSessions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchApprovedSessions();
      subscribeToSessions();
    }
  }, [user]);

  const fetchApprovedSessions = async () => {
    try {
      console.log('📋 Fetching approved sessions for user:', user?.id);
      
      // Get approved session requests
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('session_requests')
        .select('*')
        .or(`student_id.eq.${user?.id},mentor_id.eq.${user?.id}`)
        .eq('status', 'approved')
        .gte('requested_time', new Date().toISOString())
        .order('requested_time', { ascending: true });

      if (sessionsError) throw sessionsError;
      
      if (!sessionsData || sessionsData.length === 0) {
        console.log('⚠️  No approved sessions found');
        setSessions([]);
        return;
      }

      // Get all user profiles
      const userIds = [...new Set([
        ...sessionsData.map(s => s.student_id),
        ...sessionsData.map(s => s.mentor_id)
      ])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      // Get subjects
      const subjectIds = [...new Set(sessionsData.map(s => s.subject_id).filter(Boolean))];
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

      // Combine data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const subjectMap = new Map(subjects?.map(s => [s.id, s]) || []);

      const data = sessionsData.map(session => ({
        ...session,
        student: profileMap.get(session.student_id),
        mentor: profileMap.get(session.mentor_id),
        subject: subjectMap.get(session.subject_id),
      }));

      const error = null;

      if (error) {
        console.error('❌ Error fetching approved sessions:', error);
        throw error;
      }
      console.log('✅ Approved sessions fetched:', data?.length || 0);
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching approved sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSessions = () => {
    console.log('🔔 Setting up approved sessions subscription for user:', user?.id);
    
    const channel = supabase
      .channel(`approved_sessions_${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_requests',
        },
        (payload) => {
          console.log('📬 Session request change detected:', payload);
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Check if this update involves current user
          if (newData && (newData.student_id === user?.id || newData.mentor_id === user?.id)) {
            // If status changed to approved
            if (payload.eventType === 'UPDATE' && 
                newData.status === 'approved' && 
                oldData?.status === 'pending') {
              console.log('🎉 Session approved with room ID:', newData.video_room_id);
              toast({
                title: '✅ Session Approved!',
                description: `${newData.title} - Room ID: ${newData.video_room_id}`,
                duration: 5000,
              });
            }
            fetchApprovedSessions();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Approved sessions subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from approved sessions');
      supabase.removeChannel(channel);
    };
  };

  const copyRoomId = (roomId: string) => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoomId(roomId);
    toast({
      title: 'Room ID Copied! 📋',
      description: 'You can now share this with your peer or use it to join the video call.',
    });
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  const joinVideoCall = (roomId: string) => {
    navigate(`/video-call?sessionId=${roomId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading sessions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-500" />
          Approved Sessions
          {sessions.length > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {sessions.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sessions approved and ready to start - Room IDs are visible below
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No approved sessions yet. Schedule a session to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isStudent = session.student_id === user?.id;
              const peerName = isStudent ? session.mentor?.username : session.student?.username;
              const peerRole = isStudent ? 'Mentor' : 'Student';

              return (
                <Card key={session.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{session.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="w-4 h-4" />
                            <span>{peerName} ({peerRole})</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {session.subject?.name}
                        </Badge>
                      </div>

                      {/* Description */}
                      {session.description && (
                        <p className="text-sm text-muted-foreground">{session.description}</p>
                      )}

                      {/* Date and Time */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(session.requested_time), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(session.requested_time), 'h:mm a')}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {session.duration} min
                        </Badge>
                      </div>

                      {/* Room ID */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span>{format(new Date(session.requested_time), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span>{format(new Date(session.requested_time), 'p')}</span>
                          <span className="text-muted-foreground">
                            ({session.duration} min)
                          </span>
                        </div>
                      </div>

                      {/* Room ID Display - Only shown after approval */}
                      {session.video_room_id && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                Room ID:
                              </span>
                              <code className="text-sm font-mono font-semibold text-green-800 dark:text-green-200">
                                {session.video_room_id}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => copyRoomId(session.video_room_id!)}
                            >
                              {copiedRoomId === session.video_room_id ? (
                                <>
                                  <Check className="w-4 h-4 mr-1 text-green-600" />
                                  <span className="text-xs">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Copy</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                            💡 Share this Room ID with your peer or click "Join Video Call" when it's time
                          </p>
                        </div>
                      )}

                      {/* Action Button */}
                      {session.video_room_id && (
                        <Button
                          className="w-full"
                          onClick={() => joinVideoCall(session.video_room_id!)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Video Call
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
