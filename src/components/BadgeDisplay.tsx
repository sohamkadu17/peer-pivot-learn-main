import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBadgeDataUrl, BadgeIconName } from '@/lib/badgeGenerator';

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge_types: {
    title: string;
    description: string;
    icon_name: string;
  };
}

export default function BadgeDisplay({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('id, badge_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      // Fetch badge details separately
      if (data && data.length > 0) {
        const badgeIds = data.map(b => b.badge_id);
        const { data: badgeTypes } = await supabase
          .from('badge_types')
          .select('id, title, description, icon_name')
          .in('id', badgeIds);

        const badgeMap = new Map(badgeTypes?.map(b => [b.id, b]));
        
        const enrichedBadges = data.map(ub => ({
          ...ub,
          badge_types: badgeMap.get(ub.badge_id) || { title: '', description: '', icon_name: 'trophy' }
        }));
        
        setBadges(enrichedBadges as any);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading badges...</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map((userBadge) => {
        const badge = userBadge.badge_types;
        const iconUrl = getBadgeDataUrl(badge.icon_name as BadgeIconName);
        
        return (
          <Card key={userBadge.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="mx-auto">
                <img 
                  src={iconUrl} 
                  alt={badge.title}
                  className="w-16 h-16"
                />
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-1">
              <CardTitle className="text-sm">{badge.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              <Badge variant="secondary" className="text-xs">
                {new Date(userBadge.earned_at).toLocaleDateString()}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
      {badges.length === 0 && (
        <Card className="col-span-2 md:col-span-4">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No badges earned yet. Complete challenges to earn badges!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}