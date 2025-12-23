'use client';

import { motion } from 'framer-motion';

interface WaveformVisualizerProps {
  isActive: boolean;
}

export function WaveformVisualizer({ isActive }: WaveformVisualizerProps) {
  const bars = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((bar, index) => (
        <motion.div
          key={bar}
          className="w-1.5 rounded-full bg-gradient-to-t from-primary-500 to-primary-300"
          initial={{ height: 8 }}
          animate={isActive ? {
            height: [8, 24 + Math.random() * 16, 8],
          } : { height: 8 }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: isActive ? Infinity : 0,
            delay: index * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

