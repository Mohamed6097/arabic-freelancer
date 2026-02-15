import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/layout/Navbar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageBubble from '@/components/chat/MessageBubble';
import VoiceMessageRecorder from '@/components/chat/VoiceMessageRecorder';
import AttachmentButton from '@/components/chat/AttachmentButton';
import IncomingCallModal from '@/components/chat/IncomingCallModal';
import CallScreen from '@/components/chat/CallScreen';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import { containsPhoneNumber, getPhoneBlockMessage } from '@/lib/phoneValidator';
import { Send, MessageSquare, Search, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { sendMessageEmailNotification } from '@/lib/messageEmailNotification';

interface Conversation {
  id: string;
  full_name: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  lastMessageType: string;
  projectId?: string | null;
}

interface SharedProject {
  id: string;
  status: string;
  client_id: string;
  client_confirmed_complete: boolean;
  freelancer_confirmed_complete: boolean;
  freelancer_id?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  is_deleted: boolean;
  message_type: string;
  audio_url: string | null;
  audio_duration: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
}

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  callType: 'voice' | 'video';
}

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesWrapperRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const forceScrollToBottomRef = useRef(true);
  const oldestCursorRef = useRef<string | null>(null);
  const loadingMoreLockRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const lastShowScrollToBottomRef = useRef<boolean>(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const forceScrollBehaviorRef = useRef<ScrollBehavior>('auto');

  const PAGE_SIZE = 30;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [sharedProject, setSharedProject] = useState<SharedProject | null>(null);
  
  // Call states
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video'>('voice');

  const handleIncomingCall = useCallback((callData: IncomingCallData) => {
    setIncomingCall(callData);
  }, []);

  const {
    localStream,
    remoteStream,
    callStatus,
    isAudioMuted,
    isVideoMuted,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleAudio,
    toggleVideo
  } = useWebRTC({
    profileId: profile?.id,
    onIncomingCall: handleIncomingCall
  });

  // Handle URL param for direct conversation
  useEffect(() => {
    const recipientId = searchParams.get('recipient');
    if (recipientId && profile && conversations.length > 0) {
      const existing = conversations.find(c => c.id === recipientId);
      if (existing) {
        setSelectedConversation(existing);
        setShowMobileChat(true);
      }
    }
  }, [searchParams, profile, conversations]);

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
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation && profile) {
      // Reset per-conversation scroll/pagination state
      setHasMoreMessages(true);
      setLoadingMore(false);
      setShowScrollToBottom(false);
      setSharedProject(null);
      oldestCursorRef.current = null;
      isAtBottomRef.current = true;
      forceScrollToBottomRef.current = true;
      forceScrollBehaviorRef.current = 'auto';

      // Fetch messages immediately without clearing first (reduces perceived lag)
      fetchMessages({ reset: true });
      markMessagesAsRead();
      fetchSharedProject();
    }
  }, [selectedConversation, profile]);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior) => {
      const sentinel = bottomSentinelRef.current;
      const container = scrollContainerRef.current;
      requestAnimationFrame(() => {
        if (sentinel) {
          sentinel.scrollIntoView({ behavior, block: 'end' });
          return;
        }
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior });
        }
      });
    },
    []
  );

  // Keep anchored to bottom when content height changes (e.g. images / audio controls render)
  useEffect(() => {
    const wrap = messagesWrapperRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        scrollToLatest('auto');
      }
    });

    ro.observe(wrap);
    return () => ro.disconnect();
  }, [scrollToLatest]);

  useEffect(() => {
    // WhatsApp-like behavior: only auto-scroll if user is already at bottom
    // or when we explicitly force it (e.g., switching conversation / sending message)
    if (forceScrollToBottomRef.current || isAtBottomRef.current) {
      const behavior: ScrollBehavior = forceScrollToBottomRef.current
        ? forceScrollBehaviorRef.current
        : 'smooth';
      forceScrollToBottomRef.current = false;
      forceScrollBehaviorRef.current = 'auto';
      scrollToLatest(behavior);
    }
  }, [messages.length, selectedConversation?.id, scrollToLatest]);

  // Realtime subscription
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Always update conversations list cheaply (avoid refetching all messages each insert)
          const otherId = newMsg.sender_id === profile.id ? newMsg.receiver_id : newMsg.sender_id;
          const preview =
            newMsg.message_type === 'voice'
              ? '🎤 رسالة صوتية'
              : newMsg.message_type === 'attachment'
                ? '📎 مرفق'
                : newMsg.content;

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === otherId);
            if (idx === -1) return prev;
            const existing = prev[idx];
            const unreadInc = newMsg.receiver_id === profile.id && !newMsg.is_read ? 1 : 0;
            const updated: Conversation = {
              ...existing,
              lastMessage: preview,
              lastMessageTime: newMsg.created_at,
              lastMessageType: newMsg.message_type,
              unreadCount: existing.unreadCount + unreadInc,
            };
            const next = prev.slice();
            next.splice(idx, 1);
            return [updated, ...next];
          });

          // If this conversation isn't in the list yet, fall back to a full refresh (non-blocking)
          if (!conversationsRef.current.some((c) => c.id === otherId)) {
            fetchConversations();
          }

          // Only append to the open chat if the message belongs to it
          if (
            selectedConversation &&
            (newMsg.sender_id === selectedConversation.id || newMsg.receiver_id === selectedConversation.id)
          ) {
            setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));

            // Auto-scroll if user is at bottom (or it's our own message)
            if (isAtBottomRef.current || newMsg.sender_id === profile.id) {
              forceScrollToBottomRef.current = true;
              forceScrollBehaviorRef.current = 'smooth';
            }

            if (newMsg.receiver_id === profile.id) {
              markMessagesAsRead();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedConversation]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      scrollToLatest(behavior);
    },
    [scrollToLatest]
  );

  const jumpToLatest = useCallback(() => {
    isAtBottomRef.current = true;
    forceScrollToBottomRef.current = true;
    forceScrollBehaviorRef.current = 'auto';
    setShowScrollToBottom(false);
    scrollToLatest('auto');
  }, [scrollToLatest]);

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
          lastMessage: msg as Message,
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
          lastMessage: data.lastMessage.message_type === 'voice' 
            ? '🎤 رسالة صوتية' 
            : data.lastMessage.content,
          lastMessageTime: data.lastMessage.created_at,
          unreadCount: data.unreadCount,
          lastMessageType: data.lastMessage.message_type,
        };
      });
      convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(convs);

      // Auto-select first conversation if none selected
      if (!selectedConversation && convs.length > 0) {
        const recipientId = searchParams.get('recipient');
        const toSelect = recipientId 
          ? convs.find(c => c.id === recipientId) || convs[0]
          : null;
        if (toSelect) {
          setSelectedConversation(toSelect);
        }
      }
    }
    setLoading(false);
  };

  const fetchMessages = useCallback(async (opts?: { reset?: boolean }) => {
    const profileId = profile?.id;
    const otherId = selectedConversation?.id;
    if (!profileId || !otherId) return;

    // Load latest messages page (DESC -> reverse to display ASC)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${profileId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${profileId})`
      )
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    const batch = (data as Message[] | null) ?? [];
    const ordered = batch.slice().reverse();
    
    // Update messages immediately
    setMessages(ordered);
    oldestCursorRef.current = ordered[0]?.created_at ?? null;
    setHasMoreMessages(batch.length === PAGE_SIZE);

    if (opts?.reset) {
      forceScrollToBottomRef.current = true;
      forceScrollBehaviorRef.current = 'auto';
    }
  }, [profile?.id, selectedConversation?.id]);

  const loadOlderMessages = useCallback(async () => {
    if (!profile || !selectedConversation) return;
    if (!hasMoreMessages || loadingMore || loadingMoreLockRef.current) return;
    if (!oldestCursorRef.current) return;

    const el = scrollContainerRef.current;
    if (!el) return;

    loadingMoreLockRef.current = true;
    setLoadingMore(true);
    isAtBottomRef.current = false;
    setShowScrollToBottom(true);

    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${profile.id},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${profile.id})`
        )
        .lt('created_at', oldestCursorRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      const batch = (data as Message[] | null) ?? [];
      const ordered = batch.slice().reverse();

      if (ordered.length > 0) {
        oldestCursorRef.current = ordered[0]?.created_at ?? oldestCursorRef.current;
        setMessages((prev) => [...ordered, ...prev]);
      }

      setHasMoreMessages(batch.length === PAGE_SIZE);

      // Preserve scroll position after prepending messages
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      });
    } finally {
      setLoadingMore(false);
      loadingMoreLockRef.current = false;
    }
  }, [profile, selectedConversation, hasMoreMessages, loadingMore]);

  const handleMessagesScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Throttle scroll handler work to animation frames to avoid jank
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;

      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = remaining < 80;
      const atTop = el.scrollTop < 40;

      isAtBottomRef.current = atBottom;

      const nextShow = !atBottom;
      if (lastShowScrollToBottomRef.current !== nextShow) {
        lastShowScrollToBottomRef.current = nextShow;
        setShowScrollToBottom(nextShow);
      }

      if (atTop) {
        loadOlderMessages();
      }
    });
  }, [loadOlderMessages]);

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

  const fetchSharedProject = async () => {
    if (!profile || !selectedConversation) return;

    // Find projects where the current user is client and other is freelancer (accepted proposal)
    // OR current user is freelancer and other is client
    const { data: projectAsClient } = await supabase
      .from('projects')
      .select('id, status, client_id, client_confirmed_complete, freelancer_confirmed_complete')
      .eq('client_id', profile.id)
      .eq('status', 'in_progress')
      .limit(1);

    if (projectAsClient && projectAsClient.length > 0) {
      // Check if there's an accepted proposal from the selected conversation user
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id, freelancer_id')
        .eq('project_id', projectAsClient[0].id)
        .eq('freelancer_id', selectedConversation.id)
        .eq('status', 'accepted')
        .single();

      if (proposal) {
        setSharedProject({
          ...projectAsClient[0],
          freelancer_id: proposal.freelancer_id,
        });
        return;
      }
    }

    // Check if current user is freelancer on a project owned by the conversation partner
    const { data: projectAsFreelancer } = await supabase
      .from('projects')
      .select('id, status, client_id, client_confirmed_complete, freelancer_confirmed_complete')
      .eq('client_id', selectedConversation.id)
      .eq('status', 'in_progress')
      .limit(1);

    if (projectAsFreelancer && projectAsFreelancer.length > 0) {
      // Check if current user has an accepted proposal
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id, freelancer_id')
        .eq('project_id', projectAsFreelancer[0].id)
        .eq('freelancer_id', profile.id)
        .eq('status', 'accepted')
        .single();

      if (proposal) {
        setSharedProject({
          ...projectAsFreelancer[0],
          freelancer_id: proposal.freelancer_id,
        });
        return;
      }
    }

    setSharedProject(null);
  };

  const handleConfirmProjectComplete = async () => {
    if (!profile || !sharedProject) return;

    const isClient = sharedProject.client_id === profile.id;
    const updateField = isClient ? 'client_confirmed_complete' : 'freelancer_confirmed_complete';

    const { error } = await supabase
      .from('projects')
      .update({ [updateField]: true })
      .eq('id', sharedProject.id);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تأكيد الإتمام',
        variant: 'destructive',
      });
      return;
    }

    // Refetch project to get updated status
    await fetchSharedProject();

    const bothConfirmed = isClient 
      ? sharedProject.freelancer_confirmed_complete 
      : sharedProject.client_confirmed_complete;

    if (bothConfirmed) {
      toast({
        title: 'تم إتمام المشروع! 🎉',
        description: 'تهانينا! تم إتمام المشروع بنجاح وسيظهر في المشاريع المكتملة.',
      });
    } else {
      toast({
        title: 'تم تأكيد الإتمام',
        description: 'في انتظار تأكيد الطرف الآخر',
      });
    }
  };

  const sendEmailNotification = async (receiverId: string, senderName: string, messagePreview: string) => {
    const result = await sendMessageEmailNotification({ receiverId, senderName, messagePreview });
    if (result.ok === false) {
      // Silently log error - don't show toast since message was sent successfully
      console.error('Failed to send email notification:', result.error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !selectedConversation) return;

    // Check for phone numbers
    if (containsPhoneNumber(newMessage)) {
      toast({
        title: 'غير مسموح',
        description: getPhoneBlockMessage(),
        variant: 'destructive',
      });
      return;
    }

    const messageContent = newMessage.trim();
    
    // Clear input immediately for instant feedback
    setNewMessage('');
    setSending(true);

    // Optimistic update - add message to UI immediately
    const messageId =
      typeof globalThis !== 'undefined' &&
      'crypto' in globalThis &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).crypto?.randomUUID
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).crypto.randomUUID()
        : `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const optimisticMessage: Message = {
      id: messageId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: profile.id,
      receiver_id: selectedConversation.id,
      is_read: false,
      is_deleted: false,
      message_type: 'text',
      audio_url: null,
      audio_duration: null,
      attachment_url: null,
      attachment_name: null,
      attachment_type: null,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    forceScrollToBottomRef.current = true;
    forceScrollBehaviorRef.current = 'smooth';

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          sender_id: profile.id,
          receiver_id: selectedConversation.id,
          content: messageContent,
          message_type: 'text',
        })
        .select('*')
        .single();

      if (insertError || !inserted) {
        throw insertError ?? new Error('Insert failed');
      }

      // Replace optimistic message with server version (canonical timestamp)
      setMessages((prev) => prev.map((m) => (m.id === messageId ? (inserted as Message) : m)));

      // Update conversations preview instantly
      const preview = inserted.message_type === 'voice' ? '🎤 رسالة صوتية' : inserted.content;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === selectedConversation.id);
        if (idx === -1) return prev;
        const existing = prev[idx];
        const updated: Conversation = {
          ...existing,
          lastMessage: preview,
          lastMessageTime: inserted.created_at,
          lastMessageType: inserted.message_type,
        };
        const next = prev.slice();
        next.splice(idx, 1);
        return [updated, ...next];
      });

      // Fire and forget email notification (non-blocking)
      sendEmailNotification(selectedConversation.id, profile.full_name, messageContent).catch(console.error);
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({
        title: 'خطأ',
        description: 'تعذر إرسال الرسالة',
        variant: 'destructive',
      });
      setNewMessage(messageContent); // Restore message
      setSending(false);
      return;
    }

    setSending(false);
  };

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!profile || !selectedConversation) return;

    setSending(true);

    try {
      // Upload audio to storage
      const fileName = `${profile.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      // Insert message
       const { error: insertError } = await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: selectedConversation.id,
        content: '🎤 رسالة صوتية',
        message_type: 'voice',
        audio_url: urlData.publicUrl,
        audio_duration: duration,
      });

       if (!insertError) {
         // Fire and forget (avoid UI lag)
         sendEmailNotification(selectedConversation.id, profile.full_name, '🎤 رسالة صوتية').catch(console.error);
       }

    } catch (error) {
      console.error('Error sending voice message:', error);
    }

    setSending(false);
  };

  const handleVoiceCall = () => {
    if (selectedConversation) {
      setActiveCallType('voice');
      startCall(selectedConversation.id, selectedConversation.full_name, 'voice');
    }
  };

  const handleVideoCall = () => {
    if (selectedConversation) {
      setActiveCallType('video');
      startCall(selectedConversation.id, selectedConversation.full_name, 'video');
    }
  };

  const handleAnswerCall = () => {
    if (incomingCall) {
      setActiveCallType(incomingCall.callType);
      answerCall(incomingCall.callId);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall(incomingCall.callId);
      setIncomingCall(null);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background" dir="rtl">
      <Navbar />
      
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex lg:container lg:px-4 lg:py-4 min-h-0 overflow-hidden w-full max-w-full">
          <div className="flex-1 flex lg:gap-4 bg-card lg:rounded-xl overflow-hidden lg:shadow-lg lg:border min-h-0 w-full max-w-full">
            {/* Conversations List */}
            <div className={`w-full lg:w-80 xl:w-96 lg:border-l flex flex-col min-h-0 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-3 sm:p-4 border-b shrink-0 bg-card">
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  المحادثات
                </h2>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                {loading ? (
                  <div className="space-y-4 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-12 w-12 rounded-full bg-muted"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-3/4 mt-2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا توجد محادثات بعد</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b ${
                        selectedConversation?.id === conv.id ? 'bg-muted' : ''
                      }`}
                    >
                      <Avatar className="h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={conv.avatar_url || ''} />
                        <AvatarFallback className="text-base">{conv.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate text-sm sm:text-base">{conv.full_name}</p>
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(conv.lastMessageTime), 'HH:mm', { locale: ar })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5 sm:mt-1 gap-2">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <Card className={`flex-1 flex flex-col border-0 rounded-none min-h-0 w-full max-w-full overflow-hidden ${!showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                <ChatHeader
                  name={selectedConversation.full_name}
                  avatar={selectedConversation.avatar_url}
                  onBack={() => setShowMobileChat(false)}
                  onVoiceCall={handleVoiceCall}
                  onVideoCall={handleVideoCall}
                  showCompleteButton={!!sharedProject && sharedProject.status === 'in_progress'}
                  hasConfirmedComplete={
                    sharedProject
                      ? sharedProject.client_id === profile?.id
                        ? sharedProject.client_confirmed_complete
                        : sharedProject.freelancer_confirmed_complete
                      : false
                  }
                  otherPartyConfirmed={
                    sharedProject
                      ? sharedProject.client_id === profile?.id
                        ? sharedProject.freelancer_confirmed_complete
                        : sharedProject.client_confirmed_complete
                      : false
                  }
                  onConfirmComplete={handleConfirmProjectComplete}
                  isProjectCompleted={sharedProject?.status === 'completed'}
                />
                
                <CardContent className="relative flex-1 flex flex-col p-0 overflow-hidden min-h-0 w-full max-w-full">
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleMessagesScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    <div className="min-h-full p-2 sm:p-4 flex flex-col">
                      {/* Load more indicator */}
                      {hasMoreMessages && (
                        <div className="flex justify-center py-3">
                          {loadingMore ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                              <span className="text-xs">جارٍ تحميل رسائل أقدم...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                              <ChevronDown className="h-3 w-3 rotate-180" />
                              <span className="text-xs">اسحب للأعلى لعرض رسائل أقدم</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        ref={messagesWrapperRef}
                        className="flex-1 flex flex-col justify-end gap-2 sm:gap-3"
                      >
                        {/* Messages */}
                        {messages.length === 0 && !loading ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm">لا توجد رسائل بعد</p>
                            <p className="text-muted-foreground text-xs mt-1">ابدأ المحادثة الآن!</p>
                          </div>
                        ) : (
                          messages.map((msg) => (
                            <MessageBubble
                              key={msg.id}
                              id={msg.id}
                              content={msg.content}
                              messageType={msg.message_type as 'text' | 'voice' | 'attachment'}
                              audioUrl={msg.audio_url}
                              audioDuration={msg.audio_duration}
                              attachmentUrl={msg.attachment_url}
                              attachmentName={msg.attachment_name}
                              attachmentType={msg.attachment_type}
                              timestamp={msg.created_at}
                              isOwn={msg.sender_id === profile?.id}
                              isRead={msg.is_read}
                              isDeleted={msg.is_deleted}
                              onUpdate={fetchMessages}
                            />
                          ))
                        )}

                        {/* Scroll anchor */}
                        <div ref={bottomSentinelRef} className="h-px w-full" aria-hidden />
                      </div>
                    </div>
                  </div>

                  {/* Scroll to bottom button */}
                  {showScrollToBottom && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24 z-10">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full shadow-lg border flex items-center gap-1 px-3"
                        onClick={jumpToLatest}
                      >
                        <ChevronDown className="h-4 w-4" />
                        <span className="text-xs">الرسائل الجديدة</span>
                      </Button>
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="p-2 sm:p-3 border-t flex items-center gap-1.5 sm:gap-2 bg-card shrink-0 w-full max-w-full">
                    <VoiceMessageRecorder 
                      onSend={handleSendVoiceMessage}
                      disabled={sending}
                    />
                    <AttachmentButton
                      profileId={profile?.id || ''}
                      senderName={profile?.full_name || ''}
                      receiverId={selectedConversation.id}
                      onSent={fetchMessages}
                      disabled={sending}
                    />
                    <Input
                      placeholder="اكتب رسالتك..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sending}
                      className="flex-1 min-w-0 h-9 sm:h-10 text-sm sm:text-base"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-xl font-medium mb-2">اختر محادثة للبدء</p>
                  <p className="text-muted-foreground">اختر محادثة من القائمة أو ابدأ محادثة جديدة</p>
                </div>
              </CardContent>
            )}
          </Card>
          </div>
        </div>
      </main>

      {/* Incoming Call Modal */}
      <IncomingCallModal
        isOpen={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar || null}
        callType={incomingCall?.callType || 'voice'}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
      />

      {/* Active Call Screen */}
      <CallScreen
        isOpen={callStatus !== 'idle' && callStatus !== 'ended'}
        callType={activeCallType}
        callStatus={callStatus}
        remoteName={selectedConversation?.full_name || incomingCall?.callerName || ''}
        remoteAvatar={selectedConversation?.avatar_url || incomingCall?.callerAvatar || null}
        localStream={localStream}
        remoteStream={remoteStream}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        onEndCall={endCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
      />
    </div>
  );
};

export default Messages;
