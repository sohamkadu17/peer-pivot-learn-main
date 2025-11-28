import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video, ExternalLink, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: string;
  title: string;
  subject_id: string;
  scheduled_time: string;
  duration: number;
  status: string;
  meeting_link?: string;
  video_room_id?: string;
  teacher_id: string;
  student_id: string;
  subject?: {
    name: string;
  };
}

export default function UpcomingSessions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUpcomingSessions();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('sessions_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'sessions',
            filter: `teacher_id=eq.${user.id}` 
          }, 
          () => {
            fetchUpcomingSessions();
          }
        )
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'sessions',
            filter: `student_id=eq.${user.id}` 
          }, 
          () => {
            fetchUpcomingSessions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUpcomingSessions = async () => {
    try {
      console.log('🔍 Fetching upcoming sessions for user:', user?.id);
      const now = new Date().toISOString();
      console.log('📅 Current time:', now);
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          subject:subjects(name)
        `)
        .or(`teacher_id.eq.${user?.id},student_id.eq.${user?.id}`)
        .gte('scheduled_time', now)
        .order('scheduled_time', { ascending: true })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching sessions:', error);
        throw error;
      }
      
      console.log('✅ Upcoming sessions fetched:', data?.length || 0, 'sessions found');
      console.log('📋 Session data:', data);
      
      if (data && data.length === 0) {
        console.log('⚠️  No sessions found. Checking all sessions in database...');
        
        // Debug query - check all sessions for this user
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('id, title, scheduled_time, status, teacher_id, student_id')
          .or(`teacher_id.eq.${user?.id},student_id.eq.${user?.id}`);
        
        console.log('📊 All sessions for user (past and future):', allSessions);
      }
      
      setSessions(data || []);
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyRoomId = (roomId: string) => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoomId(roomId);
    toast({
      title: 'Room ID Copied!',
      description: 'You can now share this with your peer or use it to join the video call.',
    });
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  const joinVideoCall = (roomId: string) => {
    navigate(`/video-call?sessionId=${roomId}`);
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case 'ongoing':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Ongoing</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="card-clean">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="card-clean">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No upcoming sessions scheduled</p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/find-mentor')}
              >
                Find a Mentor
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/become-mentor')}
              >
                Become a Mentor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-clean">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            Upcoming Sessions
          </div>
          <Badge variant="outline" className="text-xs">
            {sessions.length} session{sessions.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">{session.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="h-3 w-3" />
                    <span>{session.subject?.name || 'No subject'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDateTime(session.scheduled_time)}</span>
                    <span className="text-xs">({session.duration} min)</span>
                  </div>
                  
                  {/* Video Room ID Display */}
                  {session.video_room_id && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <Video className="h-3 w-3 text-blue-600" />
                      <code className="text-xs font-mono text-blue-700 dark:text-blue-300">
                        {session.video_room_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-auto"
                        onClick={() => copyRoomId(session.video_room_id!)}
                      >
                        {copiedRoomId === session.video_room_id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(session.status)}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {session.video_room_id && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => joinVideoCall(session.video_room_id!)}
                  >
                    <Video className="mr-2 h-3 w-3" />
                    Join Video Call
                  </Button>
                )}
                
                {session.meeting_link && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(session.meeting_link, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Open Google Meet
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}