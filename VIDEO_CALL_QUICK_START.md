# 🎥 Video Call Setup - Quick Start Guide

## ✅ What's Been Implemented

Your peer-to-peer video calling system is now fully integrated into the Study Circle platform!

### Components Created

1. **WebSocket Signaling Server** - `server/signaling-server.js`
   - Handles peer connection signaling
   - Running on `ws://localhost:8080`
   - ✅ Currently running!

2. **WebRTC Hook** - `src/hooks/useWebRTC.ts`
   - Manages peer connections and media streams
   - Handles ICE candidates and connection state

3. **Video Call Component** - `src/components/VideoCall.tsx`
   - Full UI for video calls
   - Room creation/joining
   - Video controls (mute, video toggle, end call)

4. **Video Call Page** - `src/pages/VideoCallPage.tsx`
   - Dedicated route at `/video-call`
   - Integrated into navigation

5. **Dashboard Integration**
   - Replaced Google Calendar card with Video Call card
   - Added quick action button for video calls

## 🚀 How to Use

### Step 1: Start Both Servers

You have two options:

**Option A: Run both at once (Recommended)**
```powershell
npm run dev:all
```

**Option B: Run separately in two terminals**
Terminal 1:
```powershell
npm run dev:signaling
```
Terminal 2:
```powershell
npm run dev
```

### Step 2: Access the Application

1. Open your browser to `http://localhost:5173` (or the Vite port shown)
2. Log in to your account
3. Go to Dashboard

### Step 3: Start a Video Call

#### As the Host (Creating a Room):
1. Click "Start Video Call" in the Video Call card
2. Click "Create New Room"
3. Allow camera and microphone permissions when prompted
4. Copy the Room ID shown at the top
5. Share this Room ID with your study partner

#### As the Guest (Joining a Room):
1. Click "Start Video Call" in the Video Call card
2. Paste the Room ID you received
3. Click "Join Room"
4. Allow camera and microphone permissions when prompted
5. You should now see both video feeds!

## 🎮 Controls

During a call, you have three main controls:

- **🎤 Microphone**: Toggle audio on/off
- **📹 Video**: Toggle camera on/off
- **📞 End Call**: Disconnect and return to room selection

## 🧪 Testing Locally

### Test with Two Browser Windows

1. Start the servers with `npm run dev:all`
2. Open two browser windows/tabs
3. Log in with different accounts (or use incognito for second window)
4. In Window 1: Create a room and copy the ID
5. In Window 2: Paste the ID and join
6. You should see both video feeds!

### Test with Two Devices

1. Make sure both devices are on the same network
2. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update the signaling server URL in both devices to use your IP:
   - Example: `ws://192.168.1.100:8080`
4. Create a room on one device, join from the other

## 📝 What Was Replaced

### Removed Components:
- ❌ `GoogleCalendarConnect` component
- ❌ Google OAuth integration
- ❌ Google Calendar event creation
- ❌ Google Meet link generation

### Added Components:
- ✅ `VideoCall` component with WebRTC
- ✅ WebSocket signaling server
- ✅ `useWebRTC` custom hook
- ✅ Direct peer-to-peer video calls

## 🔧 Configuration

### Signaling Server Port

Default: `8080`

To change, edit both:
1. `server/signaling-server.js` - line 4
2. `src/hooks/useWebRTC.ts` - line 19

### Video Quality

Default: Automatic (browser default)

To customize, edit `src/hooks/useWebRTC.ts`:
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: true,
});
```

## 🐛 Troubleshooting

### Camera/Microphone Not Working

**Problem**: Can't see or hear anything
**Solutions**:
1. Check browser permissions (camera icon in address bar)
2. Try refreshing the page
3. Check if another app is using the camera
4. Use HTTPS in production (localhost works without)

### Can't Connect to Peer

**Problem**: "Waiting for peer to join..." never resolves
**Solutions**:
1. Verify signaling server is running (`npm run dev:signaling`)
2. Check both peers are using the exact same Room ID
3. Look for errors in browser console (F12)
4. Try creating a new room

### Signaling Server Won't Start

**Problem**: Error when running `npm run dev:signaling`
**Solutions**:
1. Make sure port 8080 is not in use
2. Check if dependencies are installed: `npm install`
3. Verify `ws` package is in `package.json`

### Video is Laggy

**Problem**: Video freezes or stutters
**Solutions**:
1. Close other bandwidth-heavy applications
2. Reduce video quality (see Configuration above)
3. Check your internet connection
4. Consider using TURN servers for production

## 🌐 Production Deployment

### Signaling Server

Deploy to:
- **Heroku**: Simple, free tier available
- **Railway**: Easy GitHub integration
- **DigitalOcean**: Reliable and scalable

Then update `src/hooks/useWebRTC.ts`:
```typescript
signalingServerUrl: 'wss://your-server.herokuapp.com'
```

### TURN Servers (Optional but Recommended)

For users behind restrictive firewalls, add TURN servers.

Free options:
- **Twilio**: Free tier available
- **Xirsys**: Free for small projects

Paid options:
- **AWS**: Kinesis Video Streams
- **Google Cloud**: STUN/TURN services

## 📚 Additional Resources

- **WebRTC Documentation**: https://webrtc.org/
- **MDN WebRTC Guide**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Complete Documentation**: See `VIDEO_CALL_README.md`

## 🎉 You're All Set!

Your video calling system is ready to use. Start the servers and begin connecting with your study partners!

For detailed technical information, architecture details, and advanced features, refer to `VIDEO_CALL_README.md`.

---

**Need Help?** Check the browser console (F12) for detailed error messages.
