import { VideoCall } from '@/components/VideoCall';
import { useSearchParams } from 'react-router-dom';

const VideoCallPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || undefined;

  return <VideoCall sessionId={sessionId} />;
};

export default VideoCallPage;
