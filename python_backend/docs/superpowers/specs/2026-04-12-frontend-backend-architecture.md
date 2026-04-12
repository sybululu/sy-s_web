# 前后端连接架构设计方案

**日期**: 2026-04-12
**前端**: Vite + React + TypeScript + Tailwind CSS (Cloudflare Pages)
**后端**: FastAPI (HuggingFace Spaces)
**状态**: 待实现

---

## 一、系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Cloudflare CDN / Pages                         │
│                      https://sy-s-web.pages.dev                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (CORS配置见6.1)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        HuggingFace Spaces                                │
│          https://huggingface.co/spaces/sybululu/privacy-policy-checker  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Auth API   │  │ Analyze API │  │ Project API │  │ Knowledge   │   │
│  │  用户认证    │  │ 隐私政策分析 │  │ 项目管理    │  │ 知识库API  │   │
│  │  注册/登录   │  │ 文本/文件   │  │ 列表/详情   │  │ 状态/上传   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│          │               │               │               │              │
│  ┌───────┴───────────────┴───────────────┴───────────────┴────────┐   │
│  │                      Business Logic Layer                        │   │
│  │  CAPP130Analyzer  │  Retriever  │  LegalKBLoader  │  Auth     │   │
│  │  (137条法律条款)   │  (FAISS)    │  (I1-I12映射)   │  (JWT)    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        Data Layer                                 │   │
│  │   ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │   │ SQLite   │  │   FAISS      │  │   Legal Knowledge JSON   │  │   │
│  │   │ 用户/项目 │  │  Vector Store│  │   137条条款(4部法律)   │  │   │
│  │   └──────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、API接口清单（完整版）

### 2.1 用户认证模块

#### POST /api/v1/auth/register - 用户注册
```typescript
// Request Body
interface RegisterRequest {
  email: string;           // 邮箱 (必填, 邮箱格式验证)
  password: string;        // 密码 (必填, 最少8位, 含大小写字母和数字)
  name?: string;           // 用户名 (可选)
}

// Response 201
interface RegisterResponse {
  success: true;
  user: {
    id: string;
    email: string;
    name: string;
  };
  message: "注册成功";
}

// Error Response 400
{
  success: false;
  error: {
    code: "VALIDATION_ERROR";
    message: "参数验证失败";
    details: [
      { field: "email", message: "邮箱格式不正确" },
      { field: "password", message: "密码需包含大小写字母和数字" }
    ];
  };
}

// Error Response 409
{
  success: false;
  error: {
    code: "EMAIL_EXISTS";
    message: "该邮箱已被注册";
  };
}
```

#### POST /api/v1/auth/login - 用户登录
```typescript
// Request Body
interface LoginRequest {
  email: string;
  password: string;
}

// Response 200
interface LoginResponse {
  success: true;
  token: string;          // JWT Token (24小时有效)
  refresh_token: string;  // Refresh Token (7天有效)
  user: {
    id: string;
    email: string;
    name: string;
  };
  expires_in: 86400;
}

// Error Response 401
{
  success: false;
  error: {
    code: "INVALID_CREDENTIALS";
    message: "邮箱或密码错误";
  };
}
```

#### POST /api/v1/auth/logout - 用户登出
```typescript
// Request Headers: Authorization: Bearer <token>

// Response 200
{
  success: true;
  message: "已成功登出";
}
```

#### POST /api/v1/auth/refresh - 刷新Token
```typescript
// Request Body
interface RefreshRequest {
  refresh_token: string;
}

// Response 200
{
  success: true;
  token: string;
  expires_in: 86400;
}

// Error Response 401
{
  success: false;
  error: {
    code: "TOKEN_EXPIRED";
    message: "Refresh Token已过期，请重新登录";
  };
}
```

#### GET /api/v1/auth/me - 获取当前用户
```typescript
// Request Headers: Authorization: Bearer <token>

// Response 200
{
  success: true;
  user: {
    id: string;
    email: string;
    name: string;
    created_at: string;
  };
}
```

