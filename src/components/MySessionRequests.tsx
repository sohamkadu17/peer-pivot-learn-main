import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Clock, User, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SessionRequest {
  id: string;
  student_id: string;
  mentor_id: string;
  title: string;
  description: string;
  requested_time: string;
  duration: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  responded_at: string | null;
  video_room_id: string | null;
  subject_id: string;
  mentor: {
    username: string;
  };
  subject: {
    name: string;
  };
}

export const MySessionRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    if (user) {
      fetchMyRequests();
      subscribeToRequests();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    if (!user?.id) return;

    try {
      console.log('📥 Fetching my session requests:', user.id);
      
      // Get requests where I'm the student
      const { data: requestsData, error: requestsError } = await supabase
        .from('session_requests')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get mentor profiles
      const mentorIds = [...new Set(requestsData.map(r => r.mentor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', mentorIds);

      // Get subjects
      const subjectIds = [...new Set(requestsData.map(r => r.subject_id).filter(Boolean))];
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

      // Combine data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const subjectMap = new Map(subjects?.map(s => [s.id, s]) || []);

      const data = requestsData.map(req => ({
        ...req,
        mentor: profileMap.get(req.mentor_id),
        subject: subjectMap.get(req.subject_id),
      }));

      console.log('✅ My requests fetched:', data.length);
      setRequests(data);
    } catch (error) {
      console.error('❌ Error fetching my requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    const channel = supabase
      .channel(`my_session_requests_${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_requests',
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && newData.student_id === user?.id) {
            if (payload.eventType === 'UPDATE') {
              if (newData.status === 'approved') {
                toast({
                  title: '✅ Session Approved!',
                  description: `Your session "${newData.title}" has been approved by the mentor.`,
                  duration: 5000,
                });
              } else if (newData.status === 'rejected') {
                toast({
                  title: '❌ Session Rejected',
                  description: `Your session "${newData.title}" was rejected. ${newData.rejection_reason ? 'Reason: ' + newData.rejection_reason : ''}`,
                  variant: 'destructive',
                  duration: 7000,
                });
              }
              fetchMyRequests();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading your requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          My Session Requests
        </CardTitle>
        <CardDescription>
          Track the status of your session requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No session requests yet. Schedule a session to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((request) => (
              <Card key={request.id} className={`
                ${request.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''}
                ${request.status === 'approved' ? 'border-l-4 border-l-green-500' : ''}
                ${request.status === 'rejected' ? 'border-l-4 border-l-red-500' : ''}
              `}>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="w-4 h-4" />
                          <span>Mentor: {request.mentor?.username || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(request.status)}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {request.subject?.name || 'N/A'}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    {request.description && (
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                    )}

                    {/* Date and Time */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(request.requested_time), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(request.requested_time), 'h:mm a')}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {request.duration} min
                      </Badge>
                    </div>

                    {/* Status Details */}
                    {request.status === 'approved' && request.video_room_id && (
                      <div className="mt-2 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-green-800">
                          <strong>✅ Approved!</strong> Room ID: <code className="bg-white px-2 py-1 rounded">{request.video_room_id}</code>
                        </p>
                      </div>
                    )}

                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-2 p-3 bg-red-50 rounded-md">
                        <p className="text-sm text-red-800">
                          <strong>❌ Rejection Reason:</strong> {request.rejection_reason}
                        </p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="mt-2 p-3 bg-yellow-50 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>⏳ Waiting for mentor approval...</strong>
                        </p>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <span>Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {request.responded_at && (
                        <span className="ml-4">
                          Responded: {format(new Date(request.responded_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination Controls */}
            {requests.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(requests.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(requests.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(requests.length / itemsPerPage)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
