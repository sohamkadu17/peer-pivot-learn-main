import { useEffect, useRef, useState } from 'react';

interface UseWebRTCProps {
  roomId: string;
  signalingServerUrl?: string;
}

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export const useWebRTC = ({ 
  roomId, 
  signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8081' 
}: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSenders = useRef<Map<string, RTCRtpSender[]>>(new Map());
  const myPeerId = useRef<string>(`peer-${Math.random().toString(36).substr(2, 9)}`);

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      setError('Failed to access camera/microphone. Please grant permissions.');
      console.error('Error accessing media devices:', err);
      return null;
    }
  };

  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(rtcConfig);

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const track = event.track;
      
      console.log('📥 Received track:', track.kind, track.label);
      
      // Check if this is a screen share track
      if (track.label.includes('screen') || track.label.includes('Screen')) {
        console.log('🖥️ Screen share track detected from peer:', peerId);
        setRemoteScreenStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          return newMap;
        });
      } else {
        // Regular video/audio track
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          return newMap;
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        console.log('🧊 Sending ICE candidate to peer:', peerId);
        ws.current.send(
          JSON.stringify({
            type: 'signal',
            data: {
              type: 'ice-candidate',
              candidate: event.candidate,
              from: myPeerId.current,
              to: peerId,
            },
          })
        );
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        handlePeerDisconnect(peerId);
      }
    };

    peers.current.set(peerId, pc);
    return pc;
  };

  const handlePeerDisconnect = (peerId: string) => {
    const pc = peers.current.get(peerId);
    if (pc) {
      pc.close();
      peers.current.delete(peerId);
    }
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  };

  const handleSignalingMessage = async (message: any) => {
    const { data } = message;
    console.log('🔄 Handling signal:', data.type, 'from peer:', data.from);

    // Handle new peer joining
    if (data.type === 'peer-joined') {
      console.log('👋 New peer joined:', data.peerId);
      // Create offer for new peer
      const pc = createPeerConnection(data.peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'signal',
            data: {
              type: 'offer',
              offer,
              from: myPeerId.current,
              to: data.peerId,
            },
          })
        );
      }
      return;
    }

    // Only process messages meant for us
    if (data.to && data.to !== myPeerId.current) {
      return;
    }

    if (data.type === 'offer') {
      console.log('📨 Received offer from:', data.from);
      const pc = createPeerConnection(data.from);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'signal',
            data: {
              type: 'answer',
              answer,
              from: myPeerId.current,
              to: data.from,
            },
          })
        );
      }
    } else if (data.type === 'answer') {
      console.log('📨 Received answer from:', data.from);
      const pc = peers.current.get(data.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    } else if (data.type === 'ice-candidate') {
      console.log('🧊 Received ICE candidate from:', data.from);
      const pc = peers.current.get(data.from);
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    }
  };

  const initiateCall = async () => {
    const peerId = `peer-${Date.now()}`; // Simple peer ID generation
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'signal',
          data: {
            type: 'offer',
            offer,
            peerId,
          },
        })
      );
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    // Close all peer connections
    peers.current.forEach((pc) => pc.close());
    peers.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    // Stop screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      screenStreamRef.current = null;
    }

    // Close WebSocket
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setRemoteStreams(new Map());
    setRemoteScreenStreams(new Map());
    setIsConnected(false);
  };

  const addScreenTrack = async (stream: MediaStream) => {
    console.log('🖥️ Adding screen track to all peer connections');
    console.log('📊 Current peers count:', peers.current.size);
    console.log('📊 Peer IDs:', Array.from(peers.current.keys()));
    
    screenStreamRef.current = stream;
    setScreenStream(stream);

    const screenTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    console.log('🎥 Screen track:', screenTrack?.label, screenTrack?.id);
    console.log('🔊 Screen audio:', audioTrack?.label, audioTrack?.id);

    if (peers.current.size === 0) {
      console.warn('⚠️ No peer connections available! Make sure video call is connected first.');
      return false;
    }

    // Add screen tracks to all existing peer connections
    peers.current.forEach((pc, peerId) => {
      console.log('🔄 Adding track to peer:', peerId, 'Connection state:', pc.connectionState);
      const senders: RTCRtpSender[] = [];
      
      try {
        // Add video track
        const videoSender = pc.addTrack(screenTrack, stream);
        senders.push(videoSender);
        console.log('✅ Added screen video track to peer:', peerId);

        // Add audio track if available
        if (audioTrack) {
          const audioSender = pc.addTrack(audioTrack, stream);
          senders.push(audioSender);
          console.log('✅ Added screen audio track to peer:', peerId);
        }

        screenSenders.current.set(peerId, senders);
      } catch (err) {
        console.error('❌ Failed to add screen track to peer:', peerId, err);
      }
    });

    return true;
  };

  const removeScreenTrack = async () => {
    console.log('🖥️ Removing screen track from all peer connections');

    // Remove screen tracks from all peer connections
    peers.current.forEach((pc, peerId) => {
      const senders = screenSenders.current.get(peerId);
      if (senders) {
        senders.forEach((sender) => {
          pc.removeTrack(sender);
        });
        screenSenders.current.delete(peerId);
        console.log('✅ Removed screen tracks from peer:', peerId);
      }
    });

    // Stop screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    return true;
  };

  useEffect(() => {
    const connect = async () => {
      console.log('🔌 Attempting to connect to signaling server:', signalingServerUrl);
      console.log('📍 Room ID:', roomId);
      
      // Initialize local stream
      const stream = await initLocalStream();
      if (!stream) {
        console.error('❌ Failed to initialize local stream');
        return;
      }
      console.log('✅ Local stream initialized');

      // Connect to signaling server
      console.log('🔗 Connecting to WebSocket...');
      ws.current = new WebSocket(signalingServerUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected!');
        console.log('🆔 My peer ID:', myPeerId.current);
        setIsConnected(true);
        const joinMessage = { 
          type: 'join', 
          room: roomId,
          peerId: myPeerId.current 
        };
        console.log('📤 Sending join message:', joinMessage);
        ws.current?.send(JSON.stringify(joinMessage));
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('📨 Received message:', message);
        handleSignalingMessage(message);
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Failed to connect to signaling server. Make sure it\'s running on ' + signalingServerUrl);
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        setIsConnected(false);
      };
    };

    if (roomId) {
      connect();
    } else {
      console.log('⏸️  No room ID provided, waiting...');
    }

    return () => {
      console.log('🧹 Cleaning up WebRTC connection');
      endCall();
    };
  }, [roomId]);

  return {
    localStream,
    remoteStreams,
    screenStream,
    remoteScreenStreams,
    isConnected,
    isMuted,
    isVideoOff,
    error,
    toggleMute,
    toggleVideo,
    endCall,
    addScreenTrack,
    removeScreenTrack,
  };
};