---

### 2.2 隐私政策分析模块

#### POST /api/v1/analyze/text - 文本分析
```typescript
// Request Headers: Authorization: Bearer <token>

// Request Body
interface AnalyzeTextRequest {
  text: string;            // 隐私政策文本 (必填, 最少100字符)
  name?: string;          // 项目名称 (可选, 默认"未命名-时间戳")
}

// Response 200
interface AnalyzeTextResponse {
  success: true;
  id: string;             // 项目ID
  name: string;           // 项目名称
  score: number;          // 合规评分 0-100
  risk_level: "high" | "medium" | "low";
  total_indicators: 12;
  passed_indicators: number;
  violations: Violation[];
  created_at: string;
  processing_time_ms: number;
}

// Violation 类型定义
interface Violation {
  id: string;             // 如 "I1", "I2"
  type: string;           // 违规类型名称
  location: string;       // 原文位置描述
  snippet: string;        // 违规原文摘录
  original_text: string;  // 完整违规原文
  legal_article: string; // 相关法律条款编号
  legal_content: string;  // 法律条款原文
  suggestion: string;    // 整改建议
  confidence: number;     // 置信度 0-1
  risk_category: string;  // 风险类别
}

// Error Response 400
{
  success: false;
  error: {
    code: "TEXT_TOO_SHORT";
    message: "文本长度不足，请提供至少100个字符的隐私政策内容";
  };
}
```

#### POST /api/v1/analyze/file - 文件上传分析
```typescript
// Request Headers: Authorization: Bearer <token>
// Content-Type: multipart/form-data

// Request Body (FormData)
interface AnalyzeFileRequest {
  file: File;             // 文件 (必填)
  name?: string;         // 项目名称 (可选)
}

// 支持的文件类型: .txt .docx .pdf
// 最大文件大小: 5MB

// Response 200
interface AnalyzeFileResponse {
  success: true;
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  score: number;
  risk_level: "high" | "medium" | "low";
  violations: Violation[];
  created_at: string;
}

// Error Response 413
{
  success: false;
  error: {
    code: "FILE_TOO_LARGE";
    message: "文件大小超过限制(最大5MB)";
    max_size: 5242880;
  };
}

// Error Response 415
{
  success: false;
  error: {
    code: "UNSUPPORTED_FILE_TYPE";
    message: "不支持的文件格式，仅支持 .txt .docx .pdf";
  };
}
```

---

### 2.3 项目管理模块

#### GET /api/v1/projects - 项目列表
```typescript
// Request Headers: Authorization: Bearer <token>

// Query Parameters
interface ProjectListQuery {
  page?: number;          // 页码 (默认1)
  page_size?: number;    // 每页数量 (默认10, 最大50)
  sort_by?: 'created_at' | 'score' | 'name';
  sort_order?: 'asc' | 'desc';
}

// Response 200
interface ProjectListResponse {
  success: true;
  data: ProjectListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface ProjectListItem {
  id: string;
  name: string;
  score: number;
  risk_level: "high" | "medium" | "low";
  violation_count: number;
  created_at: string;
  updated_at: string;
}
```

#### GET /api/v1/projects/:id - 项目详情
```typescript
// Request Headers: Authorization: Bearer <token>

// Response 200
interface ProjectDetailResponse {
  success: true;
  data: ProjectDetail;
}

interface ProjectDetail {
  id: string;
  name: string;
  score: number;
  risk_level: "high" | "medium" | "low";
  source_type: 'text' | 'file';
  source_content?: string;  // 原文内容
  file_name?: string;       // 文件名
  violations: Violation[];
  summary: {
    total_issues: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  created_at: string;
  updated_at: string;
}

// Error Response 404
{
  success: false;
  error: {
    code: "PROJECT_NOT_FOUND";
    message: "项目不存在或无权访问";
  };
}
```

