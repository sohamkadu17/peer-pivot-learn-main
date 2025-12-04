import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Link as LinkIcon, FileText, Video, Image, Code, Download, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SharedResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: 'document' | 'link' | 'video' | 'image' | 'code' | 'other';
  resource_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  shared_by: string;
  metadata: any;
}

interface ResourceSharingProps {
  sessionId: string;
  onResourceAdded?: () => void;
}

const resourceTypeIcons = {
  document: FileText,
  link: LinkIcon,
  video: Video,
  image: Image,
  code: Code,
  other: FileText,
};

export default function ResourceSharing({ sessionId, onResourceAdded }: ResourceSharingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<string>('document');
  const [resourceUrl, setResourceUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchResources();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`resources:${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'shared_resources',
          filter: `session_id=eq.${sessionId}`
        }, 
        () => {
          fetchResources();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_resources')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-resources')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('session-resources')
        .getPublicUrl(fileName);

      console.log('File uploaded successfully. Public URL:', publicUrl);
      setResourceUrl(publicUrl);
      
      // Set title if not already set
      if (!title.trim()) {
        setTitle(file.name);
      }
      
      // Auto-detect resource type based on file
      const mimeType = file.type;
      if (mimeType.startsWith('image/')) setResourceType('image');
      else if (mimeType.startsWith('video/')) setResourceType('video');
      else if (mimeType.includes('pdf') || mimeType.includes('document')) setResourceType('document');
      else setResourceType('other');

      toast({
        title: 'Success',
        description: 'File uploaded successfully. Click "Share Resource" to save.',
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a title',
        variant: 'destructive',
      });
      return;
    }
    
    if (!resourceUrl.trim()) {
      toast({
        title: 'Error',
        description: resourceType === 'link' ? 'Please provide a URL' : 'Please upload a file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      
      const { error } = await supabase
        .from('shared_resources')
        .insert({
          session_id: sessionId,
          shared_by: user?.id,
          title: title.trim(),
          description: description.trim() || null,
          resource_type: resourceType,
          resource_url: resourceUrl,
          metadata: {},
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Resource shared successfully',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setResourceUrl('');
      setResourceType('document');
      setShowAddForm(false);
      
      // Notify parent component
      if (onResourceAdded) onResourceAdded();
      
      await fetchResources();
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to share resource',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('shared_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Resource deleted successfully',
      });
      
      await fetchResources();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete resource',
        variant: 'destructive',
      });
    }
  };

  const ResourceIcon = ({ type }: { type: string }) => {
    const Icon = resourceTypeIcons[type as keyof typeof resourceTypeIcons] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  if (loading) {
    return <div className="text-center py-8">Loading resources...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Shared Resources</CardTitle>
            <CardDescription>
              Share materials and links with your session partner
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="default" size="sm">
            {showAddForm ? 'Cancel' : 'Share Resource'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Resource Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resource title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description (optional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type *</label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show URL input only for link type */}
            {resourceType === 'link' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Link URL *</label>
                <Input
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File *</label>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                  required={!resourceUrl}
                />
                {resourceUrl && (
                  <p className="text-xs text-green-600">✓ File uploaded successfully</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading} className="flex-1">
                {uploading ? 'Sharing...' : 'Share Resource'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Resources List */}
        {resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No resources shared yet
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1">
                  <ResourceIcon type={resource.resource_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{resource.title}</h4>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {resource.resource_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(resource.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(resource.resource_url, '_blank')}
                        title="Open resource"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {resource.shared_by === user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(resource.id)}
                          title="Delete resource"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
