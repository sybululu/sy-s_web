import { Search, Bell, HelpCircle } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function Header({ title, searchQuery, onSearchChange, onShowToast }: HeaderProps) {
  return (
    <header className="flex justify-between items-center h-14 px-8 sticky top-0 z-50 w-full bg-surface border-b border-slate-200">
      <div className="flex items-center gap-4">
        <span className="font-serif text-xl text-ink tracking-tight">{title}</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4" />
          <input
            className="bg-surface-alt border border-transparent rounded-md py-1.5 pl-9 pr-4 text-sm w-64 focus:bg-white focus:border-slate-300 focus:ring-0 transition-all placeholder:text-ink-muted text-ink"
            placeholder="搜索审查记录或条款 ID..."
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onShowToast?.('暂无新通知')}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onShowToast?.('帮助文档正在建设中')}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