#### DELETE /api/v1/projects/:id - 删除项目
```typescript
// Request Headers: Authorization: Bearer <token>

// Response 200
{
  success: true;
  message: "项目已删除";
}
```

#### GET /api/v1/projects/:id/export - 导出报告
```typescript
// Request Headers: Authorization: Bearer <token>

// Query Parameters
interface ExportQuery {
  format: 'json' | 'pdf' | 'markdown';
}

// Response 200 (JSON格式)
{
  success: true;
  data: {
    project_id: string;
    project_name: string;
    export_format: string;
    content: object | string;
    generated_at: string;
  };
}

// Response 200 (PDF/Markdown格式)
// Content-Type: application/pdf 或 text/markdown
// Content-Disposition: attachment; filename="report.pdf"
```

---

### 2.4 整改建议模块

#### POST /api/v1/rectify/:violation_id - 生成整改建议
```typescript
// Request Headers: Authorization: Bearer <token>

// Request Body
interface RectifyRequest {
  original_text: string;  // 违规原文
  context?: string;       // 上下文描述
  project_id?: string;    // 关联项目ID
}

// Response 200
interface RectifyResponse {
  success: true;
  violation_id: string;
  suggested_text: string;
  legal_basis: {
    law: string;
    article: string;
    content: string;
  };
  changes_summary: string;
  confidence: number;
}
```

#### GET /api/v1/rectify/options/:violation_id - 获取多个整改方案
```typescript
// Response 200
{
  success: true;
  violation_id: string;
  options: {
    option_id: string;
    suggested_text: string;
    approach: "minimal" | "moderate" | "comprehensive";
    approach_description: string;
    confidence: number;
  }[];
}
```

---

### 2.5 知识库扩展模块

#### GET /api/v1/knowledge/status - 知识库状态
```typescript
// Response 200
{
  success: true;
  version: string;
  laws_count: number;
  total_articles: number;
  coverage: {
    [violation_type: string]: number;
  };
  laws: {
    name: string;
    article_count: number;
    last_updated: string;
  }[];
  custom_laws_count: number;
}

// 示例响应
{
  success: true,
  version: "1.0.0",
  laws_count: 4,
  total_articles: 137,
  coverage: {
    "I1": 42,
    "I2": 23,
    "I3": 10,
    // ... I4-I12
  },
  laws: [
    { name: "个人信息保护法", article_count: 45, last_updated: "2026-04-12" },
    { name: "数据安全法", article_count: 22, last_updated: "2026-04-12" },
    { name: "网络安全法", article_count: 18, last_updated: "2026-04-12" },
    { name: "GB/T 35273-2020", article_count: 52, last_updated: "2026-04-12" }
  ],
  custom_laws_count: 0
}
```

#### POST /api/v1/knowledge/laws - 上传自定义法律
```typescript
// Request Headers: Authorization: Bearer <token>
// Content-Type: multipart/form-data

interface UploadLawRequest {
  file: File;             // JSON文件 (必填)
  law_name: string;       // 法律名称 (必填)
  description?: string;   // 描述 (可选)
}

// JSON文件格式
{
  "law_meta": {
    "law_name": "自定义法规",
    "effective_date": "2024-01-01"
  },
  "articles": [
    {
      "article_id": "CUSTOM-001",
      "article_number": "第一条",
      "title": "条款标题",
      "content": "条款内容",
      "keywords": ["关键词1", "关键词2"],
      "violation_types": ["I1", "I2"]
    }
  ]
}

// Response 201
{
  success: true;
  law: {
    id: string;
    name: string;
    article_count: number;
  };
  message: "法律文件上传成功，已添加到知识库";
}
```

#### PUT /api/v1/knowledge/mapping - 更新违规映射
```typescript
interface UpdateMappingRequest {
  violation_type: string;  // 如 "I1"
  article_ids: string[];   // 关联的条款ID
}

// Response 200
{
  success: true;
  message: "违规映射已更新";
  updated_violation: string;
}
```

