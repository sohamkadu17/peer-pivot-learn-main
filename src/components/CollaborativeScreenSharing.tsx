import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, MonitorOff, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CollaborativeScreenSharingProps {
  roomId: string;
  addScreenTrack: (stream: MediaStream) => Promise<boolean>;
  removeScreenTrack: () => Promise<boolean>;
  remoteScreenStreams: Map<string, MediaStream>;
}

interface ScreenShareState {
  userId: string;
  username: string;
  isSharing: boolean;
  timestamp: string;
}

export default function CollaborativeScreenSharing({ 
  roomId, 
  addScreenTrack, 
  removeScreenTrack, 
  remoteScreenStreams 
}: CollaborativeScreenSharingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteShareState, setRemoteShareState] = useState<ScreenShareState | null>(null);
  const channelRef = useRef<any>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log('🖥️ Setting up screen share channel for room:', roomId);
    
    // Subscribe to screen share state changes
    const channel = supabase.channel(`screen-share:${roomId}`)
      .on('broadcast', { event: 'screen-state' }, ({ payload }) => {
        console.log('📡 Received screen share state:', payload);
        if (payload.userId !== user?.id) {
          setRemoteShareState(payload);
        }
      })
      .subscribe((status) => {
        console.log('🔌 Screen share channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Unsubscribing from screen share channel');
      channel.unsubscribe();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, user?.id]);

  // Update remote video element when remote screen streams change
  useEffect(() => {
    if (remoteVideoRef.current && remoteScreenStreams.size > 0) {
      const [firstStream] = Array.from(remoteScreenStreams.values());
      remoteVideoRef.current.srcObject = firstStream;
      console.log('🖥️ Set remote screen stream to video element');
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteScreenStreams]);

  const startSharing = async () => {
    try {
      console.log('🖥️ Starting screen share, peer count:', remoteScreenStreams.size);
      
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });

      setStream(displayStream);
      setIsSharing(true);

      // Add screen track to WebRTC peer connections
      console.log('📤 Adding screen track to WebRTC connections');
      const success = await addScreenTrack(displayStream);
      
      if (!success) {
        toast({
          title: 'Warning',
          description: 'No peers connected yet. They will see your screen when they join.',
          variant: 'default',
        });
      }

      // Broadcast that we're sharing using the subscribed channel
      if (channelRef.current) {
        console.log('📤 Broadcasting screen share start');
        await channelRef.current.send({
          type: 'broadcast',
          event: 'screen-state',
          payload: {
            userId: user?.id,
            username: user?.email?.split('@')[0] || 'User',
            isSharing: true,
            timestamp: new Date().toISOString()
          }
        });
      }

      displayStream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };

      toast({
        title: 'Screen Sharing Started',
        description: 'Your screen is now visible to others',
      });
    } catch (error: any) {
      console.error('Error starting screen share:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start screen sharing',
        variant: 'destructive',
      });
    }
  };

  const stopSharing = async () => {
    // Remove screen track from WebRTC
    console.log('📤 Removing screen track from WebRTC connections');
    await removeScreenTrack();

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);

    // Broadcast that we stopped sharing using the subscribed channel
    if (channelRef.current) {
      console.log('📤 Broadcasting screen share stop');
      await channelRef.current.send({
        type: 'broadcast',
        event: 'screen-state',
        payload: {
          userId: user?.id,
          isSharing: false,
          timestamp: new Date().toISOString()
        }
      });
    }

    toast({
      title: 'Screen Sharing Stopped',
      description: 'Your screen is no longer being shared',
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : 'h-full'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Screen Sharing</CardTitle>
          <div className="flex gap-2">
            {stream && (
              <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant={isSharing ? 'destructive' : 'default'}
              onClick={isSharing ? stopSharing : startSharing}
            >
              {isSharing ? (
                <>
                  <MonitorOff className="h-4 w-4 mr-2" />
                  Stop Sharing
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4 mr-2" />
                  Share Screen
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isSharing && stream ? (
          <div className="relative">
            <video
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video) video.srcObject = stream;
              }}
              className="w-full rounded-lg bg-black"
            />
            <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ● Sharing
            </div>
          </div>
        ) : remoteScreenStreams.size > 0 ? (
          <div className="relative">
            <video
              autoPlay
              playsInline
              ref={remoteVideoRef}
              className="w-full rounded-lg bg-black"
            />
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ● {remoteShareState?.username || 'Remote'} is sharing
            </div>
          </div>
        ) : remoteShareState?.isSharing ? (
          <div className="text-center py-12">
            <Monitor className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-pulse" />
            <p className="text-lg font-medium mb-2">
              {remoteShareState.username} is sharing their screen
            </p>
            <p className="text-sm text-gray-500">
              Connecting to screen share...
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="mb-2">No screen is being shared</p>
            <p className="text-sm">Click "Share Screen" to start</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
