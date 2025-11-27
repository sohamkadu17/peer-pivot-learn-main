# Video Call Feature - WebRTC Implementation

## Overview

This implementation replaces the Google Calendar integration with a peer-to-peer video conferencing system using WebRTC and WebSocket signaling.

## Architecture

### Components

1. **WebSocket Signaling Server** (`server/signaling-server.js`)
   - Lightweight Node.js WebSocket server
   - Handles peer discovery and connection signaling
   - Manages room-based sessions
   - Port: 8080

2. **WebRTC Hook** (`src/hooks/useWebRTC.ts`)
   - Manages peer connections
   - Handles media streams (audio/video)
   - ICE candidate exchange
   - Connection state management

3. **VideoCall Component** (`src/components/VideoCall.tsx`)
   - User interface for video calls
   - Local and remote video display
   - Call controls (mute, video toggle, end call)
   - Room creation and joining

4. **VideoCallPage** (`src/pages/VideoCallPage.tsx`)
   - Dedicated page for video calls
   - URL parameter support for direct room joining

## Features

### ✅ Implemented Features

- **Real-time Peer-to-Peer Video**: Direct WebRTC connections between peers
- **Audio/Video Controls**: Mute, video on/off, end call
- **Room-based Sessions**: Create or join rooms with unique IDs
- **Multiple Participants**: Support for multiple peers in a room
- **Responsive UI**: Works on desktop and mobile browsers
- **Connection Status**: Visual indicators for connection state
- **Screen Sharing Ready**: Architecture supports adding screen sharing

### 🔧 Technical Features

- **WebRTC**: Peer-to-peer media streaming
- **STUN Servers**: Google's public STUN servers for NAT traversal
- **WebSocket Signaling**: Real-time signaling for connection setup
- **ICE Candidates**: Automatic exchange for optimal connection paths
- **Media Stream Management**: Proper cleanup on disconnect

## Installation

1. **Install dependencies**:
```powershell
npm install
# or
pnpm install
# or
bun install
```

2. **Start the signaling server**:
```powershell
npm run dev:signaling
```

3. **Start the frontend (in a separate terminal)**:
```powershell
npm run dev
```

4. **Or start both together**:
```powershell
npm run dev:all
```

## Usage

### Starting a Video Call

1. Navigate to the Dashboard
2. Click on "Start Video Call" in the Video Call card
3. Either:
   - **Create a new room**: Click "Create New Room" to generate a unique room ID
   - **Join existing room**: Enter the room ID shared by your peer

### Sharing a Room

1. After creating a room, you'll see the room ID at the top
2. Click the copy icon to copy the room ID
3. Share this ID with your study partner
4. They can paste it in the "Enter Room ID" field to join

### During a Call

- **Mute/Unmute**: Click the microphone icon
- **Video On/Off**: Click the video icon
- **End Call**: Click the red phone icon

## Configuration

### Signaling Server

The WebSocket signaling server runs on `ws://localhost:8080` by default.

To change the port, edit `server/signaling-server.js`:
```javascript
const server = new WebSocket.Server({ port: 8080 }); // Change port here
```

Then update the frontend configuration in `src/hooks/useWebRTC.ts`:
```typescript
signalingServerUrl: 'ws://localhost:8080' // Update URL here
```

### STUN/TURN Servers

For production, you may want to add TURN servers for better connectivity behind restrictive firewalls.

Edit `src/hooks/useWebRTC.ts`:
```typescript
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ],
};
```

## Deployment

### Signaling Server Deployment

#### Option 1: Heroku
```bash
# Create a Procfile
echo "web: node server/signaling-server.js" > Procfile

# Deploy
heroku create your-signaling-server
git push heroku main
```

#### Option 2: Railway
1. Connect your GitHub repository
2. Set the start command: `node server/signaling-server.js`
3. Deploy

#### Option 3: DigitalOcean App Platform
1. Create a new app from your repository
2. Set build command: (none)
3. Set run command: `node server/signaling-server.js`

### Frontend Deployment

Update the signaling server URL in your environment variables:

```env
VITE_SIGNALING_SERVER_URL=wss://your-signaling-server.herokuapp.com
```

Then update `src/hooks/useWebRTC.ts` to use the environment variable:
```typescript
signalingServerUrl: import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:8080'
```

## Browser Compatibility

### Supported Browsers

- ✅ Chrome/Edge 79+
- ✅ Firefox 68+
- ✅ Safari 14.1+
- ✅ Opera 66+

### Required Permissions

- Camera access
- Microphone access

Users will be prompted to grant these permissions on first use.

## Troubleshooting

### Video/Audio Not Working

1. **Check browser permissions**: Ensure camera and microphone are allowed
2. **HTTPS required**: WebRTC requires HTTPS in production (localhost is exempt)
3. **Browser compatibility**: Check if your browser supports WebRTC

### Connection Issues

1. **Signaling server down**: Verify the WebSocket server is running
2. **Firewall/NAT issues**: May need TURN servers for restrictive networks
3. **Same room ID**: Ensure both peers are using the exact same room ID

### No Remote Video

1. **Wait a few seconds**: Connection may take time to establish
2. **Check peer's permissions**: Remote peer may have denied camera/microphone
3. **Network issues**: Check console for ICE connection errors

## Advanced Features (Future Enhancements)

### Screen Sharing

Add to `src/hooks/useWebRTC.ts`:
```typescript
const startScreenShare = async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });
    // Replace video track with screen share track
  } catch (err) {
    console.error('Screen share failed:', err);
  }
};
```

### Recording

Implement using MediaRecorder API:
```typescript
const mediaRecorder = new MediaRecorder(localStream);
mediaRecorder.ondataavailable = (event) => {
  // Handle recorded chunks
};
```

### Chat During Call

Add a text chat sidebar using the same WebSocket connection.

### Virtual Backgrounds

Integrate TensorFlow.js for background blur/replacement.

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Room ID Complexity**: Use cryptographically secure random IDs
3. **Authentication**: Integrate with Supabase auth to verify users
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **TURN Server Auth**: Secure TURN servers with time-limited credentials

## Performance Optimization

1. **Video Quality**: Adjust constraints based on network conditions
```typescript
const constraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: true
};
```

2. **Adaptive Bitrate**: Monitor connection quality and adjust
3. **Simulcast**: For multiple participants, enable simulcast in WebRTC config

## Migration from Google Calendar

The following components were replaced:

- ❌ `GoogleCalendarConnect` component - Removed
- ❌ Google OAuth callbacks - Removed
- ❌ Calendar event creation - Removed
- ✅ **New**: `VideoCall` component with WebRTC
- ✅ **New**: WebSocket signaling server
- ✅ **New**: `useWebRTC` hook

### Dashboard Changes

- Replaced "Google Calendar" card with "Peer Video Calls" card
- Updated quick actions to include "Video Call" button
- Removed Google connection state management

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify signaling server is running
3. Ensure proper permissions are granted
4. Check network connectivity

## License

Part of the Study Circle platform.
