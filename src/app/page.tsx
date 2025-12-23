'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  MessageSquare,
  User,
  Clock,
  Globe,
  Sparkles,
  Activity
} from 'lucide-react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Home() {
  const {
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
  } = useVoiceAgent();

  const [showTranscript, setShowTranscript] = useState(true);

  return (
    <main className="h-screen gradient-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-card border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Natural Clinic</h1>
              <p className="text-xs text-white/50">AI Voice Agent</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSelector 
              language={language} 
              onChange={setLanguage}
              disabled={isCallActive}
            />
            
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`p-2 rounded-lg transition-all ${
                showTranscript 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Call Interface - Fixed position, doesn't scroll with transcript */}
        <div className={`flex-1 flex flex-col items-center justify-center p-8 transition-all min-h-0 ${
          showTranscript ? 'lg:pr-4' : ''
        }`}>
          {/* Agent Avatar */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-8"
          >
            {/* Outer glow rings */}
            {isCallActive && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary-500/20"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ width: 200, height: 200, left: -20, top: -20 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary-500/10"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  style={{ width: 200, height: 200, left: -20, top: -20 }}
                />
              </>
            )}
            
            {/* Avatar container */}
            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
              isCallActive 
                ? 'bg-gradient-to-br from-primary-500/30 to-primary-700/30 glow-green' 
                : 'bg-white/5'
            }`}>
              {isCallActive && isSpeaking ? (
                <WaveformVisualizer isActive={isSpeaking} />
              ) : (
                <User className={`w-16 h-16 ${isCallActive ? 'text-primary-400' : 'text-white/30'}`} />
              )}
            </div>

            {/* Status indicator */}
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${
              isCallActive 
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isCallActive ? 'bg-primary-400 animate-pulse' : 'bg-white/30'
              }`} />
              {isCallActive ? (isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Connected') : 'Offline'}
            </div>
          </motion.div>

          {/* Agent Info */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isCallActive ? agentName || 'AI Assistant' : 'Start a Conversation'}
            </h2>
            <p className="text-white/50 max-w-md">
              {isCallActive 
                ? 'Speaking with Natural Clinic AI Assistant'
                : 'Click the button below to speak with our AI assistant about medical treatments'}
            </p>
          </motion.div>

          {/* Call Controls */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            {!isCallActive ? (
              <button
                onClick={startCall}
                className="group relative px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl text-white font-semibold text-lg shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-105 active:scale-95 pulse-glow"
              >
                <span className="flex items-center gap-3">
                  <Phone className="w-5 h-5" />
                  Start Conversation
                </span>
              </button>
            ) : (
              <>
                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-2xl transition-all ${
                    isMuted 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* End call button */}
                <button
                  onClick={endCall}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl text-white font-semibold shadow-xl shadow-red-500/25 hover:shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-3">
                    <PhoneOff className="w-5 h-5" />
                    End Call
                  </span>
                </button>
              </>
            )}
          </motion.div>

          {/* Call Stats */}
          {isCallActive && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex items-center gap-6 text-sm text-white/40"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <CallTimer />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="uppercase">{language}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-400" />
                <span className="text-primary-400">Active</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Transcript Panel - Fixed height, scrolls internally */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden lg:flex lg:flex-col border-l border-white/5 h-full overflow-hidden"
            >
              <TranscriptPanel 
                messages={transcript} 
                agentName={agentName}
                isListening={isListening}
                isSpeaking={isSpeaking}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Transcript - Fixed height at bottom */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 300, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t border-white/5 flex-shrink-0 overflow-hidden"
          >
            <TranscriptPanel 
              messages={transcript}
              agentName={agentName}
              isListening={isListening}
              isSpeaking={isSpeaking}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function CallTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span>
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

