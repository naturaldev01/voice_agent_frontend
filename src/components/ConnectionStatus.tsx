'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { ConnectionState } from '@/hooks/useVoiceAgent';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  connectionError: string | null;
  onReconnect: () => void;
}

export function ConnectionStatus({
  connectionState,
  connectionError,
  onReconnect,
}: ConnectionStatusProps) {
  // Don't show anything when connected
  if (connectionState === 'connected' || connectionState === 'disconnected') {
    return null;
  }

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          bgColor: 'bg-blue-500/20 border-blue-500/30',
          textColor: 'text-blue-400',
          message: 'Connecting to server...',
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          bgColor: 'bg-yellow-500/20 border-yellow-500/30',
          textColor: 'text-yellow-400',
          message: connectionError || 'Reconnecting...',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          bgColor: 'bg-red-500/20 border-red-500/30',
          textColor: 'text-red-400',
          message: connectionError || 'Connection error',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${config.bgColor}`}
        >
          <span className={config.textColor}>{config.icon}</span>
          <span className={`text-sm font-medium ${config.textColor}`}>
            {config.message}
          </span>
          {connectionState === 'error' && (
            <button
              onClick={onReconnect}
              className="ml-2 px-3 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

