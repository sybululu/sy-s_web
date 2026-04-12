const API_BASE = import.meta.env.VITE_API_URL || '';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 60000;

// 创建带超时的 fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getAuthHeaders(isFormData: boolean = false) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 自定义错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 网络错误处理
function handleNetworkError(error: unknown): never {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络连接后重试', undefined, 'TIMEOUT');
    }
    throw new ApiError(`网络错误: ${error.message}`, undefined, 'NETWORK_ERROR');
  }
  throw new ApiError('发生未知网络错误', undefined, 'UNKNOWN');
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const isFormData = options.body instanceof FormData;
  
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(isFormData),
        ...options.headers,
      },
    });
  } catch (error) {
    handleNetworkError(error);
  }
  
  // 处理 401 未授权
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new ApiError('登录已过期，请重新登录', 401, 'UNAUTHORIZED');
  }
  
  // 处理其他错误状态码
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || '';
    } catch {
      // 响应不是 JSON，使用默认消息
    }
    throw new ApiError(
      errorDetail || `请求失败 (${response.status})`,
      response.status,
      'HTTP_ERROR'
    );
  }
  
  // 处理空响应
  const text = await response.text();
  if (!text) {
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// API 方法
export const api = {
  // 认证
  login: (email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name?: string } }> => 
    apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  register: (email: string, password: string, name: string): Promise<void> => 
    apiFetch('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    }),

  // 分析
  analyze: (text: string, source_type: string = 'text'): Promise<{
    id: string;
    name: string;
    score: number;
    risk_level: string;
    violations: Array<Record<string, unknown>>;
  }> =>
    apiFetch('/api/v1/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, source_type })
    }),
    
  rectify: (original_snippet: string, violation_type: string): Promise<{ suggested_text: string; legal_basis: string }> =>
    apiFetch('/api/v1/rectify', {
      method: 'POST',
      body: JSON.stringify({ original_snippet, violation_type })
    }),

  uploadFile: (file: File): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/v1/upload', {
      method: 'POST',
      body: formData
    });
  },

  fetchUrl: (url: string): Promise<{ text: string }> =>
    apiFetch('/api/v1/fetch-url', {
      method: 'POST',
      body: JSON.stringify({ url })
    }),
  
  // 历史记录
  getProjects: (): Promise<Array<{ id: string; name: string; score: number; risk_level: string; created_at: string }>> => apiFetch('/api/v1/projects'),
  
  getProject: (id: string): Promise<{
    id: string;
    name: string;
    score: number;
    risk_level: string;
    violations: Array<Record<string, unknown>>;
  }> => apiFetch(`/api/v1/projects/${id}`),
  
  // 导出
  exportReport: (projectId: string) => {
    if (!API_BASE) {
      console.warn('VITE_API_URL 未配置，可能无法导出');
    }
    window.open(`${API_BASE}/api/v1/export/${projectId}?token=${localStorage.getItem('token')}`)
  }
};
