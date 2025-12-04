import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Check, Monitor, Pencil, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateRoomId } from '@/lib/roomUtils';
import { VideoChat } from './VideoChat';
import CollaborativeScreenSharing from './CollaborativeScreenSharing';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';

interface VideoCallProps {
  sessionId?: string;
  onEndCall?: () => void;
}

export const VideoCall = ({ sessionId, onEndCall }: VideoCallProps) => {
  const [roomId, setRoomId] = useState(sessionId || '');
  const [isJoining, setIsJoining] = useState(!sessionId);
  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<'chat' | 'screen' | 'whiteboard'>('chat');
  const { toast } = useToast();

  const {
    localStream,
    remoteStreams,
    isConnected,
    isMuted,
    isVideoOff,
    error,
    toggleMute,
    toggleVideo,
    endCall,
    addScreenTrack,
    removeScreenTrack,
    remoteScreenStreams,
  } = useWebRTC({
    roomId: isJoining ? '' : roomId,
    signalingServerUrl: import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8081',
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      setIsJoining(false);
    } else {
      toast({
        title: 'Invalid Room ID',
        description: 'Please enter a valid room ID',
        variant: 'destructive',
      });
    }
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setIsJoining(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast({
      title: 'Room ID Copied',
      description: 'Share this ID with your peer to join the call',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndCall = () => {
    endCall();
    setIsJoining(true);
    setRoomId('');
    if (onEndCall) onEndCall();
  };

  if (isJoining) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Start or Join Video Call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Enter Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="room-abc123"
              className="w-full px-3 py-2 border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleJoinRoom} className="flex-1">
              Join Room
            </Button>
            <Button onClick={handleCreateRoom} variant="outline" className="flex-1">
              Create New Room
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Room ID */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm">Room ID:</span>
            <code className="bg-gray-800 px-3 py-1 rounded">{roomId}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyRoomId}
              className="text-white hover:bg-gray-800"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            {isConnected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Connected ({remoteStreams.size} peer{remoteStreams.size !== 1 ? 's' : ''})
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Connecting...
              </span>
            )}
          </div>
        </div>

        {/* Main Content: Video Grid + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Video Section - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Video */}
              <Card className="relative overflow-hidden bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-[350px] object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
                  You {isVideoOff && '(Video Off)'}
                </div>
              </Card>

              {/* Remote Videos */}
              {Array.from(remoteStreams.entries()).map(([peerId], index) => (
                <Card key={peerId} className="relative overflow-hidden bg-black">
                  <video
                    ref={(el) => {
                      if (el) remoteVideoRefs.current.set(peerId, el);
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-[350px] object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
                    Peer {index + 1}
                  </div>
                </Card>
              ))}

              {/* Waiting for peer */}
              {remoteStreams.size === 0 && (
                <Card className="relative overflow-hidden bg-gray-800 flex items-center justify-center h-[350px]">
                  <div className="text-center text-gray-400">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Waiting for peer to join...</p>
                    <p className="text-sm mt-2">Share the room ID with your peer</p>
                  </div>
                </Card>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                variant={isMuted ? 'destructive' : 'secondary'}
                onClick={toggleMute}
                className="rounded-full w-16 h-16"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              <Button
                size="lg"
                variant={isVideoOff ? 'destructive' : 'secondary'}
                onClick={toggleVideo}
                className="rounded-full w-16 h-16"
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>

              <Button
                size="lg"
                variant="destructive"
                onClick={handleEndCall}
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Right Panel - Chat/Screen/Whiteboard - 1 column */}
          <div className="lg:col-span-1">
            {/* Tab Buttons */}
            <div className="flex gap-2 mb-2">
              <Button
                size="sm"
                variant={activePanel === 'chat' ? 'default' : 'outline'}
                onClick={() => setActivePanel('chat')}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                size="sm"
                variant={activePanel === 'screen' ? 'default' : 'outline'}
                onClick={() => setActivePanel('screen')}
                className="flex-1"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Screen
              </Button>
              <Button
                size="sm"
                variant={activePanel === 'whiteboard' ? 'default' : 'outline'}
                onClick={() => setActivePanel('whiteboard')}
                className="flex-1"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Board
              </Button>
            </div>
            
            {/* Panel Content */}
            <div className="h-[calc(100vh-250px)] lg:h-[680px]">
              {activePanel === 'chat' && <VideoChat roomId={roomId} />}
              {activePanel === 'screen' && (
                <CollaborativeScreenSharing 
                  roomId={roomId}
                  addScreenTrack={addScreenTrack}
                  removeScreenTrack={removeScreenTrack}
                  remoteScreenStreams={remoteScreenStreams}
                />
              )}
              {activePanel === 'whiteboard' && <CollaborativeWhiteboard roomId={roomId} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
