'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isPartial?: boolean;
}

interface UseVoiceAgentReturn {
  isConnected: boolean;
  isCallActive: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  agentName: string;
  language: string;
  transcript: TranscriptMessage[];
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  setLanguage: (lang: string) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [language, setLanguageState] = useState('en');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const partialTranscriptRef = useRef<string>('');

  // Track if socket was initialized to prevent StrictMode double initialization
  const socketInitializedRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (socketInitializedRef.current) {
      console.log('[Socket] Already initialized, skipping');
      return;
    }
    socketInitializedRef.current = true;

    console.log('[Socket] Initializing socket connection to', `${BACKEND_URL}/voice`);
    
    socketRef.current = io(`${BACKEND_URL}/voice`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('[Socket] Connected, id:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected, reason:', reason);
      setIsConnected(false);
      // Only reset call state if it was an unexpected disconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setIsCallActive(false);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('conversation_started', (data: { conversationId: string; agentName: string; language: string }) => {
      console.log('[Socket] Conversation started:', data);
      setAgentName(data.agentName);
      setLanguageState(data.language);
      setIsCallActive(true);
    });

    socket.on('conversation_ended', () => {
      console.log('[Socket] Conversation ended');
      setIsCallActive(false);
      setIsSpeaking(false);
      setIsListening(false);
    });

    socket.on('audio_delta', (data: { audio: string }) => {
      handleAudioDelta(data.audio);
    });

    socket.on('audio_done', () => {
      setIsSpeaking(false);
    });

    socket.on('transcript_delta', (data: { role: string; delta: string }) => {
      if (data.role === 'assistant') {
        setIsSpeaking(true);
        partialTranscriptRef.current += data.delta;
        updatePartialTranscript('assistant', partialTranscriptRef.current);
      }
    });

    socket.on('transcript_done', (data: { role: string; transcript: string }) => {
      if (data.role === 'assistant') {
        finalizeTranscript('assistant', data.transcript);
        partialTranscriptRef.current = '';
      }
    });

    socket.on('user_transcript', (data: { role: string; transcript: string }) => {
      addTranscript('user', data.transcript);
    });

    socket.on('speech_started', () => {
      setIsListening(true);
      // Interrupt agent if speaking
      if (isPlayingRef.current) {
        socket.emit('interrupt');
        audioQueueRef.current = [];
        setIsSpeaking(false);
      }
    });

    socket.on('speech_stopped', () => {
      setIsListening(false);
    });

    socket.on('language_updated', (data: { language: string; agentName: string }) => {
      setLanguageState(data.language);
      setAgentName(data.agentName);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Error:', data.message);
    });

    // Cleanup only on actual unmount, not on StrictMode re-render
    return () => {
      console.log('[Socket] Cleanup called');
      // Don't disconnect immediately - let the connection persist
      // socket.disconnect() will be called by endCall() when needed
    };
  }, []);

  const handleAudioDelta = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return;

    setIsSpeaking(true);
    
    // Decode base64 to PCM16 audio
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    audioQueueRef.current.push(float32);
    playAudioQueue();
  }, []);

  const playAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (!audioContextRef.current) return;

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    
    // Create a new Float32Array with explicit ArrayBuffer to fix TypeScript compatibility
    const channelData = new Float32Array(audioData.length);
    channelData.set(audioData);
    
    const audioBuffer = audioContextRef.current.createBuffer(1, channelData.length, 24000);
    audioBuffer.copyToChannel(channelData, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      playAudioQueue();
    };

    source.start();
  }, []);

  const updatePartialTranscript = useCallback((role: 'user' | 'assistant', content: string) => {
    setTranscript(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === role && lastMessage?.isPartial) {
        return [
          ...prev.slice(0, -1),
          { ...lastMessage, content }
        ];
      } else {
        return [
          ...prev,
          {
            id: `${Date.now()}-partial`,
            role,
            content,
            timestamp: new Date(),
            isPartial: true
          }
        ];
      }
    });
  }, []);

  const finalizeTranscript = useCallback((role: 'user' | 'assistant', content: string) => {
    setTranscript(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === role && lastMessage?.isPartial) {
        return [
          ...prev.slice(0, -1),
          {
            id: `${Date.now()}`,
            role,
            content,
            timestamp: new Date(),
            isPartial: false
          }
        ];
      }
      return prev;
    });
  }, []);

  const addTranscript = useCallback((role: 'user' | 'assistant', content: string) => {
    setTranscript(prev => [
      ...prev,
      {
        id: `${Date.now()}`,
        role,
        content,
        timestamp: new Date(),
        isPartial: false
      }
    ]);
  }, []);

  const startCall = useCallback(async () => {
    console.log('[startCall] Starting call...');
    try {
      // Request microphone access
      console.log('[startCall] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      console.log('[startCall] Microphone access granted');
      
      mediaStreamRef.current = stream;

      // Create audio context
      console.log('[startCall] Creating audio context...');
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Connect socket
      console.log('[startCall] Connecting socket...');
      socketRef.current?.connect();

      // Wait for connection
      await new Promise<void>((resolve) => {
        if (socketRef.current?.connected) {
          console.log('[startCall] Socket already connected');
          resolve();
        } else {
          socketRef.current?.once('connect', () => {
            console.log('[startCall] Socket connected via event');
            resolve();
          });
        }
      });

      // Start conversation
      console.log('[startCall] Emitting start_conversation with language:', language);
      socketRef.current?.emit('start_conversation', { language });

      // Set up audio processing
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Send to server - let OpenAI's VAD handle silence detection
        socketRef.current?.emit('audio_data', { audio: base64 });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;

      setTranscript([]);
      console.log('[startCall] Call setup complete');
    } catch (error) {
      console.error('[startCall] Error:', error);
    }
  }, [language]); // Removed isMuted - it's checked at runtime in onaudioprocess

  const endCall = useCallback(() => {
    console.log('[Socket] endCall called');
    socketRef.current?.emit('end_conversation');
    
    // Clean up audio
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Disconnect socket and reset initialization flag so it can be reused
    socketRef.current?.disconnect();
    socketInitializedRef.current = false;
    
    setIsCallActive(false);
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle to opposite
      });
    }
  }, [isMuted]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    if (isCallActive) {
      socketRef.current?.emit('update_language', { language: lang });
    }
  }, [isCallActive]);

  return {
    isConnected,
    isCallActive,
    isMuted,
    isSpeaking,
    isListening,
    agentName,
    language,
    transcript,
    startCall,
    endCall,
    toggleMute,
    setLanguage,
  };
}

