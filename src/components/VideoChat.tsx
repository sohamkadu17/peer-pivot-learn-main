import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    username: string;
  };
}

interface VideoChatProps {
  roomId: string;
}

export const VideoChat = ({ roomId }: VideoChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [roomId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      console.log('📥 Fetching chat messages for room:', roomId);
      const { data, error } = await supabase
        .from('video_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }

      // Fetch user profiles for all messages
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const messagesWithUsers = data.map(msg => ({
          ...msg,
          user: profileMap.get(msg.user_id),
        }));
        setMessages(messagesWithUsers);
      } else {
        setMessages([]);
      }
      console.log('✅ Messages loaded:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    console.log('🔔 Subscribing to video chat for room:', roomId);
    const channel = supabase
      .channel(`video_chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('💬 New message received:', payload.new);
          // Fetch user info for the new message
          const { data: userData } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', payload.new.user_id)
            .single();

          const newMsg = {
            ...payload.new as ChatMessage,
            user: userData,
          };
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe((status) => {
        console.log('📡 Video chat subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      console.log('📤 Sending message to room:', roomId);
      const { error } = await supabase
        .from('video_chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          message: newMessage.trim(),
        });

      if (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }
      console.log('✅ Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 pb-4">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-3 py-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.user_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="text-xs font-semibold mb-1">
                          {msg.user?.username || 'Anonymous'}
                        </div>
                      )}
                      <div className="text-sm break-words">{msg.message}</div>
                      <div
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="px-4 pt-3 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim() || sending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
