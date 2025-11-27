import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  target_metric: string;
  target_value: number;
  points_reward: number;
  is_active: boolean;
}

interface ChallengeProgress {
  current_value: number;
  completed: boolean;
}

export default function Challenges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    try {
      // Fetch active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (challengesError) throw challengesError;

      setChallenges(challengesData || []);

      // Fetch user's progress for each challenge
      const { data: progressData } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user!.id);

      const progressMap: Record<string, ChallengeProgress> = {};
      (progressData || []).forEach((p) => {
        progressMap[p.challenge_id] = {
          current_value: p.current_value,
          completed: p.completed,
        };
      });
      setProgress(progressMap);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase.from('user_challenge_progress').insert({
        user_id: user!.id,
        challenge_id: challengeId,
        current_value: 0,
        completed: false,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Joined challenge successfully!',
      });

      fetchChallenges();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getProgressPercentage = (challenge: Challenge) => {
    const prog = progress[challenge.id];
    if (!prog) return 0;
    return Math.min((prog.current_value / challenge.target_value) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Target className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Weekly Challenges</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => {
            const userProgress = progress[challenge.id];
            const hasJoined = !!userProgress;
            const percentage = getProgressPercentage(challenge);

            return (
              <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="h-6 w-6 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {challenge.points_reward} pts
                    </span>
                  </div>
                  <CardTitle>{challenge.title}</CardTitle>
                  <CardDescription>{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(challenge.start_date).toLocaleDateString()} -{' '}
                        {new Date(challenge.end_date).toLocaleDateString()}
                      </span>
                    </div>

                    {hasJoined ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-semibold">
                            {userProgress.current_value} / {challenge.target_value}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        {userProgress.completed && (
                          <p className="text-sm text-green-600 font-semibold">✓ Completed!</p>
                        )}
                      </div>
                    ) : (
                      <Button onClick={() => joinChallenge(challenge.id)} className="w-full">
                        Join Challenge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {challenges.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active challenges at the moment.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}