#### DELETE /api/v1/knowledge/laws/:law_id - 删除自定义法律
```typescript
// Response 200
{
  success: true;
  message: "自定义法律已删除";
  laws_remaining: number;
}
```

#### POST /api/v1/knowledge/reload - 重新加载知识库
```typescript
// 需要管理员权限

// Response 200
{
  success: true;
  message: "知识库已重新加载";
  stats: {
    laws_loaded: number;
    articles_indexed: number;
    reload_time_ms: number;
  };
}
```

---

## 三、错误处理统一方案

### 3.1 统一错误响应格式
```typescript
interface APIError {
  success: false;
  error: {
    code: string;          // 错误码 (大写下划线)
    message: string;        // 用户可见的错误消息
    details?: any;         // 详细信息(可选)
    request_id?: string;   // 请求追踪ID
  };
  timestamp: string;       // ISO 8601格式时间戳
}
```

### 3.2 HTTP状态码规范
| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功响应 |
| 201 | Created | 资源创建成功(注册、上传) |
| 400 | Bad Request | 参数验证失败、文本过短 |
| 401 | Unauthorized | 未认证、Token无效/过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突(邮箱已注册) |
| 413 | Payload Too Large | 文件过大 |
| 415 | Unsupported Media Type | 不支持的文件格式 |
| 422 | Unprocessable Entity | 格式正确但无法处理 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂不可用 |

### 3.3 错误码定义表
```typescript
// 认证模块
const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "邮箱或密码错误",
  TOKEN_EXPIRED: "登录已过期，请重新登录",
  TOKEN_INVALID: "无效的认证令牌",
  EMAIL_EXISTS: "该邮箱已被注册",
  REFRESH_TOKEN_EXPIRED: "会话已过期，请重新登录",
};

// 分析模块
const ANALYZE_ERRORS = {
  TEXT_TOO_SHORT: "文本长度不足，请提供至少100个字符",
  FILE_TOO_LARGE: "文件大小超过5MB限制",
  UNSUPPORTED_FILE_TYPE: "不支持的文件格式，请使用.txt/.docx/.pdf",
  ANALYSIS_FAILED: "分析失败，请稍后重试",
  FILE_PARSE_FAILED: "文件解析失败，请检查文件内容",
};

// 项目模块
const PROJECT_ERRORS = {
  PROJECT_NOT_FOUND: "项目不存在或无权访问",
  PROJECT_ACCESS_DENIED: "无权访问此项目",
  PROJECT_NAME_REQUIRED: "项目名称不能为空",
  PROJECT_DELETE_FAILED: "删除失败，请稍后重试",
};

// 知识库模块
const KNOWLEDGE_ERRORS = {
  INVALID_LAW_FORMAT: "法律文件格式错误，请检查JSON结构",
  LAW_NOT_FOUND: "法律文件不存在",
  PERMISSION_DENIED: "需要管理员权限",
  KNOWLEDGE_RELOAD_FAILED: "知识库加载失败",
};
```

---

## 四、安全设计

### 4.1 JWT认证流程
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           JWT认证流程                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 登录请求                                                             │
│     POST /api/v1/auth/login { email, password }                         │
│                                                                          │
│  2. 后端验证                                                             │
│     - 验证邮箱格式                                                        │
│     - 验证密码强度(8位以上,大小写字母+数字)                                │
│     - 查询数据库验证凭证                                                  │
│                                                                          │
│  3. 生成Token                                                            │
│     - Access Token: JWT (HS256), 24小时有效期                           │
│     - Refresh Token: JWT (HS256), 7天有效期                             │
│                                                                          │
│  4. 返回给前端                                                           │
│     { token, refresh_token, user, expires_in }                          │
│                                                                          │
│  5. 后续请求携带Token                                                    │
│     Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...                        │
│                                                                          │
│  6. Token过期处理                                                        │
│     - Access Token过期 → 使用Refresh Token刷新                           │
│     - Refresh Token过期 → 重新登录                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Token配置
```python
# 后端配置
JWT_CONFIG = {
    "access_token": {
        "algorithm": "HS256",
        "expires_delta": timedelta(hours=24),
        "payload": {
            "sub": "user_id",      # 用户ID
            "email": "email",      # 邮箱
            "role": "user",        # user | admin
            "type": "access"       # token类型标识
        }
    },
    "refresh_token": {
        "algorithm": "HS256",
        "expires_delta": timedelta(days=7),
        "payload": {
            "sub": "user_id",
            "type": "refresh"
        }
    }
}
```

