import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, ThumbsUp, ThumbsDown, Edit3, Copy, Check } from 'lucide-react';
import { Clause } from '../types';
import { useState, useEffect } from 'react';

interface DrawerProps {
  clause: Clause | null;
  isOpen: boolean;
  onClose: () => void;
  onAdopt: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function Drawer({ clause, isOpen, onClose, onAdopt, onShowToast }: DrawerProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (clause) {
      setEditedText(clause.suggestedText);
      setFeedback(null);
      setCopied(false);
    }
  }, [clause]);

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    if (type === 'up') {
      onShowToast?.('感谢反馈，已记录为正向样本');
    } else {
      onShowToast?.('感谢反馈，已记录为负向样本，模型将持续优化');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    onShowToast?.('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[900px] max-w-[95vw] bg-surface shadow-2xl z-[101] flex flex-col border-l border-slate-200"
          >
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-serif text-ink tracking-tight">RAG-mT5 自动改写引擎</h3>
                <p className="text-xs text-ink-muted font-mono mt-1">审查详情: {clause?.id}</p>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-surface-alt">
              {clause && (
                <>
                  <div>
                    <div className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-widest">风险类别</div>
                    <div className="text-lg font-serif text-ink">{clause.reason}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Sparkles className="w-4 h-4 text-[#d97757]" />
                        代码级对比
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted mr-2">模型反馈:</span>
                        <button 
                          onClick={() => handleFeedback('up')}
                          className={`p-1.5 rounded-md transition-colors ${feedback === 'up' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                          title="准确"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleFeedback('down')}
                          className={`p-1.5 rounded-md transition-colors ${feedback === 'down' ? 'bg-red-100 text-red-700' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                          title="存在幻觉/不准确"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden font-mono text-sm shadow-sm">
                      <div className="bg-white flex flex-col">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 flex justify-between items-center">
                          <span>原条款</span>
                          <span className="text-slate-400">{clause.location}</span>
                        </div>
                        <div className="flex flex-1">
                          <div 
                            className="p-4 bg-red-50/30 text-slate-700 leading-relaxed flex-1" 
                            dangerouslySetInnerHTML={{ __html: clause.diffOriginalHtml }} 
                          />
                        </div>
                      </div>
                      <div className="bg-white flex flex-col">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 flex justify-between items-center">
                          <span className="flex items-center gap-1.5 text-[#d97757]">mT5 建议条款</span>
                        </div>
                        <div className="flex flex-1">
                          <div 
                            className="p-4 bg-green-50/30 text-slate-900 leading-relaxed flex-1" 
                            dangerouslySetInnerHTML={{ __html: clause.diffSuggestedHtml }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Edit3 className="w-4 h-4 text-ink-muted" />
                        人工二次编辑
                      </div>
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? '已复制' : '复制内容'}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-ink focus-within:border-ink transition-all">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full p-4 min-h-[120px] text-sm text-ink leading-relaxed resize-y outline-none bg-transparent"
                        placeholder="在此处对模型建议进行最终微调..."
                      />
                      <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-end">
                        <span className="text-xs text-ink-muted">
                          {editedText.length} 字
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      <BookOpen className="w-4 h-4 text-ink-muted" />
                      合规依据
                    </div>
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-sm text-ink-muted leading-relaxed font-serif">
                        {clause.legalBasis}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 bg-white border-t border-slate-200 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-2.5 bg-white text-ink font-medium text-sm rounded-md border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                取消
              </button>
              <button 
                onClick={onAdopt}
                className="flex-1 py-2.5 bg-ink text-white font-medium text-sm rounded-md hover:bg-ink/90 transition-colors shadow-sm"
              >
                采纳并应用
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
