import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, BookOpen, Calendar, Users, Award, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import UpcomingSessions from '@/components/UpcomingSessions';
import AIChatBot from '@/components/AIChatBot';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Signed out successfully' });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="floating-bubbles" />
      
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-magic">Study Circle</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.email}!
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* AI Chat Bot - Featured */}
        <div className="mb-8">
          <Card className="card-clean shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">🤖 StudyBot Assistant</CardTitle>
              <CardDescription>
                Get instant help with study tips, challenges, badges, and more! Toggle AI mode for smarter responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIChatBot />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile Summary */}
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Profile
              </CardTitle>
              <CardDescription>
                Complete your profile to start learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> {user?.email}
                </p>
                <p className="text-sm">
                  <strong>Name:</strong> {user?.user_metadata?.full_name || 'Not set'}
                </p>
                <Button className="w-full mt-4" variant="outline">
                  Complete Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <UpcomingSessions />

          {/* Video Call Integration */}
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="mr-2 h-5 w-5 text-accent" />
                Peer Video Calls
              </CardTitle>
              <CardDescription>
                Connect with your study peers through instant video calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      🎥 <strong>Video Conference Features:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Real-time peer-to-peer video calls</li>
                      <li>• WebRTC-based secure connections</li>
                      <li>• Share room IDs with study partners</li>
                      <li>• Toggle video/audio controls</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full btn-primary" 
                    onClick={() => navigate('/video-call')}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Start Video Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points & Badges */}
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="mr-2 h-5 w-5 text-success" />
                Points & Badges
              </CardTitle>
              <CardDescription>
                Your learning achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{profile?.credits || 0}</div>
                  <p className="text-sm text-muted-foreground">Credits</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">No badges yet</div>
                  <p className="text-sm text-muted-foreground">
                    Complete sessions to earn badges
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-clean md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with Study Circle - connect, learn, and grow together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button className="btn-primary" onClick={() => navigate('/find-mentor')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Find a Mentor
                </Button>
                <Button variant="outline" onClick={() => navigate('/become-mentor')}>
                  <Users className="mr-2 h-4 w-4" />
                  Become a Mentor
                </Button>
                <Button variant="outline" onClick={() => navigate('/schedule')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Schedule
                </Button>
                <Button variant="outline" onClick={() => navigate('/video-call')}>
                  <Video className="mr-2 h-4 w-4" />
                  Video Call
                </Button>
                <Button variant="outline" onClick={() => navigate('/achievements')}>
                  <Award className="mr-2 h-4 w-4" />
                  View Achievements
                </Button>
                <Button variant="outline" onClick={() => navigate('/challenges')}>
                  <Award className="mr-2 h-4 w-4" />
                  Challenges
                </Button>
                <Button variant="outline" onClick={() => navigate('/leaderboard')}>
                  <Award className="mr-2 h-4 w-4" />
                  Leaderboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}