export type ViewType = 'overview' | 'new-task' | 'details' | 'history';

export interface Clause {
  id: string;
  location: string;
  category: string;
  snippet: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  originalText: string;
  suggestedText: string;
  diffOriginalHtml: string;
  diffSuggestedHtml: string;
  legalBasis: string;
}

export interface Project {
  id: string;
  name: string;
  date: string;
  description: string;
  score: number;
  riskStatus: '极高风险' | '中度风险' | '低风险';
  clauses: Clause[];
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}
