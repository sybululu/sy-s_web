import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { PRIVACY_POLICY_TEXT } from '../constants';
import PolicyModal from './PolicyModal';
import { api } from '../utils/api';
import { motion } from 'motion/react';
import { User } from '../types';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
  onSwitchToRegister: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function Login({ onLogin, onSwitchToRegister, onShowToast }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [policyTitle, setPolicyTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      onShowToast?.('请先阅读并勾选隐私协议', 'error');
      return;
    }
    if (!email || !password) {
      onShowToast?.('请输入邮箱和密码', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      
      // 存储 token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onLogin(data.token, data.user);
      onShowToast?.('登录成功', 'success');
    } catch (error: any) {
      // ApiError 和普通 Error 都有 message 属性
      onShowToast?.(error.message || '登录失败，请检查网络连接后重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openPolicy = (title: string) => {
    setPolicyTitle(title);
    setShowPolicy(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-300/20 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
        className="w-full max-w-[400px] glass-card p-8 rounded-2xl relative z-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white mb-4 shadow-sm"
          >
            <ShieldCheck className="w-6 h-6" />
          </motion.div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">智审合规</h1>
          <p className="text-ink-muted text-sm">NLP 隐私政策审查平台</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <label className="block text-sm font-medium text-ink mb-1.5">企业账号</label>
            <input
              className="w-full glass-input rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="请输入邮箱"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <label className="block text-sm font-medium text-ink mb-1.5">密码</label>
            <div className="relative">
              <input
                className="w-full glass-input rounded-lg py-2 pl-3 pr-10 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
                placeholder="请输入密码"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-start gap-2 pt-1">
            <input
              className="mt-0.5 rounded border-slate-300 text-ink focus:ring-ink w-4 h-4 cursor-pointer"
              id="privacy-check"
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                if (e.target.checked) {
                  openPolicy('用户服务协议');
                } else {
                  setAgreed(false);
                }
              }}
            />
            <label className="text-xs text-ink-muted leading-relaxed" htmlFor="privacy-check">
              我已阅读并同意 <span className="text-ink cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); openPolicy('用户服务协议'); }}>《用户服务协议》</span> 与 <span className="text-ink cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); openPolicy('隐私声明'); }}>《隐私声明》</span>
            </label>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-ink text-white font-medium py-2.5 rounded-lg hover:bg-ink/90 transition-colors shadow-sm mt-2 disabled:opacity-50"
          >
            {isLoading ? '登录中...' : '登录'}
          </motion.button>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-sm text-ink-muted mt-4">
            还没有账号？<button type="button" className="text-ink font-medium hover:underline" onClick={onSwitchToRegister}>立即注册</button>
          </motion.p>
        </form>
      </motion.div>

      <PolicyModal
        isOpen={showPolicy}
        title={policyTitle}
        content={PRIVACY_POLICY_TEXT}
        onClose={() => setShowPolicy(false)}
        onAccept={() => {
          setShowPolicy(false);
          setAgreed(true);
        }}
      />
    </div>
  );
}
