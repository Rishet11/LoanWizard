'use client';
import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';

export function DocumentCaptureOverlay({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
    >
      <div className="text-center text-white max-w-sm w-full px-6">
        <p className="text-lg font-semibold mb-6">Hold your document up to the camera</p>
        <div className="relative mx-auto w-64 h-40 rounded-lg border-2 border-dashed border-white/60 flex items-center justify-center">
          <motion.div
            animate={{ y: [0, 128, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-green-400"
          />
          <ScanLine size={32} className="text-white/50" />
        </div>
        <p className="text-sm text-white/70 mt-4">Keep the document flat and well-lit</p>
        <button
          onClick={onDone}
          className="mt-6 px-6 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
