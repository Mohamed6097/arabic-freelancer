import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWebRTCOptions {
  profileId: string | undefined;
  onIncomingCall?: (callData: IncomingCallData) => void;
}

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  callType: 'voice' | 'video';
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  currentCallId: string | null;
  startCall: (receiverId: string, receiverName: string, callType: 'voice' | 'video') => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ profileId, onIncomingCall }: UseWebRTCOptions): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentCallTypeRef = useRef<'voice' | 'video'>('voice');

  // Listen for incoming calls
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`calls-${profileId}`)
      .on('broadcast', { event: 'incoming-call' }, async (payload) => {
        console.log('Incoming call:', payload);
        const { callId, callerId, callerName, callerAvatar, callType, offer } = payload.payload;
        
        if (callStatus !== 'idle') {
          // Already in a call, auto-reject
          await supabase.channel(`calls-${callerId}`).send({
            type: 'broadcast',
            event: 'call-rejected',
            payload: { callId }
          });
          return;
        }
        
        setCurrentCallId(callId);
        currentCallTypeRef.current = callType;
        setCallStatus('ringing');
        
        // Store offer for later
        sessionStorage.setItem(`call-offer-${callId}`, JSON.stringify(offer));
        
        onIncomingCall?.({
          callId,
          callerId,
          callerName,
          callerAvatar,
          callType
        });
      })
      .on('broadcast', { event: 'call-answered' }, async (payload) => {
        console.log('Call answered:', payload);
        const { answer } = payload.payload;
        
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus('connected');
        }
      })
      .on('broadcast', { event: 'call-rejected' }, () => {
        console.log('Call rejected');
        cleanup();
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      })
      .on('broadcast', { event: 'call-ended' }, () => {
        console.log('Call ended by remote');
        cleanup();
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        const { candidate } = payload.payload;
        if (peerConnectionRef.current && candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, callStatus, onIncomingCall]);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setCurrentCallId(null);
  }, [localStream]);

  const startCall = useCallback(async (receiverId: string, receiverName: string, callType: 'voice' | 'video') => {
    if (!profileId) return;

    try {
      setCallStatus('calling');
      currentCallTypeRef.current = callType;

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Remote track received');
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.channel(`calls-${receiverId}`).send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON() }
          });
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Get caller profile info
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', profileId)
        .single();

      // Create call log
      const { data: callLog } = await supabase
        .from('call_logs')
        .insert({
          caller_id: profileId,
          receiver_id: receiverId,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();

      if (callLog) {
        setCurrentCallId(callLog.id);
      }

      // Send call invitation
      await supabase.channel(`calls-${receiverId}`).send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callId: callLog?.id,
          callerId: profileId,
          callerName: callerProfile?.full_name || 'Unknown',
          callerAvatar: callerProfile?.avatar_url,
          callType,
          offer: pc.localDescription?.toJSON()
        }
      });

    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
      setCallStatus('idle');
    }
  }, [profileId, cleanup]);

  const answerCall = useCallback(async (callId: string) => {
    if (!profileId) return;

    try {
      const offerJson = sessionStorage.getItem(`call-offer-${callId}`);
      if (!offerJson) {
        console.error('No offer found for call');
        return;
      }
      const offer = JSON.parse(offerJson);
      sessionStorage.removeItem(`call-offer-${callId}`);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: currentCallTypeRef.current === 'video'
      });
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Remote track received');
        setRemoteStream(event.streams[0]);
      };

      // Get caller ID from call log
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('caller_id')
        .eq('id', callId)
        .single();

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate && callLog) {
          await supabase.channel(`calls-${callLog.caller_id}`).send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON() }
          });
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Update call log
      await supabase
        .from('call_logs')
        .update({ status: 'ongoing', started_at: new Date().toISOString() })
        .eq('id', callId);

      // Send answer back
      if (callLog) {
        await supabase.channel(`calls-${callLog.caller_id}`).send({
          type: 'broadcast',
          event: 'call-answered',
          payload: {
            callId,
            answer: pc.localDescription?.toJSON()
          }
        });
      }

      setCallStatus('connected');

    } catch (error) {
      console.error('Error answering call:', error);
      cleanup();
      setCallStatus('idle');
    }
  }, [profileId, cleanup]);

  const endCall = useCallback(async () => {
    if (currentCallId) {
      // Get the other party's ID
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('caller_id, receiver_id, started_at')
        .eq('id', currentCallId)
        .single();

      if (callLog) {
        const otherId = callLog.caller_id === profileId ? callLog.receiver_id : callLog.caller_id;
        
        // Calculate duration
        const duration = callLog.started_at 
          ? Math.floor((Date.now() - new Date(callLog.started_at).getTime()) / 1000)
          : 0;

        // Update call log
        await supabase
          .from('call_logs')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            duration
          })
          .eq('id', currentCallId);

        // Notify other party
        await supabase.channel(`calls-${otherId}`).send({
          type: 'broadcast',
          event: 'call-ended',
          payload: { callId: currentCallId }
        });
      }
    }

    cleanup();
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 2000);
  }, [currentCallId, profileId, cleanup]);

  const rejectCall = useCallback(async (callId: string) => {
    // Get caller ID
    const { data: callLog } = await supabase
      .from('call_logs')
      .select('caller_id')
      .eq('id', callId)
      .single();

    if (callLog) {
      // Update call log
      await supabase
        .from('call_logs')
        .update({ status: 'rejected' })
        .eq('id', callId);

      // Notify caller
      await supabase.channel(`calls-${callLog.caller_id}`).send({
        type: 'broadcast',
        event: 'call-rejected',
        payload: { callId }
      });
    }

    sessionStorage.removeItem(`call-offer-${callId}`);
    setCallStatus('idle');
    setCurrentCallId(null);
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    callStatus,
    isAudioMuted,
    isVideoMuted,
    currentCallId,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleAudio,
    toggleVideo
  };
};