### 4.3 CORS配置
```python
# 后端 FastAPI CORS配置
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sy-s-web.pages.dev",    # 生产环境
        "http://localhost:5173",          # 开发环境
        "http://localhost:3000",          # 备用开发端口
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Client-Version"
    ],
    expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
    max_age=600,  # 预检请求缓存10分钟
)
```

### 4.4 输入验证规则
```typescript
// 前端验证规则
const validationRules = {
  // 用户注册
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "请输入有效的邮箱地址"
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    message: "密码需包含大小写字母和数字，至少8位"
  },
  
  // 隐私政策分析
  text: {
    required: true,
    minLength: 100,
    maxLength: 1000000,  // 约1MB文本
    message: "请提供至少100个字符的隐私政策内容"
  },
  file: {
    required: true,
    maxSize: 5 * 1024 * 1024,  // 5MB
    allowedTypes: ['.txt', '.docx', '.pdf'],
    allowedMimeTypes: [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ]
  },
  
  // 项目名称
  projectName: {
    required: false,
    maxLength: 100,
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/,
    message: "项目名称只能包含中文、字母、数字、空格、连字符和下划线"
  }
};
```

### 4.5 敏感操作速率限制
```python
# 速率限制配置
RATE_LIMITS = {
    # 认证相关 (严格限制)
    "/api/v1/auth/login": {"rate": "5/minute", "burst": 3},
    "/api/v1/auth/register": {"rate": "3/minute", "burst": 2},
    
    # 分析相关 (中等限制)
    "/api/v1/analyze/text": {"rate": "10/minute", "burst": 3},
    "/api/v1/analyze/file": {"rate": "5/minute", "burst": 2},
    
    # 知识库操作 (严格限制)
    "/api/v1/knowledge/reload": {"rate": "2/minute", "burst": 1},
    "/api/v1/knowledge/laws": {"rate": "10/minute", "burst": 5},
    
    # 通用读取 (宽松限制)
    "/api/v1/projects": {"rate": "60/minute", "burst": 30},
    "/api/v1/knowledge/status": {"rate": "120/minute", "burst": 60}
}
```

---

## 五、前端状态管理方案

### 5.1 状态管理架构
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
}

// stores/projectStore.ts
interface ProjectState {
  projects: ProjectListItem[];
  currentProject: ProjectDetail | null;
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
  isLoading: boolean;
  isAnalyzing: boolean;
  analysisProgress: number;
  error: string | null;
}

interface ProjectActions {
  fetchProjects: (params?: ProjectListQuery) => Promise<void>;
  fetchProjectDetail: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  analyzeText: (text: string, name?: string) => Promise<string>;
  analyzeFile: (file: File, name?: string) => Promise<string>;
  exportReport: (id: string, format: string) => Promise<Blob>;
}

// stores/knowledgeStore.ts
interface KnowledgeState {
  status: KnowledgeStatus | null;
  isLoading: boolean;
  uploadProgress: number;
  error: string | null;
}
```

### 5.2 API服务层
```typescript
// services/api.ts
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 
           'https://huggingface.co/spaces/sybululu/privacy-policy-checker',
  timeout: 60000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = authStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    const errorResponse = error.response?.data as any;
    
    // 401错误 - Token过期
    if (error.response?.status === 401) {
      const errorCode = errorResponse?.error?.code;
      
      if (errorCode === 'TOKEN_EXPIRED' && originalRequest) {
        try {
          const refreshed = await authStore.getState().refreshToken();
          if (refreshed) {
            // 重试原请求
            originalRequest.headers.Authorization = 
              `Bearer ${authStore.getState().token}`;
            return api.request(originalRequest);
          }
        } catch {
          // 刷新失败，跳转登录
          await authStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    
    // 429错误 - 速率限制
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new Error(`请求过于频繁，请在${retryAfter}秒后重试`);
    }
    
    // 返回结构化错误
    return Promise.reject({
      code: errorResponse?.error?.code || 'NETWORK_ERROR',
      message: errorResponse?.error?.message || error.message,
      details: errorResponse?.error?.details,
      status: error.response?.status
    });
  }
);

