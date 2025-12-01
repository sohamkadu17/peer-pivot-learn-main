import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Clock, User, BookOpen, Check, X, AlertCircle } from 'lucide-react';

interface SessionRequest {
  id: string;
  student_id: string;
  mentor_id: string;
  title: string;
  description: string;
  requested_time: string;
  duration: number;
  status: string;
  created_at: string;
  subject_id: string;
  student: {
    username: string;
    rating: number;
  };
  subject: {
    name: string;
  };
}

export const MentorSessionRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    if (user) {
      console.log('🔍 MentorSessionRequests mounted for user:', user.id);
      fetchRequests();
      const cleanup = subscribeToRequests();
      return cleanup;
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user?.id) {
      console.warn('⚠️ No user ID available');
      return;
    }
    
    try {
      console.log('📥 Fetching session requests for mentor:', user.id);
      
      // First get the requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('session_requests')
        .select('*')
        .eq('mentor_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      
      if (!requestsData || requestsData.length === 0) {
        console.log('⚠️  No pending requests found');
        setRequests([]);
        return;
      }

      // Get student profiles
      const studentIds = [...new Set(requestsData.map(r => r.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, rating')
        .in('user_id', studentIds);

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
        student: profileMap.get(req.student_id),
        subject: subjectMap.get(req.subject_id),
      }));

      const error = null;

      if (error) {
        console.error('❌ Error fetching requests:', error);
        throw error;
      }
      console.log('✅ Session requests fetched:', data?.length || 0, 'pending requests');
      console.log('📋 Requests data:', data);
      setRequests(data || []);
    } catch (error) {
      console.error('❌ Exception fetching requests:', error);
      toast({
        title: 'Error Loading Requests',
        description: 'Failed to load session requests. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    console.log('🔔 Setting up realtime subscription for mentor:', user?.id);
    
    const channel = supabase
      .channel(`session_requests_mentor_${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_requests',
        },
        (payload) => {
          console.log('📬 Session request change detected:', payload);
          
          // Check if this is for current mentor
          const newData = payload.new as any;
          if (newData && newData.mentor_id === user?.id) {
            if (payload.eventType === 'INSERT' && newData.status === 'pending') {
              console.log('🎉 New session request received!', newData);
              toast({
                title: '🔔 New Session Request!',
                description: `${newData.title} - Check your pending requests`,
                duration: 5000,
              });
              fetchRequests();
            } else if (payload.eventType === 'UPDATE') {
              console.log('🔄 Session request updated');
              fetchRequests();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to session_requests changes');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Realtime subscription closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error in realtime subscription');
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from session_requests channel');
      supabase.removeChannel(channel);
    };
  };

  const handleApprove = async (request: SessionRequest) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('session_requests')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Session Approved! ✅',
        description: 'A video room has been created and the student will be notified.',
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve session',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('session_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Session Rejected',
        description: 'The student has been notified.',
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject session',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (request: SessionRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Pending Session Requests
            {requests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {requests.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and respond to session requests from students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending requests at the moment
            </div>
          ) : (
            <div className="space-y-4">
              {requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((request) => (
                <Card key={request.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{request.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="w-4 h-4" />
                            <span>{request.student?.username || 'Student'}</span>
                            <span>⭐ {request.student?.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                        <Badge variant="outline">{request.subject?.name}</Badge>
                      </div>

                      {/* Description */}
                      {request.description && (
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      )}

                      {/* Date and Time */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{format(new Date(request.requested_time), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{format(new Date(request.requested_time), 'p')}</span>
                          <span className="text-muted-foreground">
                            ({request.duration} min)
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={processing}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(request)}
                          disabled={processing}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
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

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Session Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this session request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="e.g., Not available at this time, suggest another slot..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
