import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, MonitorOff, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScreenSharingProps {
  onScreenShare?: (stream: MediaStream | null) => void;
  remoteScreenStream?: MediaStream | null;
}

export default function ScreenSharing({ onScreenShare, remoteScreenStream }: ScreenSharingProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteScreenStream) {
      remoteVideoRef.current.srcObject = remoteScreenStream;
    }
  }, [remoteScreenStream]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } as any,
      });

      setLocalStream(stream);
      setIsSharing(true);

      // Notify parent component
      if (onScreenShare) {
        onScreenShare(stream);
      }

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      toast({
        title: 'Screen Sharing Started',
        description: 'Your screen is now being shared',
      });
    } catch (error: any) {
      console.error('Error starting screen share:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Permission Denied',
          description: 'Please allow screen sharing to continue',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to start screen sharing',
          variant: 'destructive',
        });
      }
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setIsSharing(false);

    // Notify parent component
    if (onScreenShare) {
      onScreenShare(null);
    }

    toast({
      title: 'Screen Sharing Stopped',
      description: 'Your screen is no longer being shared',
    });
  };

  const toggleFullscreen = () => {
    const element = remoteVideoRef.current;
    if (!element) return;

    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Screen Sharing
          </CardTitle>
          <CardDescription>
            Share your screen with participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {!isSharing ? (
              <Button onClick={startScreenShare} className="flex-1">
                <Monitor className="mr-2 h-4 w-4" />
                Start Sharing
              </Button>
            ) : (
              <Button onClick={stopScreenShare} variant="destructive" className="flex-1">
                <MonitorOff className="mr-2 h-4 w-4" />
                Stop Sharing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Local Screen Preview */}
      {isSharing && localStream && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Shared Screen</CardTitle>
          </CardHeader>
          <CardContent>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg bg-black"
            />
          </CardContent>
        </Card>
      )}

      {/* Remote Screen View */}
      {remoteScreenStream && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Shared Screen</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
