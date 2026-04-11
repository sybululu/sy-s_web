/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ViewType, Project, Clause, ToastState } from './types';
import { MOCK_PROJECTS } from './constants';
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

  useEffect(() => {
    if (isLoggedIn) {
      // @ts-ignore
      const API_BASE = import.meta.env?.VITE_API_URL || '';
      fetch(`${API_BASE}/api/v1/projects`)
        .then(res => res.json())
        .then(data => {
          setProjects(data);
          if (data.length > 0) {
            setCurrentProject(data[0]);
          }
        })
        .catch(err => console.error('Failed to fetch projects:', err));
    }
  }, [isLoggedIn]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentView('overview');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('overview');
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
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
    const content = `合规报告摘要：项目[${currentProject.name}]，得分${currentProject.score}\n--------------------------------------------------\n生成时间: ${new Date().toLocaleString()}\n风险状态: ${currentProject.riskStatus}\n\n违规统计:\n- 待修复项: ${currentProject.clauses.length}项\n\n本报告由智审合规 NLP 引擎自动生成。`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}_合规审计报告.txt`;
    a.click();
    showToast('合规报告导出成功');
  };

  const handleStartAnalysis = async (type: string, value: string) => {
    if (!value) {
      showToast('请输入有效内容', 'error');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisStep('正在提取文本内容...');
    
    setTimeout(() => setAnalysisStep('正在调用 RAG-mT5 引擎进行合规性比对...'), 1500);
    setTimeout(() => setAnalysisStep('正在生成审查报告与整改建议...'), 3000);
    
    try {
      // @ts-ignore
      const API_BASE = import.meta.env?.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }) // Changed 'value' to 'text' to match Python backend schema
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const result = await response.json();
      
      // Map Python backend response to frontend Project structure
      const newProject: Project = {
        id: Math.random().toString(36).substring(2, 9),
        name: type === 'url' ? `URL 抓取: ${value}` : type === 'file' ? `上传文件: ${value}` : '自定义文本分析',
        date: new Date().toISOString().split('T')[0],
        description: `基于大语言模型风险识别与整改建议生成的自动化审查报告。共发现 ${result.violations.length} 项潜在风险。`,
        score: result.total_score,
        riskStatus: result.risk_level,
        clauses: result.violations.map((v: any, index: number) => ({
          id: `CL-${Math.floor(Math.random() * 9000) + 1000}`,
          location: `第${index + 1}节`,
          category: v.indicator,
          snippet: v.snippet,
          riskLevel: result.risk_level === '高风险' ? 'high' : 'medium',
          reason: v.indicator,
          originalText: v.snippet,
          suggestedText: '【系统建议】为了符合合规要求，建议将原表述修改为：在您使用本服务时，我们将出于提供核心业务功能的目的，在获得您单独同意后，收集必要的个人信息。',
          diffOriginalHtml: v.snippet,
          diffSuggestedHtml: '<span class="diff-add">【系统建议】为了符合合规要求，建议将原表述修改为：在您使用本服务时，我们将出于提供核心业务功能的目的，在获得您单独同意后，收集必要的个人信息。</span>',
          legalBasis: v.legal_basis
        }))
      };
      
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setCurrentView('details');
      setSearchQuery('');
      showToast('审计完成，已生成合规报告');
    } catch (error) {
      console.error(error);
      showToast('分析失败，请重试', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isLoggedIn) {
    if (isRegistering) {
      return (
        <Register 
          onRegister={() => { showToast('注册成功！'); setIsRegistering(false); }} 
          onSwitchToLogin={() => setIsRegistering(false)} 
        />
      );
    }
    return (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setIsRegistering(true)}
        onShowToast={showToast}
      />
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
      
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <Header 
          title={viewTitles[currentView]} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShowToast={showToast}
        />
        
        <div className="flex-1 overflow-y-auto p-8">
          {currentView === 'overview' && currentProject && (
            <Overview currentProject={displayProject as Project} projects={projects} onViewChange={handleViewChange} />
          )}
          {currentView === 'new-task' && (
            <NewTask onStartAnalysis={handleStartAnalysis} />
          )}
          {currentView === 'details' && currentProject && (
            <Details 
              currentProject={displayProject as Project} 
              onOpenDrawer={handleOpenDrawer} 
              onDownload={handleDownload} 
            />
          )}
          {currentView === 'history' && (
            <History projects={filteredProjects} onSelectProject={handleSelectProject} />
          )}
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

