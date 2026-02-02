import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/layout/Navbar';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Conversation {
  id: string;
  full_name: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
}

const Messages = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchConversations();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedConversation && profile) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedConversation, profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === profile.id || newMsg.receiver_id === profile.id) &&
            selectedConversation &&
            (newMsg.sender_id === selectedConversation.id || newMsg.receiver_id === selectedConversation.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.receiver_id === profile.id) {
              markMessagesAsRead();
            }
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    if (!profile) return;

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!messagesData) {
      setLoading(false);
      return;
    }

    const conversationMap = new Map<string, { lastMessage: Message; unreadCount: number }>();

    messagesData.forEach((msg) => {
      const otherId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          lastMessage: msg,
          unreadCount: msg.receiver_id === profile.id && !msg.is_read ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(otherId)!;
        if (msg.receiver_id === profile.id && !msg.is_read) {
          existing.unreadCount++;
        }
      }
    });

    const profileIds = Array.from(conversationMap.keys());
    if (profileIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', profileIds);

    if (profiles) {
      const convs: Conversation[] = profiles.map((p) => {
        const data = conversationMap.get(p.id)!;
        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          lastMessage: data.lastMessage.content,
          lastMessageTime: data.lastMessage.created_at,
          unreadCount: data.unreadCount,
        };
      });
      convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(convs);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!profile || !selectedConversation) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${profile.id},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${profile.id})`
      )
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async () => {
    if (!profile || !selectedConversation) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', selectedConversation.id)
      .eq('receiver_id', profile.id)
      .eq('is_read', false);

    fetchConversations();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !selectedConversation) return;

    setSending(true);

    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedConversation.id,
      content: newMessage.trim(),
    });

    setNewMessage('');
    setSending(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-12rem)]">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                المحادثات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-18rem)]">
                {loading ? (
                  <div className="space-y-4 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-muted"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-3/4 mt-2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا توجد محادثات بعد</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-right ${
                        selectedConversation?.id === conv.id ? 'bg-muted' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={conv.avatar_url || ''} />
                        <AvatarFallback>{conv.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conv.full_name}</p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedConversation.avatar_url || ''} />
                      <AvatarFallback>{selectedConversation.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{selectedConversation.full_name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === profile?.id ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              msg.sender_id === profile?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_id === profile?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {format(new Date(msg.created_at), 'HH:mm', { locale: ar })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                    <Input
                      placeholder="اكتب رسالتك..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sending}
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">اختر محادثة للبدء</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
