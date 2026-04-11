import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { FormEvent } from 'react';

interface RegisterProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export default function Register({ onRegister, onSwitchToLogin }: RegisterProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-[400px] bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative">
        <button 
          onClick={onSwitchToLogin}
          className="absolute top-6 left-6 text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="mb-8 flex flex-col items-center text-center mt-2">
          <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">创建新账户</h1>
          <p className="text-ink-muted text-sm">开始您的高级合规审计之旅</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">注册邮箱</label>
            <input
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="admin@enterprise.com"
              type="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">设置密码</label>
            <input
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="••••••••"
              type="password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">确认密码</label>
            <input
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="••••••••"
              type="password"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-ink text-white font-medium py-2.5 rounded-lg hover:bg-ink/90 transition-colors shadow-sm mt-6"
          >
            完成注册
          </button>
        </form>
      </div>
    </div>
  );
}
