// API 相关类型
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Violation {
  id?: string;
  location?: string;
  category?: string;
  indicator?: string;
  snippet?: string;
  originalText?: string;
  reason?: string;
  suggestedText?: string;
  diffOriginalHtml?: string;
  diffSuggestedHtml?: string;
  legalBasis?: string;
  legal_basis?: string;
}

export interface AnalyzeResponse {
  id: string;
  name: string;
  score: number;
  risk_level: string;
  violations: Violation[];
  created_at?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  score: number;
  risk_level: string;
  created_at: string;
  violations?: Violation[];
}

export interface ProjectDetail {
  id: string;
  name: string;
  score: number;
  risk_level: string;
  created_at: string;
  violations: Violation[];
}

export interface RectifyResponse {
  suggested_text: string;
  legal_basis: string;
}

export type ViewType = 'overview' | 'new-task' | 'details' | 'history';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface Clause {
  id: string;
  location: string;
  category: string;
  snippet: string;
  riskLevel: RiskLevel;
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
  riskStatus: string;
  clauses: Clause[];
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}
