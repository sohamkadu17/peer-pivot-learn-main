import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Star } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  contribution_score: number;
  rating: number | null;
  rank: number;
}

type LeaderboardType = 'contribution' | 'rating';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('contribution');

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      if (leaderboardType === 'contribution') {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, contribution_score, rating')
          .order('contribution_score', { ascending: false })
          .limit(50);

        if (error) throw error;

        const entries = (data || []).map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

        setEntries(entries);
      } else {
        // Rating leaderboard - show all mentors, but prioritize those with ratings
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, contribution_score, rating, is_mentor')
          .or('is_mentor.eq.true,rating.gt.0')
          .order('rating', { ascending: false, nullsLast: true })
          .limit(50);

        if (error) throw error;

        const entries = (data || []).map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

        setEntries(entries);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-700" />;
    return <span className="font-bold text-muted-foreground">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Leaderboard</h1>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={leaderboardType === 'contribution' ? 'default' : 'outline'}
            onClick={() => setLeaderboardType('contribution')}
            className="flex-1"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Contribution Points
          </Button>
          <Button
            variant={leaderboardType === 'rating' ? 'default' : 'outline'}
            onClick={() => setLeaderboardType('rating')}
            className="flex-1"
          >
            <Star className="h-4 w-4 mr-2" />
            Top Rated Mentors
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {leaderboardType === 'contribution' ? 'Top Contributors' : 'Top Rated Mentors'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="w-12 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {(entry.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{entry.username || 'Anonymous'}</p>
                    {leaderboardType === 'rating' && entry.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">
                          {entry.rating.toFixed(1)} rating
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {leaderboardType === 'contribution' ? (
                      <>
                        <p className="text-2xl font-bold text-primary">
                          {entry.contribution_score || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">points</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 justify-end">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <p className="text-2xl font-bold text-primary">
                            {entry.rating?.toFixed(1) || '0.0'}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">average rating</p>
                        {entry.contribution_score > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.contribution_score} points
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {entries.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {leaderboardType === 'contribution' 
                    ? 'No leaderboard data yet. Start contributing to appear here!'
                    : 'No rated mentors yet. Be the first to rate a mentor!'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}