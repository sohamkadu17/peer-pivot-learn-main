import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Star, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Mentor {
  id: string;
  user_id: string;
  username: string;
  bio: string;
  subjects: string[];
  rating: number;
  is_mentor: boolean;
}

export default function FindMentor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentors();
    
    // Refresh mentors every 30 seconds to show updated ratings
    const interval = setInterval(() => {
      fetchMentors();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMentors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_mentor', true);

      if (error) throw error;
      
      console.log('📋 FindMentor - Mentors fetched:', {
        count: data?.length || 0,
        mentors: data?.map(m => ({
          username: m.username,
          rating: m.rating,
          ratingType: typeof m.rating,
          ratingValue: m.rating
        }))
      });
      
      setMentors(data || []);
    } catch (error: any) {
      console.error('❌ Error fetching mentors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load mentors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSession = async (mentorId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Create session request with proposed time
      const proposedStart = new Date();
      proposedStart.setDate(proposedStart.getDate() + 1);
      const proposedEnd = new Date(proposedStart.getTime() + 60 * 60 * 1000);

      const { error } = await supabase
        .from('sessions')
        .insert({
          teacher_id: mentorId,
          student_id: user.id,
          title: 'Study Session Request',
          status: 'scheduled',
          subject: 'General',
          start_ts: proposedStart.toISOString(),
          end_ts: proposedEnd.toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Session request sent to mentor!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send request',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading mentors...</div>
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
          <h1 className="text-2xl font-bold text-magic">Find a Mentor</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {mentors.length === 0 ? (
          <Card className="card-clean text-center">
            <CardContent className="py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mentors available</h3>
              <p className="text-muted-foreground">Check back later or become a mentor yourself!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mentors.map((mentor) => (
              <Card key={mentor.id} className="card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{mentor.username || 'Anonymous Mentor'}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.round(mentor.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold">{mentor.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </CardTitle>
                  <CardDescription>Expert Mentor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Subject Expertise */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Subject Expertise</h4>
                      <div className="flex flex-wrap gap-2">
                        {mentor.subjects?.length > 0 ? mentor.subjects.map((subject, index) => (
                          <Badge key={index} variant="secondary">
                            {subject}
                          </Badge>
                        )) : <Badge variant="outline">No subjects listed</Badge>}
                      </div>
                    </div>

                    {/* Availability */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Availability
                      </h4>
                      <p className="text-sm text-muted-foreground">Available most weekdays</p>
                    </div>

                    {/* Request Button */}
                    <Button 
                      className="w-full btn-primary"
                      onClick={() => handleRequestSession(mentor.user_id)}
                    >
                      Request Session
                    </Button>
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