export default api;
```

### 5.3 API方法封装
```typescript
// services/authApi.ts
export const authApi = {
  register: (data: RegisterRequest) => 
    api.post<RegisterResponse>('/api/v1/auth/register', data),
  
  login: (data: LoginRequest) => 
    api.post<LoginResponse>('/api/v1/auth/login', data),
  
  logout: () => 
    api.post('/api/v1/auth/logout'),
  
  refresh: (refresh_token: string) => 
    api.post<RefreshResponse>('/api/v1/auth/refresh', { refresh_token }),
  
  me: () => 
    api.get<MeResponse>('/api/v1/auth/me'),
};

// services/projectApi.ts
export const projectApi = {
  list: (params?: ProjectListQuery) => 
    api.get<ProjectListResponse>('/api/v1/projects', { params }),
  
  detail: (id: string) => 
    api.get<ProjectDetailResponse>(`/api/v1/projects/${id}`),
  
  delete: (id: string) => 
    api.delete(`/api/v1/projects/${id}`),
  
  analyzeText: (data: AnalyzeTextRequest) => 
    api.post<AnalyzeTextResponse>('/api/v1/analyze/text', data),
  
  analyzeFile: (formData: FormData) => {
    return api.post<AnalyzeFileResponse>('/api/v1/analyze/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        projectStore.setState({ uploadProgress: progress });
      }
    });
  },
  
  export: (id: string, format: string) => 
    api.get(`/api/v1/projects/${id}/export`, { 
      params: { format },
      responseType: 'blob',
    }),
};

