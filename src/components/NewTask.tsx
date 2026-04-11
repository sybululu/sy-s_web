import { Upload, Globe, FileText, ArrowRight } from 'lucide-react';

interface NewTaskProps {
  onStartAnalysis: (type: string, value: string) => void;
}

export default function NewTask({ onStartAnalysis }: NewTaskProps) {
  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full">
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-serif text-ink tracking-tight mb-2">新建审查任务</h2>
        <p className="text-ink-muted text-sm">支持多格式文本、PDF 及 URL 实时抓取审计</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        {/* Left: File Upload */}
        <div 
          onClick={() => onStartAnalysis('file', 'Privacy_Policy_V3.docx')}
          className="lg:col-span-3 border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center bg-surface-alt hover:border-[#d97757] hover:bg-[#d97757]/5 transition-all cursor-pointer group relative overflow-hidden h-full"
        >
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-ink mb-6 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-2xl font-serif text-ink mb-3">点击或拖拽文件至此处</h4>
            <p className="text-sm text-ink-muted mb-8 max-w-md leading-relaxed">
              支持 PDF, DOCX, TXT 格式，单文件最大 20MB。<br/>
              系统将自动解析文本内容并进行向量化处理，调用 RAG-mT5 引擎进行深度合规审查。
            </p>
            <button className="bg-white border border-slate-200 px-6 py-2.5 rounded-lg text-sm font-medium text-ink transition-colors hover:bg-slate-50 shadow-sm flex items-center gap-2">
              浏览本地文件 <ArrowRight className="w-4 h-4 text-ink-muted" />
            </button>
          </div>
        </div>

        {/* Right: URL & Text Input */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
          <div className="bg-surface-alt p-6 rounded-2xl border border-slate-200 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-1 h-full bg-ink"></div>
            <div className="text-sm font-medium text-ink mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Globe className="w-4 h-4 text-ink-muted" /> 输入 URL 地址
            </div>
            <input
              id="input-url"
              className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-4 text-sm focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all mb-4"
              placeholder="https://example.com/privacy"
              type="text"
            />
            <button 
              onClick={() => onStartAnalysis('url', (document.getElementById('input-url') as HTMLInputElement)?.value)}
              className="w-full py-2.5 bg-ink text-white font-medium text-sm rounded-lg hover:bg-ink/90 transition-colors shadow-sm"
            >
              抓取并分析
            </button>
          </div>

          <div className="bg-surface-alt p-6 rounded-2xl border border-slate-200 flex-1 flex flex-col relative overflow-hidden min-h-0">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#d97757]"></div>
            <div className="text-sm font-medium text-ink mb-4 flex items-center gap-2 uppercase tracking-widest shrink-0">
              <FileText className="w-4 h-4 text-ink-muted" /> 文本直传
            </div>
            <textarea
              id="input-text"
              className="w-full bg-white border border-slate-200 rounded-lg py-3 px-4 text-sm focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757] outline-none transition-all mb-4 resize-none flex-1 min-h-0 leading-relaxed"
              placeholder="直接粘贴隐私政策全文..."
            ></textarea>
            <button 
              onClick={() => onStartAnalysis('text', (document.getElementById('input-text') as HTMLTextAreaElement)?.value)}
              className="w-full py-2.5 bg-white border border-slate-200 text-ink font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm shrink-0"
            >
              开始审查
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
