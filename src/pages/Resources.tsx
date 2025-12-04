import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Share2, Download, ExternalLink, FileText, Link as LinkIcon, Video as VideoIcon, Image as ImageIcon, Code, File } from 'lucide-react';
import { format } from 'date-fns';
import ResourceSharing from '@/components/ResourceSharing';
import Navigation from '@/components/Navigation';

interface Session {
  id: string;
  title: string;
  requested_time: string;
  status: string;
  mentor_id: string;
  student_id: string;
}

interface SharedResource {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  resource_type: 'document' | 'link' | 'video' | 'image' | 'code' | 'other';
  resource_url: string;
  file_size: number | null;
  created_at: string;
  shared_by: string;
  session: {
    title: string;
  };
  sharer: {
    username: string;
  };
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'document':
      return <FileText className="h-5 w-5" />;
    case 'link':
      return <LinkIcon className="h-5 w-5" />;
    case 'video':
      return <VideoIcon className="h-5 w-5" />;
    case 'image':
      return <ImageIcon className="h-5 w-5" />;
    case 'code':
      return <Code className="h-5 w-5" />;
    default:
      return <File className="h-5 w-5" />;
  }
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export default function Resources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchAllResources();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('session_requests')
        .select('*')
        .or(`mentor_id.eq.${user?.id},student_id.eq.${user?.id}`)
        .eq('status', 'approved')
        .order('requested_time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    }
  };

  const fetchAllResources = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('shared_resources')
        .select(`
          *,
          session_requests!shared_resources_session_id_fkey(title)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.shared_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const resourcesWithProfiles = data.map(resource => ({
          ...resource,
          session: resource.session_requests,
          sharer: profileMap.get(resource.shared_by)
        }));
        
        setResources(resourcesWithProfiles);
      } else {
        setResources([]);
      }
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      if (error.code !== 'PGRST116') {
        toast({
          title: 'Info',
          description: 'No resources available yet',
        });
      }
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResourceAdded = () => {
    fetchAllResources();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Resource Sharing
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Share and access learning resources with your study partners
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Share Resources Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Resources
                </CardTitle>
                <CardDescription>
                  Upload files or share links with your session partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Select Session</label>
                  <select
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                    value={selectedSessionId || ''}
                    onChange={(e) => setSelectedSessionId(e.target.value || null)}
                  >
                    <option value="">Choose a session...</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} - {format(new Date(session.requested_time), 'MMM d, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSessionId && (
                  <ResourceSharing 
                    sessionId={selectedSessionId} 
                    onResourceAdded={handleResourceAdded}
                  />
                )}

                {!selectedSessionId && (
                  <div className="text-center py-8 text-gray-500">
                    Select a session to start sharing resources
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Shared Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Shared Resources</CardTitle>
                <CardDescription>
                  All resources shared across your sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading resources...</div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No resources shared yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-indigo-600 dark:text-indigo-400">
                            {getResourceIcon(resource.resource_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm truncate">{resource.title}</h4>
                                {resource.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {resource.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                  <Badge variant="outline" className="text-xs">
                                    {resource.resource_type}
                                  </Badge>
                                  {resource.file_size && (
                                    <span>{formatFileSize(resource.file_size)}</span>
                                  )}
                                  <span>•</span>
                                  <span>{resource.sharer?.username || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>{format(new Date(resource.created_at), 'MMM d')}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Session: {resource.session?.title || 'N/A'}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {resource.resource_type === 'link' ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(resource.resource_url, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(resource.resource_url, '_blank')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
