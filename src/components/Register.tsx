import { ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { PRIVACY_POLICY_TEXT } from '../constants';
import PolicyModal from './PolicyModal';
import { api } from '../utils/api';
import { motion } from 'motion/react';
import { User } from '../types';

interface RegisterProps {
  onRegister: (token: string, user: User) => void;
  onSwitchToLogin: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function Register({ onRegister, onSwitchToLogin, onShowToast }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (password !== confirmPassword) {
      onShowToast?.('两次输入的密码不一致', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 默认使用邮箱前缀作为名称
      const name = email.split('@')[0];
      await api.register(email, password, name);
      
      // 注册成功后自动登录
      const loginData = await api.login(email, password);
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));
      
      onShowToast?.('注册成功，已自动登录', 'success');
      onRegister(loginData.token, loginData.user);
    } catch (error: any) {
      onShowToast?.(error.message || '注册失败，请检查网络连接后重试', 'error');
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
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-300/20 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
        className="w-full max-w-[400px] glass-card p-8 rounded-2xl relative z-10"
      >
        <button 
          onClick={onSwitchToLogin}
          className="absolute top-6 left-6 text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="mb-8 flex flex-col items-center text-center mt-2">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white mb-4 shadow-sm"
          >
            <ShieldCheck className="w-6 h-6" />
          </motion.div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">创建新账户</h1>
          <p className="text-ink-muted text-sm">开始您的高级合规审计之旅</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <label className="block text-sm font-medium text-ink mb-1.5">注册邮箱</label>
            <input
              className="w-full glass-input rounded-lg py-2 px-3 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
              placeholder="admin@enterprise.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <label className="block text-sm font-medium text-ink mb-1.5">设置密码</label>
            <div className="relative">
              <input
                className="w-full glass-input rounded-lg py-2 pl-3 pr-10 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
                placeholder="••••••••"
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
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <label className="block text-sm font-medium text-ink mb-1.5">确认密码</label>
            <div className="relative">
              <input
                className="w-full glass-input rounded-lg py-2 pl-3 pr-10 focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all text-sm"
                placeholder="••••••••"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-2 pt-1">
            <input
              className="mt-0.5 rounded border-slate-300 text-ink focus:ring-ink w-4 h-4 cursor-pointer"
              id="register-privacy-check"
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
            <label className="text-xs text-ink-muted leading-relaxed" htmlFor="register-privacy-check">
              我已阅读并同意 <span className="text-ink cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); openPolicy('用户服务协议'); }}>《用户服务协议》</span> 与 <span className="text-ink cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); openPolicy('隐私声明'); }}>《隐私声明》</span>
            </label>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-ink text-white font-medium py-2.5 rounded-lg hover:bg-ink/90 transition-colors shadow-sm mt-6 disabled:opacity-50"
          >
            {isLoading ? '注册中...' : '完成注册'}
          </motion.button>
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
