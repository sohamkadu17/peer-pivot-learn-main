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

export const useWebRTC = ({ roomId, signalingServerUrl = 'ws://localhost:8080' }: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

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
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(peerId, remoteStream);
        return newMap;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'signal',
            data: {
              type: 'ice-candidate',
              candidate: event.candidate,
              peerId,
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

    if (data.type === 'offer') {
      const pc = createPeerConnection(data.peerId);
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
              peerId: data.peerId,
            },
          })
        );
      }
    } else if (data.type === 'answer') {
      const pc = peers.current.get(data.peerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    } else if (data.type === 'ice-candidate') {
      const pc = peers.current.get(data.peerId);
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

    // Close WebSocket
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setRemoteStreams(new Map());
    setIsConnected(false);
  };

  useEffect(() => {
    const connect = async () => {
      // Initialize local stream
      const stream = await initLocalStream();
      if (!stream) return;

      // Connect to signaling server
      ws.current = new WebSocket(signalingServerUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        ws.current?.send(JSON.stringify({ type: 'join', room: roomId }));
        // Initiate call after joining room
        setTimeout(() => initiateCall(), 500);
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect to signaling server');
      };

      ws.current.onclose = () => {
        setIsConnected(false);
      };
    };

    if (roomId) {
      connect();
    }

    return () => {
      endCall();
    };
  }, [roomId]);

  return {
    localStream,
    remoteStreams,
    isConnected,
    isMuted,
    isVideoOff,
    error,
    toggleMute,
    toggleVideo,
    endCall,
  };
};
