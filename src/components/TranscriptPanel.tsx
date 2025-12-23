'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Mic } from 'lucide-react';
import { TranscriptMessage } from '@/hooks/useVoiceAgent';

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  agentName: string;
  isListening: boolean;
  isSpeaking: boolean;
}

export function TranscriptPanel({ messages, agentName, isListening, isSpeaking }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="font-semibold text-white">Conversation</h3>
        <p className="text-xs text-white/40">Real-time transcript</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-white/30 py-8">
            <p>Start a conversation to see the transcript</p>
          </div>
        ) : (
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-accent-500/20 text-accent-400' 
                  : 'bg-primary-500/20 text-primary-400'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message bubble */}
              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className="text-xs text-white/40 mb-1">
                  {message.role === 'user' ? 'You' : agentName || 'Assistant'}
                </div>
                <div className={`inline-block px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                  message.role === 'user'
                    ? 'bg-accent-500/20 text-white rounded-tr-sm'
                    : 'bg-white/5 text-white/90 rounded-tl-sm'
                } ${message.isPartial ? 'opacity-70' : ''}`}>
                  {message.content}
                  {message.isPartial && (
                    <span className="inline-block ml-1">
                      <span className="typing-dot inline-block w-1 h-1 bg-current rounded-full mx-0.5" />
                      <span className="typing-dot inline-block w-1 h-1 bg-current rounded-full mx-0.5" />
                      <span className="typing-dot inline-block w-1 h-1 bg-current rounded-full mx-0.5" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/20 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))
        )}

        {/* Listening indicator */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 flex-row-reverse"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-white/40 mb-1">You</div>
              <div className="inline-block px-4 py-2 rounded-2xl bg-accent-500/10 border border-accent-500/20 rounded-tr-sm">
                <div className="flex items-center gap-2 text-accent-400 text-sm">
                  <span>Listening</span>
                  <span className="flex gap-1">
                    <span className="typing-dot w-1.5 h-1.5 bg-accent-400 rounded-full" />
                    <span className="typing-dot w-1.5 h-1.5 bg-accent-400 rounded-full" />
                    <span className="typing-dot w-1.5 h-1.5 bg-accent-400 rounded-full" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Speaking indicator (when no partial transcript yet) */}
        {isSpeaking && !messages.some(m => m.isPartial && m.role === 'assistant') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-white/40 mb-1">{agentName || 'Assistant'}</div>
              <div className="inline-block px-4 py-2 rounded-2xl bg-primary-500/10 border border-primary-500/20 rounded-tl-sm">
                <div className="flex items-center gap-2 text-primary-400 text-sm">
                  <span>Speaking</span>
                  <span className="flex gap-1">
                    <span className="typing-dot w-1.5 h-1.5 bg-primary-400 rounded-full" />
                    <span className="typing-dot w-1.5 h-1.5 bg-primary-400 rounded-full" />
                    <span className="typing-dot w-1.5 h-1.5 bg-primary-400 rounded-full" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

