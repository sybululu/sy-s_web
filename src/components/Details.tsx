import { FileText, Filter, Download, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, Clause } from '../types';
import { useState } from 'react';

interface DetailsProps {
  currentProject: Project;
  onOpenDrawer: (clause: Clause) => void;
  onDownload: () => void;
}

export default function Details({ currentProject, onOpenDrawer, onDownload }: DetailsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const totalPages = Math.ceil(currentProject.clauses.length / ITEMS_PER_PAGE) || 1;
  const currentData = currentProject.clauses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-serif text-ink tracking-tight">
              违规条款明细
            </h2>
            <span className="bg-surface-alt text-ink-muted text-xs font-medium px-2 py-0.5 rounded-md border border-slate-200">
              {currentProject.clauses.length} 项发现
            </span>
          </div>
          <p className="text-ink-muted text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {currentProject.name}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-3 py-1.5 bg-white text-sm font-medium text-ink rounded-md border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" /> 筛选
          </button>
          <button 
            onClick={onDownload}
            className="px-3 py-1.5 bg-white text-sm font-medium text-ink rounded-md border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> 导出报告
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-alt border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-medium text-ink-muted w-24">条款 ID</th>
                <th className="px-4 py-3 text-xs font-medium text-ink-muted w-32">位置</th>
                <th className="px-4 py-3 text-xs font-medium text-ink-muted w-40">风险类别</th>
                <th className="px-4 py-3 text-xs font-medium text-ink-muted">内容片段</th>
                <th className="px-4 py-3 text-xs font-medium text-ink-muted w-24">等级</th>
                <th className="px-4 py-3 text-xs font-medium text-ink-muted w-24 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.length > 0 ? (
                currentData.map((clause) => (
                  <tr key={clause.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 text-xs font-mono text-ink-muted">{clause.id}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{clause.location}</td>
                    <td className="px-4 py-3 text-sm text-ink font-medium">{clause.category}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted truncate max-w-md" title={clause.snippet}>
                      {clause.snippet}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        clause.riskLevel === 'high' 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {clause.riskLevel === 'high' ? '高危' : '中度'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => onOpenDrawer(clause)}
                        className="text-ink-muted hover:text-ink font-medium text-xs flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-all"
                      >
                        审查 <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-muted text-sm">
                    未发现违规条款
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-surface-alt mt-auto shrink-0">
          <div className="text-sm text-ink-muted">
            显示第 <span className="font-medium text-ink">{currentProject.clauses.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> 到 <span className="font-medium text-ink">{Math.min(currentPage * ITEMS_PER_PAGE, currentProject.clauses.length)}</span> 条，共 <span className="font-medium text-ink">{currentProject.clauses.length}</span> 条
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
