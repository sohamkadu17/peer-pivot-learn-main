import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { useToxicityFilter } from '@/hooks/useToxicityFilter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SessionReviewProps {
  sessionId: string;
  ratedUserId: string;
  onReviewSubmitted?: () => void;
}

export function SessionReview({ sessionId, ratedUserId, onReviewSubmitted }: SessionReviewProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { checkToxicity, isChecking } = useToxicityFilter();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a review',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting',
        variant: 'destructive',
      });
      return;
    }

    // TOXICITY FILTER INTERCEPTION LAYER
    // Check toxicity BEFORE saving to database
    const isContentSafe = await checkToxicity(feedback, 0.7);
    
    if (!isContentSafe) {
      // User sees the "measured alert" from the hook
      // They can now revise their feedback
      return; // Block submission
    }

    // Content is safe, proceed with submission
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('ratings').insert({
        session_id: sessionId,
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating,
        feedback: feedback.trim() || null,
      });

      if (error) throw error;

      toast({
        title: '✅ Review Submitted',
        description: 'Thank you for your constructive feedback!',
      });

      // Reset form
      setRating(0);
      setFeedback('');
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="card-clean">
      <CardHeader>
        <CardTitle>Rate This Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Text */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Your Feedback (Optional)
          </label>
          <Textarea
            placeholder="Share your experience... (Be constructive and respectful)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            maxLength={1000}
            disabled={isChecking || isSubmitting}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {feedback.length}/1000 characters
          </p>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || isChecking || isSubmitting}
          className="w-full"
        >
          {isChecking
            ? '🔍 Checking content...'
            : isSubmitting
            ? 'Submitting...'
            : 'Submit Review'}
        </Button>

        {/* Info Message */}
        <p className="text-xs text-muted-foreground text-center">
          💡 All reviews are screened for constructive feedback
        </p>
      </CardContent>
    </Card>
  );
}
