/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ViewType, Project, Clause, ToastState, User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import NewTask from './components/NewTask';
import Details from './components/Details';
import History from './components/History';
import Drawer from './components/Drawer';
import Toast from './components/Toast';
import Login from './components/Login';
import Register from './components/Register';
import { api } from './utils/api';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // 检查本地是否已有 token
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      api.getProjects()
        .then(data => {
          if (Array.isArray(data)) {
            // Map backend project format to frontend Project format
            const mappedProjects: Project[] = data.map((p: any) => ({
              id: p.id,
              name: p.name,
              date: p.created_at.split('T')[0],
              description: `审查得分: ${p.score}，风险等级: ${p.risk_level}`,
              score: p.score,
              riskStatus: p.risk_level,
              clauses: [] // 列表接口可能不返回 clauses，需要点进去再拉取，或者后端直接返回
            }));
            setProjects(mappedProjects);
            if (mappedProjects.length > 0) {
              // 默认选中第一个，但可能需要拉取详情
              handleSelectProject(mappedProjects[0]);
            }
          } else {
            console.error('Expected array from API, got:', data);
            setProjects([]);
          }
        })
        .catch(err => {
          console.error('Failed to fetch projects:', err);
          setProjects([]);
          // 排除 401 错误（已在 apiFetch 中处理）
          if (err.code !== 'UNAUTHORIZED') {
            showToast(err.message || '无法连接到后端服务，请检查 API 地址配置', 'error');
          }
        });
    }
  }, [isLoggedIn]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleLogin = (token: string, user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentView('overview');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentView('overview');
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleSelectProject = async (project: Project) => {
    try {
      // 尝试获取项目详情（包含 clauses）
      const detail = await api.getProject(project.id);
      const fullProject: Project = {
        ...project,
        clauses: detail.violations.map((v: any, index: number) => ({
          id: `CL-${Math.floor(Math.random() * 9000) + 1000}`,
          location: v.location || `第${index + 1}节`,
          category: v.category || v.indicator || '未知类别',
          snippet: v.snippet || v.originalText || '',
          riskLevel: detail.risk_level === '高风险' ? 'high' : 'medium',
          reason: v.reason || v.indicator || '',
          originalText: v.originalText || v.snippet || '',
          suggestedText: v.suggestedText || '【系统建议】请根据合规要求修改。',
          diffOriginalHtml: v.diffOriginalHtml || v.snippet || '',
          diffSuggestedHtml: v.diffSuggestedHtml || `<span class="diff-add">${v.suggestedText || '建议修改'}</span>`,
          legalBasis: v.legalBasis || v.legal_basis || ''
        }))
      };
      setCurrentProject(fullProject);
    } catch (err) {
      console.error('Failed to fetch project details:', err);
      setCurrentProject(project); // fallback
    }
    setCurrentView('details');
  };

  const handleOpenDrawer = (clause: Clause) => {
    setSelectedClause(clause);
    setIsDrawerOpen(true);
  };

  const handleAdopt = () => {
    showToast('整改方案已应用到当前草稿');
    setIsDrawerOpen(false);
  };

  const handleDownload = () => {
    if (!currentProject) return;
    try {
      api.exportReport(currentProject.id);
      showToast('合规报告导出成功');
    } catch (err) {
      showToast('导出失败', 'error');
    }
  };

  const handleStartAnalysis = async (type: string, value: any) => {
    if (!value) {
      showToast('请输入有效内容', 'error');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisStep('正在提取文本内容...');
    
    try {
      let textToAnalyze = value;
      
      if (type === 'file') {
        const uploadRes = await api.uploadFile(value as File);
        textToAnalyze = uploadRes.text;
      } else if (type === 'url') {
        const urlRes = await api.fetchUrl(value as string);
        textToAnalyze = urlRes.text;
      }
      
      setAnalysisStep('正在调用 RAG-mT5 引擎进行合规性比对...');
      const result = await api.analyze(textToAnalyze, type);
      
      setAnalysisStep('正在生成审查报告与整改建议...');
      
      // Map Python backend response to frontend Project structure
      const newProject: Project = {
        id: result.id,
        name: result.name,
        date: new Date().toISOString().split('T')[0],
        description: `基于大语言模型风险识别与整改建议生成的自动化审查报告。共发现 ${result.violations.length} 项潜在风险。`,
        score: result.score,
        riskStatus: result.risk_level,
        clauses: result.violations.map((v: any, index: number) => ({
          id: `CL-${Math.floor(Math.random() * 9000) + 1000}`,
          location: v.location || `第${index + 1}节`,
          category: v.category || v.indicator || '未知类别',
          snippet: v.snippet || v.originalText || '',
          riskLevel: result.risk_level === '高风险' ? 'high' : 'medium',
          reason: v.reason || v.indicator || '',
          originalText: v.originalText || v.snippet || '',
          suggestedText: v.suggestedText || '【系统建议】请根据合规要求修改。',
          diffOriginalHtml: v.diffOriginalHtml || v.snippet || '',
          diffSuggestedHtml: v.diffSuggestedHtml || `<span class="diff-add">${v.suggestedText || '建议修改'}</span>`,
          legalBasis: v.legalBasis || v.legal_basis || ''
        }))
      };
      
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setCurrentView('details');
      setSearchQuery('');
      showToast('审计完成，已生成合规报告');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || '分析失败，请重试', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        {isRegistering ? (
          <Register 
            onRegister={(token, user) => { handleLogin(token, user); setIsRegistering(false); }} 
            onSwitchToLogin={() => setIsRegistering(false)} 
            onShowToast={showToast}
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setIsRegistering(true)}
            onShowToast={showToast}
          />
        )}
        <Toast toast={toast} />
      </>
    );
  }

  const viewTitles: Record<ViewType, string> = {
    overview: '总览仪表盘',
    'new-task': '新建审查任务',
    details: '违规条款明细',
    history: '历史审查报告'
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClauses = currentProject?.clauses.filter(c => 
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const displayProject = currentProject ? { ...currentProject, clauses: filteredClauses } : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <Header 
          title={viewTitles[currentView]} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShowToast={showToast}
        />
        
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'overview' && (
                <Overview currentProject={displayProject} projects={projects} onViewChange={handleViewChange} />
              )}
              {currentView === 'new-task' && (
                <NewTask onStartAnalysis={handleStartAnalysis} />
              )}
              {currentView === 'details' && (
                <Details 
                  currentProject={displayProject} 
                  onOpenDrawer={handleOpenDrawer} 
                  onDownload={handleDownload} 
                />
              )}
              {currentView === 'history' && (
                <History projects={filteredProjects} onSelectProject={handleSelectProject} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Drawer 
        clause={selectedClause} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onAdopt={handleAdopt}
        onShowToast={showToast}
      />
      
      {isAnalyzing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-ink rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-serif text-ink tracking-tight mb-2">深度审计中</h3>
          <p className="text-sm text-ink-muted font-mono animate-pulse">{analysisStep}</p>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

