import { Upload, TrendingUp, ShieldAlert, CheckCircle2, AlertCircle, FileText, Activity, BarChart3, ArrowRight } from 'lucide-react';
import { Project, ViewType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OverviewProps {
  currentProject: Project | null;
  projects: Project[];
  onViewChange: (view: ViewType) => void;
}

export default function Overview({ currentProject, projects, onViewChange }: OverviewProps) {
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
          <FileText className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-serif text-ink mb-3">暂无审查数据</h3>
        <p className="text-ink-muted mb-8 max-w-md leading-relaxed">
          您还没有进行过任何隐私政策审查。点击下方按钮新建一个审查任务，体验基于 RoBERTa 与 mT5 的智能合规检测。
        </p>
        <button 
          onClick={() => onViewChange('new-task')} 
          className="bg-ink text-white px-8 py-3 rounded-xl hover:bg-ink/90 transition-all shadow-sm font-medium flex items-center gap-2"
        >
          开始第一次审查 <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const isHighRisk = currentProject.score < 60;

  // Calculate dynamic stats for current project
  const highCount = currentProject.clauses.filter(c => c.riskLevel === 'high').length;
  const mediumCount = currentProject.clauses.filter(c => c.riskLevel === 'medium').length;
  const lowCount = currentProject.clauses.filter(c => c.riskLevel === 'low').length;

  // Calculate dynamic global stats
  const totalAudits = projects.length;
  const totalClauses = projects.reduce((acc, p) => acc + p.clauses.length, 0);
  const avgScore = projects.length > 0 
    ? (projects.reduce((acc, p) => acc + p.score, 0) / projects.length).toFixed(1) 
    : '0.0';

  // Calculate top risk categories for current project
  const categoryCounts = currentProject.clauses.reduce((acc, clause) => {
    acc[clause.category] = (acc[clause.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // Prepare trend data (reverse to show chronological order)
  const trendData = [...projects].reverse().slice(-10).map((p, i) => ({
    name: `Task ${i + 1}`,
    score: p.score,
    date: p.date
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-ink tracking-tight mb-1">审计总览</h2>
          <p className="text-ink-muted text-sm">实时合规健康度与风险态势感知</p>
        </div>
        <button
          onClick={() => onViewChange('new-task')}
          className="bg-ink text-white px-5 py-2.5 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-ink/90 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          开始新审计
        </button>
      </div>

      {/* Top Row: Main Score & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-8 rounded-xl flex items-center gap-10">
          <div className="relative shrink-0">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle className="text-slate-100" cx="64" cy="64" fill="transparent" r="56" stroke="currentColor" strokeWidth="8"></circle>
              <circle
                className={isHighRisk ? 'text-[#d97757]' : 'text-ink'}
                cx="64" cy="64" fill="transparent" r="56" stroke="currentColor"
                strokeDasharray="351.86"
                strokeDashoffset={351.86 * (1 - currentProject.score / 100)}
                strokeWidth="8"
                strokeLinecap="round"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-serif text-ink tracking-tight">{currentProject.score}</span>
              <span className="text-[10px] font-medium text-ink-muted uppercase tracking-widest mt-0.5">Score</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-serif text-ink">
                {currentProject.name}
              </h3>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                isHighRisk ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
              }`}>
                {currentProject.riskStatus}
              </span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed mb-5 max-w-xl">
              {isHighRisk 
                ? '当前检测到多项违反《个保法》及《App违法违规收集使用个人信息行为认定方法》的核心条款，建议立即整改。'
                : '当前隐私政策合规性良好，未发现严重违规项，建议定期进行合规性复查以保持健康度。'}
            </p>
            <div className="flex gap-4">
              <div className="bg-surface-alt border border-slate-200 text-ink px-4 py-2 rounded-md flex items-center gap-2">
                {isHighRisk ? <ShieldAlert className="w-4 h-4 text-[#d97757]" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                <span className="text-sm font-medium">{currentProject.clauses.length} 项待修复</span>
              </div>
              <button 
                onClick={() => onViewChange('details')}
                className="px-4 py-2 text-sm font-medium text-ink border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                查看明细
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-ink-muted mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              当前风险分布
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-ink-muted">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d97757]"></div>
                  高危违规
                </div>
                <span className="font-mono text-ink">{highCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-ink-muted">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  一般隐患
                </div>
                <span className="font-mono text-ink">{mediumCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-ink-muted">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  合规建议
                </div>
                <span className="font-mono text-ink">{lowCount}</span>
              </div>
            </div>
          </div>
          <div className="pt-5 mt-5 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 flex overflow-hidden">
              {currentProject.clauses.length > 0 ? (
                <>
                  <div style={{ width: `${(highCount / currentProject.clauses.length) * 100}%` }} className="bg-[#d97757] h-full"></div>
                  <div style={{ width: `${(mediumCount / currentProject.clauses.length) * 100}%` }} className="bg-amber-500 h-full"></div>
                  <div style={{ width: `${(lowCount / currentProject.clauses.length) * 100}%` }} className="bg-slate-300 h-full"></div>
                </>
              ) : (
                <div className="w-full bg-green-500 h-full"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Dynamic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: '累计发现问题', value: totalClauses, unit: '项', trend: '', trendColor: '' },
          { label: '平均合规得分', value: avgScore, unit: '分', trend: '', trendColor: '' },
          { label: '历史审查总数', value: totalAudits, unit: '次', trend: '', trendColor: '' },
          { label: '当前高危风险', value: highCount, unit: '项', trend: highCount > 0 ? 'up' : '', trendColor: highCount > 0 ? 'text-[#d97757]' : '' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-xl">
            <div className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-widest">{stat.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-serif text-ink tracking-tight">{stat.value}</span>
              <span className="text-xs font-medium text-ink-muted">{stat.unit}</span>
              {stat.trend === 'up' && <TrendingUp className={`w-4 h-4 ml-auto ${stat.trendColor}`} />}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row: Trend Chart & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-white/30 bg-white/40">
            <h3 className="text-sm font-medium text-ink flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="w-4 h-4 text-ink-muted" /> 合规得分趋势 (近 10 次)
            </h3>
          </div>
          <div className="p-6 flex-1 min-h-[250px]">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#2d2d2d" strokeWidth={2} dot={{ r: 4, fill: '#2d2d2d', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#d97757', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-muted text-sm">
                数据不足，需至少完成 2 次审查以生成趋势图
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-white/30 bg-white/40">
            <h3 className="text-sm font-medium text-ink flex items-center gap-2 uppercase tracking-widest">
              <BarChart3 className="w-4 h-4 text-ink-muted" /> 频发违规类型 (当前)
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {topCategories.length > 0 ? (
              <div className="space-y-5">
                {topCategories.map(([category, count], idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-ink font-medium">{category}</span>
                      <span className="text-ink-muted font-mono">{count} 项</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div 
                        className="bg-ink h-1.5 rounded-full" 
                        style={{ width: `${(count / currentProject.clauses.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-ink-muted text-sm py-8 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                <p>当前项目未发现违规项</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