// services/knowledgeApi.ts
export const knowledgeApi = {
  status: () => 
    api.get<KnowledgeStatusResponse>('/api/v1/knowledge/status'),
  
  uploadLaw: (formData: FormData) => {
    return api.post('/api/v1/knowledge/laws', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        knowledgeStore.setState({ uploadProgress: progress });
      }
    });
  },
  
  reload: () => 
    api.post<ReloadKnowledgeResponse>('/api/v1/knowledge/reload'),
  
  deleteLaw: (lawId: string) => 
    api.delete(`/api/v1/knowledge/laws/${lawId}`),
};
```

---

## 六、数据流图

### 6.1 隐私政策分析完整流程
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端 (React)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  用户输入界面                                                            │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐         │
│  │  📝 文本输入   │    │  📁 文件上传   │    │  📋 项目历史   │         │
│  │  (textarea)    │    │  (drag/drop)  │    │  (列表+分页)   │         │
│  └───────┬────────┘    └───────┬────────┘    └───────┬────────┘         │
│          │                      │                      │                 │
│          ▼                      ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    前端验证层                                     │    │
│  │  - 文本长度 ≥ 100字符                                            │    │
│  │  - 文件类型: .txt/.docx/.pdf                                     │    │
│  │  - 文件大小 ≤ 5MB                                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    状态管理 (Zustand)                            │    │
│  │  projectStore.analyzeText(text, name)                           │    │
│  │  projectStore.analyzeFile(file, name)                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
└──────────────────────────────│────────────────────────────────────────────┘
                               │
                    POST /api/v1/analyze/text
                    或 POST /api/v1/analyze/file
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              后端 (FastAPI)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    认证中间件                                     │    │
│  │  1. 验证JWT Token                                                │    │
│  │  2. 提取用户信息                                                  │    │
│  │  3. 检查速率限制                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    输入处理                                       │    │
│  │  - 文本: 直接使用                                                 │    │
│  │  - 文件: docx/pdf解析 → 提取文本                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CAPP130分析器                                  │    │
│  │  1. RoBERTa风险识别 (I1-I12违规检测)                             │    │
│  │  2. 返回违规位置和类型                                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    RAG法律检索                                    │    │
│  │  1. 对每个违规类型(I1-I12)检索相关法律条款                        │    │
│  │  2. 137条法律条款 (4部法律) → FAISS向量检索                      │    │
│  │  3. 返回相关条款内容和引用                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    mT5整改建议生成                                 │    │
│  │  1. 根据违规原文和法律条款生成整改建议                            │    │
│  │  2. 返回suggested_text                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    数据持久化                                     │    │
│  │  1. 保存项目到SQLite                                              │    │
│  │  2. 计算合规评分                                                  │    │
│  │  3. 返回完整分析结果                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                            │
└──────────────────────────────│────────────────────────────────────────────┘
                               │
                    AnalyzeTextResponse / AnalyzeFileResponse
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端 (React)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    结果展示                                       │    │
│  │  1. 评分仪表盘 (0-100分)                                          │    │
│  │  2. 风险等级标签 (高/中/低)                                        │    │
│  │  3. 违规列表 (I1-I12分类)                                          │    │
│  │  4. 整改建议弹窗                                                   │    │
│  │  5. 报告导出 (JSON/PDF/Markdown)                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 用户认证完整流程
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              认证流程                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │    注册      │         │    登录      │         │    登出      │    │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘    │
│         │                        │                        │              │
│         ▼                        ▼                        ▼              │
│  POST /auth/register     POST /auth/login           POST /auth/logout   │
│         │                        │                        │              │
│         ▼                        ▼                        │              │
│  验证邮箱格式              验证邮箱格式                    │              │
│  验证密码强度              验证密码                       │              │
│  检查邮箱唯一性            查询数据库                     │              │
│         │                        │                        │              │
│         ▼                        ▼                        ▼              │
│  创建用户记录 ──────▶   验证成功 ◀─────────  验证失败    │              │
│         │                        │           返回错误      │              │
│         ▼                        ▼                        │              │
│  生成Tokens ◀──────────────────┘                          │              │
│         │                                                    │              │
│         └────────────────────┬─────────────────────────────┘              │
│                              │                                             │
│                              ▼                                             │
│                    ┌──────────────────┐                                    │
│                    │  存储Tokens      │                                    │
│                    │  localStorage    │                                    │
│                    │  (敏感信息用     │                                    │
│                    │   httpOnly更好)  │                                    │
│                    └──────────────────┘                                    │
│                              │                                             │
│                              ▼                                             │
│                    ┌──────────────────┐                                    │
│                    │  更新状态        │                                    │
│                    │  isAuthenticated │                                    │
│                    │  user info       │                                    │
│                    └──────────────────┘                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 七、性能优化建议

### 7.1 前端优化
| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 代码分割 | React.lazy + Suspense | 首屏加载减少60% |
| 路由懒加载 | 动态import | 初始bundle < 200KB |
| 组件缓存 | React.memo | 减少重渲染30% |
| 图片优化 | WebP格式 + 懒加载 | 减少50%资源 |
| API缓存 | SWR/React Query | 减少重复请求50% |
| 防抖节流 | 分析请求debounce | 减少服务器压力 |

### 7.2 后端优化
| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 模型预热 | 启动时加载CAPP130 | 首次分析 < 5s |
| 向量库预加载 | 启动时加载FAISS | 检索 < 100ms |
| 异步处理 | asyncio +后台任务 | 分析时间减少30% |
| 响应压缩 | gzip/br编码 | 减少70%传输量 |
| 连接复用 | HTTP Keep-Alive | 减少连接建立时间 |

### 7.3 HuggingFace Spaces特殊配置
```python
# app.py - Gradio应用配置
import gradio as gr
from fastapi import FastAPI

