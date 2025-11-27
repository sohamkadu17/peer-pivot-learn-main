import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GoogleCalendarConnectProps {
  isConnected?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export default function GoogleCalendarConnect({ 
  isConnected = false, 
  onConnectionChange 
}: GoogleCalendarConnectProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-url');
      
      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Google Calendar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Connected</span>
        </div>
        <Button
          onClick={handleConnect}
          disabled={loading}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          <Calendar className="h-3 w-3 mr-1" />
          {loading ? 'Reconnecting...' : 'Reconnect'}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      className="btn-primary flex items-center gap-2"
    >
      <Calendar className="h-4 w-4" />
      {loading ? 'Connecting...' : 'Connect Google Calendar'}
    </Button>
  );
}