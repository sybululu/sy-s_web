import { ShieldCheck } from 'lucide-react';
import { useState, FormEvent } from 'react';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function Login({ onLogin, onSwitchToRegister, onShowToast }: LoginProps) {
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      onShowToast?.('请先阅读并勾选隐私协议', 'error');
      return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-[400px] bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">智审合规</h1>
          <p className="text-ink-muted text-sm">NLP 隐私政策审查平台</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">企业账号</label>
            <input
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="admin@example.com"
              type="text"
              defaultValue="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">密码</label>
            <input
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="••••••••"
              type="password"
              defaultValue="password"
            />
          </div>
          <div className="flex items-start gap-2 pt-1">
            <input
              className="mt-0.5 rounded border-slate-300 text-ink focus:ring-ink w-4 h-4"
              id="privacy-check"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <label className="text-xs text-ink-muted leading-relaxed" htmlFor="privacy-check">
              我已阅读并同意 <span className="text-ink cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); onShowToast?.('《用户服务协议》内容待接入...'); }}>《用户服务协议》</span> 与 <span className="text-ink cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); onShowToast?.('《隐私声明》内容待接入...'); }}>《隐私声明》</span>
            </label>
          </div>
          <button 
            type="submit"
            className="w-full bg-ink text-white font-medium py-2.5 rounded-lg hover:bg-ink/90 transition-colors shadow-sm mt-2"
          >
            登录
          </button>
          <p className="text-center text-sm text-ink-muted mt-4">
            还没有账号？<button type="button" className="text-ink font-medium hover:underline" onClick={onSwitchToRegister}>立即注册</button>
          </p>
        </form>
      </div>
    </div>
  );
}