# 创建FastAPI应用
app = FastAPI(title="Privacy Policy Checker API")

# Gradio界面
with gr.Blocks() as demo:
    # UI组件定义...

# 挂载到FastAPI
app = gr.mount_gradio_app(app, demo, path="/")

# HuggingFace Spaces推荐配置
# README.md
# ---
# title: Privacy Policy Checker
# emoji: 🔒
# colorFrom: blue
# colorTo: green
# sdk: gradio
# sdk_version: 4.8.0
# app_file: app.py
# pinned: false
# ---
```

---

## 八、部署配置

### 8.1 环境变量
```bash
# .env.production (后端 - HuggingFace Spaces)
JWT_SECRET=hf_xxxxx_default_secret  # HuggingFace secret
JWT_REFRESH_SECRET=hf_xxxxx_refresh_secret
DATABASE_URL=sqlite:///./data/privacy.db
HF_TOKEN=hf_xxxxx

# .env.production (前端)
VITE_API_BASE_URL=https://huggingface.co/spaces/sybululu/privacy-policy-checker/api
VITE_APP_NAME=隐私政策合规审查
```

### 8.2 HuggingFace Spaces配置
```yaml
# README.md
---
title: Privacy Policy Checker
emoji: 🔒
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: 4.8.0
app_file: app.py
pinned: false
config:
  avatar: false
  description: 基于RAG+MoE+mT5的隐私政策合规审查系统
  article: 
    - 137条法律条款覆盖
    - 支持12种违规类型检测
    - 自动生成整改建议
tags:
  - privacy
  - compliance
  - rag
  - chinese-law
---
```

---

## 九、测试计划

### 9.1 单元测试
```python
# tests/test_auth.py
def test_register_success():
    # 测试正常注册
    pass

def test_register_duplicate_email():
    # 测试重复邮箱
    pass

def test_login_success():
    # 测试正常登录
    pass

def test_login_wrong_password():
    # 测试错误密码
    pass

# tests/test_analyze.py
def test_analyze_text_success():
    # 测试文本分析
    pass

def test_analyze_file_docx():
    # 测试docx文件分析
    pass

# tests/test_knowledge.py
def test_knowledge_status():
    # 测试知识库状态
    pass

def test_retrieve_by_violation_type():
    # 测试违规类型检索
    pass
```

### 9.2 集成测试
```python
# tests/integration/test_full_flow.py
async def test_analyze_flow():
    """
    完整流程测试:
    1. 用户注册
    2. 登录获取Token
    3. 提交隐私政策分析
    4. 获取项目详情
    5. 导出报告
    """
    pass
```

---

## 十、实现检查清单

### 后端实现
- [ ] FastAPI项目结构搭建
- [ ] JWT认证实现 (注册/登录/刷新/登出)
- [ ] SQLite数据库集成
- [ ] CAPP130分析器集成
- [ ] FAISS向量库集成
- [ ] 137条法律条款加载
- [ ] RAG检索实现
- [ ] mT5整改建议生成
- [ ] API端点实现 (见第二部分)
- [ ] 错误处理统一方案
- [ ] CORS配置
- [ ] 速率限制
- [ ] HuggingFace Spaces部署配置

### 前端实现
- [ ] Vite + React项目搭建
- [ ] Tailwind CSS配置
- [ ] 状态管理 (Zustand)
- [ ] API服务层封装
- [ ] 认证页面 (登录/注册)
- [ ] 隐私政策分析页面
- [ ] 项目列表页面
- [ ] 项目详情页面
- [ ] 报告展示组件
- [ ] 错误处理和Toast提示
- [ ] 响应式设计
- [ ] Cloudflare Pages部署配置

---

**文档版本**: 1.0
**最后更新**: 2026-04-12
**法律知识库**: 137条条款 (4部法律)
**违规类型覆盖**: I1-I12 全覆盖
**状态**: 待实现
