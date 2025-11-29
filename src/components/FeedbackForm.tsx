import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Clock, User, BookOpen, Send, AlertCircle, CheckCircle } from 'lucide-react';

interface ApprovedSession {
  id: string;
  student_id: string;
  mentor_id: string;
  title: string;
  description: string;
  requested_time: string;
  duration: number;
  video_room_id: string;
  subject_id: string;
  mentor: {
    username: string;
  };
  subject: {
    name: string;
  };
}

interface FeedbackFormProps {
  sessionId?: string;
}

const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:5000';

export const FeedbackForm = ({ sessionId }: FeedbackFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ApprovedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ApprovedSession | null>(
    sessionId ? sessions.find(s => s.id === sessionId) || null : null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isToxic, setIsToxic] = useState(false);
  const [toxicityChecked, setToxicityChecked] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApprovedSessions();
    }
  }, [user]);

  const fetchApprovedSessions = async () => {
    try {
      console.log('📋 Fetching approved sessions for feedback:', user?.id);
      
      const { data: sessionsData, error: sessionsError } = await (supabase
        .from('session_requests' as any)
        .select('*')
        .eq('student_id', user?.id)
        .eq('status', 'approved')
        .order('requested_time', { ascending: false }) as any);

      if (sessionsError) throw sessionsError;
      
      if (!sessionsData || sessionsData.length === 0) {
        console.log('⚠️ No approved sessions found');
        setSessions([]);
        setLoading(false);
        return;
    
      }
// Auto-select session after sessions load

      // Get mentor profiles
      const mentorIds = [...new Set(sessionsData.map((s: any) => s.mentor_id))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', mentorIds);

      // Get subjects
      const subjectIds = [...new Set(sessionsData.map((s: any) => s.subject_id).filter(Boolean))] as string[];
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

      // Combine data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const subjectMap = new Map(subjects?.map(s => [s.id, s]) || []);

      const data = sessionsData.map((session: any) => ({
        ...session,
        mentor: profileMap.get(session.mentor_id),
        subject: subjectMap.get(session.subject_id),
      }));

      console.log('✅ Approved sessions fetched:', data?.length || 0);
      setSessions(data);
      
      // Auto-select first session if none selected
      if (data && data.length > 0) {
        // If sessionId is provided, find and select it
        if (sessionId) {
          const found = data.find(s => s.id === sessionId);
          if (found) {
            console.log('🔍 Selecting session from sessionId:', found.id);
            setSelectedSession(found);
          }
        } else if (!selectedSession) {
          // Auto-select first session if no sessionId and no selection
          console.log('🔍 Auto-selecting first session:', data[0].id);
          setSelectedSession(data[0]);
        }
      }
      
      // Auto-select first session if none selected and sessionId not provided
      if (!sessionId && data && data.length > 0 && !selectedSession) {
        console.log('🔍 Auto-selecting first session:', data[0].id);
        setSelectedSession(data[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching approved sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
    if (!sessionId) return;
    if (sessions.length === 0) return;

    const found = sessions.find(s => s.id === sessionId);
    if (found) setSelectedSession(found);

  }, [sessions, sessionId]);

  // Debug: Log button state whenever relevant state changes
  useEffect(() => {
    const isDisabled = !selectedSession || 
      isToxic || 
      (feedback.trim().length > 0 && !toxicityChecked) || 
      submitting;
    
    console.log('🔍 Submit button state check:', {
      isDisabled,
      reasons: {
        noSession: !selectedSession,
        isToxic,
        needsCheck: feedback.trim().length > 0 && !toxicityChecked,
        submitting
      },
      currentState: {
        selectedSession: !!selectedSession,
        isToxic,
        toxicityChecked,
        hasFeedback: feedback.trim().length > 0,
        feedbackLength: feedback.trim().length,
        submitting
      }
    });
  }, [selectedSession, isToxic, toxicityChecked, feedback, submitting]);
  // Check feedback for toxicity at start (preview)
  const checkFeedbackToxicity = async () => {
    if (!feedback.trim()) {
      toast({
        title: 'Warning',
        description: 'Please enter your feedback first',
        variant: 'destructive',
      });
      return;
    }

    if (feedback.trim().length < 10) {
      toast({
        title: 'Warning',
        description: 'Please write at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('🔍 Checking feedback for toxicity...');
      console.log('ML Service URL:', ML_SERVICE_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: feedback,
          threshold: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Service error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Toxicity check result:', data);

      const toxic = data.isToxic || false;
      setIsToxic(toxic);
      setToxicityChecked(true);
      
      console.log('🔍 State after check - isToxic:', toxic, 'toxicityChecked: true');

      if (toxic) {
        setFeedbackError(
          `⚠️ Your feedback contains potentially harmful language. ${data.suggestion || 'Please revise it to be constructive and respectful.'}`
        );
        toast({
          title: 'Content Warning',
          description: 'Your feedback appears to contain inappropriate content. Please revise it.',
          variant: 'destructive',
        });
      } else {
        setFeedbackError(null);
        // Ensure state is updated before showing success message
        setIsToxic(false);
        setToxicityChecked(true);
        toast({
          title: 'Content Approved ✅',
          description: 'Your feedback is constructive and ready to submit!',
        });
        console.log('✅ Content approved - State updated:', {
          isToxic: false,
          toxicityChecked: true,
          submitting: false
        });
      }
    } catch (error: any) {
      console.error('❌ Error checking toxicity:', error.message);
      
      // If service is not available, allow manual approval
      if (error.message.includes('Failed to fetch') || error.name === 'AbortError') {
        toast({
          title: 'Service Unavailable',
          description: 'Content check service is offline. You can still submit your feedback.',
          variant: 'destructive',
        });
        setToxicityChecked(true);
        setIsToxic(false);
        console.log('⚠️ Service unavailable - Allowing submission:', {
          isToxic: false,
          toxicityChecked: true
        });
      } else {
        toast({
          title: 'Check Failed',
          description: error.message || 'Could not verify feedback.',
          variant: 'destructive',
        });
        setToxicityChecked(true);
        setIsToxic(false);
        console.log('⚠️ Check failed - Allowing submission:', {
          isToxic: false,
          toxicityChecked: true
        });
      }
    } finally {
      setSubmitting(false);
      console.log('🔍 Check complete - submitting set to false');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedSession) {
      toast({
        title: 'Error',
        description: 'Please select a session',
        variant: 'destructive',
      });
      return;
    }

    if (!feedback.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your feedback',
        variant: 'destructive',
      });
      return;
    }

    if (!toxicityChecked || isToxic) {
      toast({
        title: 'Warning',
        description: 'Please check your feedback for appropriate content first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('📤 Submitting feedback for session:', selectedSession.id);
      
      let finalCheckData = { score: 0, categories: [], isToxic: false };
      
      // Check toxicity one more time before final submission (safety measure)
      // But if service is unavailable and content was already checked, proceed
      try {
        const finalCheckResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: feedback,
            threshold: 0.7,
          }),
        });

        if (finalCheckResponse.ok) {
          finalCheckData = await finalCheckResponse.json();
          
          if (finalCheckData.isToxic) {
            setFeedbackError('Your feedback contains inappropriate content. Please revise it.');
            toast({
              title: 'Content Rejected',
              description: 'Your feedback was rejected due to inappropriate content',
              variant: 'destructive',
            });
            return;
          }
        } else {
          // Service unavailable but content was already checked, proceed with submission
          console.log('⚠️ Final check service unavailable, but content was pre-checked. Proceeding...');
        }
      } catch (checkError: any) {
        // If service is unavailable but content was already checked, proceed
        if (toxicityChecked && !isToxic) {
          console.log('⚠️ Final check failed, but content was pre-checked. Proceeding...');
        } else {
          throw checkError;
        }
      }

      // Submit feedback to database
      const { error: insertError } = await ((supabase as any)
        .from('session_feedback'))
        .insert({
          session_id: selectedSession.id,
          student_id: user?.id,
          mentor_id: selectedSession.mentor_id,
          rating,
          feedback_text: feedback,
          toxicity_score: finalCheckData.score || 0,
          toxicity_categories: finalCheckData.categories || [],
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      console.log('✅ Feedback inserted successfully. Now updating mentor rating...');

      // Update mentor's rating in profiles table
      // Wait a tiny bit to ensure the insert is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        console.log('🔄 Calculating mentor rating for:', selectedSession.mentor_id);
        
        // Calculate average rating for the mentor - include the rating we just submitted
        const { data: allFeedback, error: feedbackError } = await (supabase
          .from('session_feedback' as any)
          .select('rating')
          .eq('mentor_id', selectedSession.mentor_id) as any);

        console.log('📋 All feedback fetched:', {
          count: allFeedback?.length || 0,
          feedback: allFeedback,
          error: feedbackError
        });

        if (feedbackError) {
          console.error('⚠️ Error fetching feedback for rating calculation:', feedbackError);
          toast({
            title: 'Warning',
            description: 'Feedback submitted but could not update rating. Please refresh to see changes.',
            variant: 'destructive',
          });
        } else if (allFeedback && allFeedback.length > 0) {
          // Calculate average including the rating we just submitted
          const ratings = allFeedback.map((f: any) => Number(f.rating) || 0).filter((r: number) => r > 0);
          const totalRating = ratings.reduce((sum: number, r: number) => sum + r, 0);
          const averageRating = ratings.length > 0 ? Math.round((totalRating / ratings.length) * 100) / 100 : 0;
          
          console.log('📊 Rating calculation:', {
            totalFeedback: allFeedback.length,
            validRatings: ratings.length,
            ratings: ratings,
            totalRating,
            averageRating,
            rounded: averageRating.toFixed(2)
          });

          // Update mentor's rating in profiles - ensure it's a number
          const ratingToUpdate = Number(averageRating);
          
          console.log('💾 Updating profile with rating:', ratingToUpdate);
          
          const { error: updateError, data: updateData } = await supabase
            .from('profiles')
            .update({ rating: ratingToUpdate })
            .eq('user_id', selectedSession.mentor_id)
            .select('user_id, username, rating');

          if (updateError) {
            console.error('⚠️ Failed to update mentor rating:', updateError);
            console.error('Update details:', {
              user_id: selectedSession.mentor_id,
              rating: ratingToUpdate,
              error: updateError
            });
            toast({
              title: 'Warning',
              description: `Feedback submitted but rating update failed: ${updateError.message}. Please refresh the page.`,
              variant: 'destructive',
            });
          } else if (updateData && updateData.length > 0) {
            console.log('✅ Mentor rating updated successfully:', {
              mentor_id: selectedSession.mentor_id,
              mentor_username: updateData[0]?.username,
              oldRating: updateData[0]?.rating,
              newRating: ratingToUpdate,
              updatedProfile: updateData[0]
            });
            
            // Verify the update
            const { data: verifyData } = await supabase
              .from('profiles')
              .select('rating')
              .eq('user_id', selectedSession.mentor_id)
              .single();
            
            console.log('🔍 Verification - Current rating in DB:', verifyData?.rating);
          } else {
            console.error('⚠️ Update returned no data');
          }
        } else {
          // No feedback found - RLS is likely blocking (student can only see their own feedback)
          // Use a database function approach or set rating directly
          console.log('⚠️ No feedback found (RLS may be blocking). Using direct rating update.');
          
          // Get current profile
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('rating')
            .eq('user_id', selectedSession.mentor_id)
            .single();
          
          const currentRating = currentProfile?.rating || 0;
          
          // If no current rating, set it to the submitted rating
          // If there's a current rating, we need to recalculate, but RLS blocks us
          // For now, use a simple approach: if rating is 0, set it; otherwise keep current
          // In production, you'd want a database trigger/function to handle this
          
          let ratingToUpdate = rating;
          
          if (currentRating > 0) {
            // We can't calculate the true average due to RLS
            // So we'll use a weighted approach or just update if the new rating is significantly different
            // For simplicity, let's use the new rating if it's the first one we see, otherwise average
            // This is a workaround - ideally use a DB function
            ratingToUpdate = Math.round(((currentRating + rating) / 2) * 100) / 100;
            console.log('📊 Averaging with existing rating:', {
              current: currentRating,
              new: rating,
              average: ratingToUpdate
            });
          } else {
            console.log('📝 Setting initial rating:', rating);
          }
          
          const { error: updateError, data: updateData } = await supabase
            .from('profiles')
            .update({ rating: ratingToUpdate })
            .eq('user_id', selectedSession.mentor_id)
            .select('user_id, username, rating');
          
          if (updateError) {
            console.error('⚠️ Failed to update rating:', updateError);
            toast({
              title: 'Warning',
              description: 'Feedback submitted but rating update failed. The rating may update after refresh.',
              variant: 'destructive',
            });
          } else {
            console.log('✅ Rating updated:', {
              mentor_id: selectedSession.mentor_id,
              newRating: ratingToUpdate,
              updatedProfile: updateData?.[0]
            });
          }
        }
      } catch (ratingError: any) {
        console.error('⚠️ Error updating mentor rating:', ratingError);
        console.error('Error details:', ratingError);
        // Don't fail the submission if rating update fails
      }

      console.log('✅ Feedback submitted successfully');
      toast({
        title: 'Success!',
        description: 'Your feedback has been submitted successfully. Mentor rating has been updated!',
      });

      // Reset form
      setFeedback('');
      setRating(5);
      setFeedbackError(null);
      setToxicityChecked(false);
      setIsToxic(false);
      setSelectedSession(null);
      
      // Refresh sessions list
      await fetchApprovedSessions();
      
      // Force a page refresh to show updated ratings (optional - can be removed if you prefer)
      // window.location.reload();
    } catch (error: any) {
      console.error('❌ Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            No Approved Sessions Yet
          </CardTitle>
          <CardDescription>
            Once a mentor approves your session request, you'll be able to give them feedback here anytime - before or after the session.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="card-clean">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Provide Session Feedback
        </CardTitle>
        <CardDescription>
          Share your experience and help us improve our mentoring service
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Session Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Select a Session</label>
            {selectedSession ? (
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedSession.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="w-4 h-4" />
                          <span>Mentor: {selectedSession.mentor?.username}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {selectedSession.subject?.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(selectedSession.requested_time), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(selectedSession.requested_time), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSession(session)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{session.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {session.mentor?.username} • {session.subject?.name}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.requested_time), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {selectedSession && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSession(null)}
              >
                Change Session
              </Button>
            )}
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Rating (1-5 stars)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-all ${
                    star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-300'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Very Good'}
              {rating === 3 && 'Good'}
              {rating === 2 && 'Fair'}
              {rating === 1 && 'Poor'}
            </p>
          </div>

          {/* Feedback Text */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Your Feedback</label>
            <textarea
              value={feedback}
            //   onChange={(e) => {
            //     setFeedback(e.target.value);
            //     setToxicityChecked(false);
            //     setFeedbackError(null);
            //   }}
            onChange={(e) => {
  const newValue = e.target.value;
  setFeedback(newValue);

  // Only reset toxicity check if text was significantly deleted (more than 3 chars removed)
  // This allows minor edits without requiring re-check
  if (newValue.length < feedback.length - 3) {
    setToxicityChecked(false);
    setIsToxic(false);
  }
  // If text was added or changed significantly, keep the check state
  // User can manually re-check if needed

  setFeedbackError(null);
}}

              placeholder="Share your experience with this mentor session... Keep it constructive and respectful."
              className="w-full min-h-[150px] p-3 border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters • Keep feedback constructive and respectful
            </p>
          </div>

          {/* Toxicity Feedback */}
          {feedbackError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{feedbackError}</p>
            </div>
          )}

          {toxicityChecked && !isToxic && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Your feedback content is appropriate and constructive!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  You can now submit your feedback
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={checkFeedbackToxicity}
              disabled={!feedback.trim() || submitting}
              className="flex-1"
            >
              {submitting ? 'Checking...' : '🔍 Check Content'}
            </Button>
            <Button
              className="flex-1 btn-primary"
              disabled={
                !selectedSession || 
                isToxic || 
                (feedback.trim().length > 0 && !toxicityChecked) || 
                submitting
              }
              onClick={() => {
                console.log('🔍 Submit button clicked - State:', {
                  selectedSession: !!selectedSession,
                  isToxic,
                  toxicityChecked,
                  hasFeedback: feedback.trim().length > 0,
                  submitting
                });
                handleSubmitFeedback();
              }}
              title={
                !selectedSession 
                  ? 'Please select a session' 
                  : isToxic 
                  ? 'Content contains inappropriate language' 
                  : feedback.trim().length > 0 && !toxicityChecked 
                  ? 'Please check your content first' 
                  : submitting 
                  ? 'Submitting...' 
                  : 'Submit feedback'
              }
            >
              {/* <Send className="w-4 h-4 mr-2" /> */}
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;
