import { FileText, CheckCircle2, AlertCircle, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project } from '../types';
import { useState } from 'react';

interface HistoryProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export default function History({ projects, onSelectProject }: HistoryProps) {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const filteredProjects = projects.filter(p => {
    if (riskFilter !== 'all' && p.riskStatus !== riskFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE) || 1;
  const currentData = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (setter: any, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl font-serif text-ink tracking-tight mb-1">历史审查报告</h2>
          <p className="text-ink-muted text-sm">所有已完成的隐私政策审计档案</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-muted" />
            <span className="text-sm font-medium text-ink">风险等级:</span>
            <select 
              value={riskFilter}
              onChange={(e) => handleFilterChange(setRiskFilter, e.target.value)}
              className="text-sm bg-surface-alt border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-ink cursor-pointer"
            >
              <option value="all">全部风险</option>
              <option value="极高风险">极高风险</option>
              <option value="中度风险">中度风险</option>
              <option value="低风险">低风险</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-muted" />
            <span className="text-sm font-medium text-ink">时间范围:</span>
            <select 
              value={timeFilter}
              onChange={(e) => handleFilterChange(setTimeFilter, e.target.value)}
              className="text-sm bg-surface-alt border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-ink cursor-pointer"
            >
              <option value="all">全部时间</option>
              <option value="7days">近 7 天</option>
              <option value="30days">近 30 天</option>
              <option value="90days">近 90 天</option>
            </select>
          </div>
        </div>
        
        <div className="text-sm text-ink-muted">
          共找到 <span className="font-semibold text-ink">{filteredProjects.length}</span> 份报告
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-alt border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-medium text-ink-muted uppercase tracking-wider w-32">日期</th>
                <th className="px-6 py-4 text-xs font-medium text-ink-muted uppercase tracking-wider">项目名称</th>
                <th className="px-6 py-4 text-xs font-medium text-ink-muted uppercase tracking-wider w-32">健康度</th>
                <th className="px-6 py-4 text-xs font-medium text-ink-muted uppercase tracking-wider w-32">风险状态</th>
                <th className="px-6 py-4 text-xs font-medium text-ink-muted uppercase tracking-wider w-24 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.length > 0 ? (
                currentData.map((project) => {
                  const isHighRisk = project.riskStatus === '极高风险';
                  const isLowRisk = project.riskStatus === '低风险';
                  
                  return (
                    <tr 
                      key={project.id} 
                      onClick={() => onSelectProject(project)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-ink-muted">{project.date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink mb-1">{project.name}</div>
                        <div className="text-xs text-ink-muted line-clamp-1 max-w-md">{project.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-serif text-ink">{project.score} 分</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isLowRisk ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : isHighRisk ? (
                            <AlertCircle className="w-4 h-4 text-[#d97757]" />
                          ) : (
                            <FileText className="w-4 h-4 text-amber-500" />
                          )}
                          <span className={`text-xs font-medium ${
                            isHighRisk ? 'text-red-700' : 
                            isLowRisk ? 'text-green-700' : 
                            'text-amber-700'
                          }`}>
                            {project.riskStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-ink-muted group-hover:text-ink font-medium text-sm transition-colors">
                          查看 &rarr;
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-muted text-sm">
                    没有符合条件的审查报告
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-surface-alt mt-auto shrink-0">
          <div className="text-sm text-ink-muted">
            显示第 <span className="font-medium text-ink">{filteredProjects.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> 到 <span className="font-medium text-ink">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)}</span> 条，共 <span className="font-medium text-ink">{filteredProjects.length}</span> 条
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-ink-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-ink px-2">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-ink-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
