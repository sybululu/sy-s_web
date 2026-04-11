import { X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef, useState, useEffect } from 'react';

interface PolicyModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onAccept: () => void;
}

export default function PolicyModal({ isOpen, title, content, onClose, onAccept }: PolicyModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // If content is shorter than container, it's already at bottom
      if (scrollHeight <= clientHeight) {
        setScrollProgress(100);
        setIsScrolledToBottom(true);
        return;
      }
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
      if (progress > 99) {
        setIsScrolledToBottom(true);
      }
    }
  };

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setScrollProgress(0);
      setIsScrolledToBottom(false);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
        // Check immediately if content is short
        if (contentRef.current.scrollHeight <= contentRef.current.clientHeight) {
          setScrollProgress(100);
          setIsScrolledToBottom(true);
        }
      }
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white/90 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-white/50 relative z-10">
              <h3 className="font-serif text-xl font-medium text-ink tracking-tight">《{title}》</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/50 text-ink-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
              {/* Reading Progress Bar */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-slate-200/50 w-full">
                <div 
                  className="h-full bg-[#d97757] transition-all duration-150 ease-out" 
                  style={{ width: `${scrollProgress}%` }} 
                />
              </div>
            </div>

            {/* Content */}
            <div 
              ref={contentRef}
              onScroll={handleScroll}
              className="p-6 md:p-8 overflow-y-auto text-[15px] text-slate-700 leading-8 whitespace-pre-wrap custom-scrollbar relative"
            >
              {content}
            </div>

            {/* Bottom Gradient Fade (disappears when scrolled to bottom) */}
            <motion.div 
              animate={{ opacity: isScrolledToBottom ? 0 : 1 }}
              className="absolute bottom-[72px] left-0 w-full h-12 bg-gradient-to-t from-white/90 to-transparent pointer-events-none"
            />

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200/50 bg-white/60 flex justify-between items-center relative z-10">
              <div className="text-xs text-ink-muted flex items-center gap-2">
                {isScrolledToBottom ? (
                  <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> 已阅读完毕
                  </motion.span>
                ) : (
                  <span>请向下滚动阅读全文 ({Math.round(scrollProgress)}%)</span>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-slate-200/50 transition-colors">
                  取消
                </button>
                <button 
                  onClick={onAccept} 
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2 ${
                    isScrolledToBottom 
                      ? 'bg-ink text-white hover:bg-ink/90 hover:shadow-md active:scale-95' 
                      : 'bg-ink/80 text-white/90 hover:bg-ink'
                  }`}
                >
                  我已阅读并同意
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
