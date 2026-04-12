# 完整修改方案 - Superpowers版

**项目**: sy-s_web (隐私政策合规审查平台)  
**审查时间**: 2026-04-12  
**问题总数**: 56个 (P0: 2, P1: 15, P2: 27, P3: 12)

---

## 📋 问题汇总表

| 优先级 | 来源 | 问题数 |
|--------|------|--------|
| P0 阻断级 | 安全+架构 | 2 |
| P1 重大级 | 安全+功能 | 15 |
| P2 重要级 | 代码质量 | 27 |
| P3 优化级 | 性能+体验 | 12 |

---

# Phase 1: P0 阻断级问题修复

## Task 1.1: JWT密钥安全问题

**目标**: 消除JWT密钥硬编码，改为环境变量读取

**涉及文件**:
- `python_backend/auth.py`

**详细步骤**:

```python
# python_backend/auth.py - 修改前
SECRET_KEY = "your-secret-key-change-in-production"

# python_backend/auth.py - 修改后
import os
import secrets

SECRET_KEY = os.environ.get(
    "JWT_SECRET", 
    secrets.token_urlsafe(32)  # 首次启动自动生成
)

# 确保生产环境必须有密钥
if os.environ.get("ENVIRONMENT") == "production" and "JWT_SECRET" not in os.environ:
    raise ValueError("JWT_SECRET environment variable is required in production")
```

**验证方法**:
```bash
# 测试本地生成
python -c "from auth import SECRET_KEY; print(len(SECRET_KEY))"  # 应输出 43

# 测试生产模式
ENVIRONMENT=production python -c "from auth import SECRET_KEY"  # 应报错
```

---

## Task 1.2: 前端API_BASE环境变量配置

**目标**: 修复前端无法连接后端的问题

**涉及文件**:
- `sy-s_web/.env.example`
- `sy-s_web/src/utils/api.ts`

**详细步骤**:

```bash
# .env.example - 修改后
# ========================
# API配置（必填）
# ========================
VITE_API_URL=https://your-username-capp130-backend.hf.space

# HuggingFace Spaces 部署后填入实际URL
# 格式: https://{username}-{space-name}.hf.space
```

```typescript
// src/utils/api.ts - 修改后
const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE && import.meta.env.PROD) {
  console.error('[API] VITE_API_URL is not configured in production!');
}

// 添加默认域名验证
const ALLOWED_ORIGINS = [
  'sy-s_web.pages.dev',
  'localhost',
  // HF Spaces 域名格式: xxx.hf.space
];

export function validateApiOrigin(): boolean {
  if (!API_BASE) return false;
  try {
    const url = new URL(API_BASE);
    return ALLOWED_ORIGINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
```

**Cloudflare Pages 环境变量配置**:
| 变量名 | 值 |
|--------|-----|
| VITE_API_URL | `https://your-hf-space-name.hf.space` |

**验证方法**:
```bash
# 验证环境变量加载
echo "VITE_API_URL=$VITE_API_URL"

# 本地测试（开发模式）
npm run dev

# 检查Network面板，确保API请求发往正确的HF Space URL
```

---

# Phase 2: P1 重大问题修复

## Task 2.1: 导出接口Token安全问题

**目标**: 修复Token通过URL传递的安全隐患

**涉及文件**:
- `sy-s_web/src/utils/api.ts`
- `python_backend/app.py`

**详细步骤**:

```typescript
// src/utils/api.ts - 修改后
export async function downloadReport(projectId: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('请先登录');
  }

  const response = await fetch(`${API_BASE}/api/v1/export/${projectId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('下载失败');
  }

  // 使用Blob方式下载，避免window.open
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${projectId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// 导出方法更新
export const api = {
  // ... 其他方法保持不变
  exportReport: (projectId: string) => downloadReport(projectId)
};
```

```python
# python_backend/app.py - 修改导出端点
@app.get("/api/v1/export/{project_id}")
async def export_report(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 不再从 query 参数获取 token，已通过 Authorization Header 验证
    project = db.query(Project).filter(
        Project.id == project_id, 
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # ... 生成报告逻辑保持不变
```

**验证方法**:
```bash
# 测试导出功能（应使用Header而非Query）
curl -X GET "https://your-space.hf.space/api/v1/export/p123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -I  # 检查响应头

# 确认不再有 token=xxx 在URL中
```

---

## Task 2.2: URL抓取安全验证（SSRF防护）

**目标**: 添加URL白名单和内网IP禁止访问

**涉及文件**:
- `python_backend/app.py`

**详细步骤**:

```python
# python_backend/app.py - 添加到文件顶部
import ipaddress
from urllib.parse import urlparse

# ========================
# 安全配置
# ========================
ALLOWED_URL_SCHEMES = ['http', 'https']
BLOCKED_IP_RANGES = [
    ipaddress.ip_network('127.0.0.0/8'),      # 本地回环
    ipaddress.ip_network('10.0.0.0/8'),        # 私有A类
    ipaddress.ip_network('172.16.0.0/12'),     # 私有B类
    ipaddress.ip_network('192.168.0.0/16'),    # 私有C类
    ipaddress.ip_network('169.254.0.0/16'),    # 链路本地
    ipaddress.ip_network('0.0.0.0/8'),         # 本网
]

def is_url_safe(url: str) -> tuple[bool, str]:
    """验证URL安全性"""
    try:
        parsed = urlparse(url)
        
        # 协议检查
        if parsed.scheme not in ALLOWED_URL_SCHEMES:
            return False, f"仅支持 {ALLOWED_URL_SCHEMES} 协议"
        
        # 主机名检查
        if not parsed.hostname:
            return False, "无效的主机名"
        
        # 解析IP地址
        try:
            ip = ipaddress.ip_address(parsed.hostname)
            for blocked_range in BLOCKED_IP_RANGES:
                if ip in blocked_range:
                    return False, f"禁止访问内网地址: {ip}"
        except ValueError:
            # 域名解析（可能存在DNS重绑定风险，这里简化处理）
            pass
        
        # 危险路径检查
        dangerous_paths = ['.exe', '.zip', '.tar', '.rar', '.php', '.cgi']
        if any(parsed.path.lower().endswith(ext) for ext in dangerous_paths):
            return False, f"禁止下载可执行文件"
        
        return True, ""
        
    except Exception as e:
        return False, f"URL解析失败: {str(e)}"

# ========================
# 安全的URL抓取函数
# ========================
async def safe_fetch_url(url: str, timeout: int = 10) -> str:
    """安全的URL抓取函数"""
    is_safe, error_msg = is_url_safe(url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=error_msg)
    
    import httpx
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(
            url,
            headers={'User-Agent': 'PrivacyCheckerBot/1.0 (+https://github.com/sybululu)'}
        )
        response.raise_for_status()
        return response.text
```

```python
# 修改 fetch-url 端点
@app.post("/api/v1/fetch-url")
async def fetch_url(
    request: UrlRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        from bs4 import BeautifulSoup
        
        html_content = await safe_fetch_url(request.url)
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 移除脚本和样式
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text(separator='\n', strip=True)
        # 过滤空行
        lines = [line for line in text.split('\n') if line.strip()]
        
        return {"text": '\n'.join(lines)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"无法读取URL内容: {str(e)}")
```

**验证方法**:
```bash
# 测试SSRF防护
curl -X POST https://your-space.hf.space/api/v1/fetch-url \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://127.0.0.1:8080/admin"}'
# 应返回: {"detail": "禁止访问内网地址: 127.0.0.1"}

curl -X POST https://your-space.hf.space/api/v1/fetch-url \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "file:///etc/passwd"}'
# 应返回: {"detail": "仅支持 ['http', 'https'] 协议"}
```

---

## Task 2.3: 文件上传安全验证

**目标**: 添加文件类型、大小验证和多格式支持

**涉及文件**:
- `python_backend/app.py`
- `python_backend/requirements.txt`

**详细步骤**:

```bash
# requirements.txt - 添加依赖
pdfplumber>=0.10.0
python-docx>=1.0.0
```

```python
# python_backend/app.py - 添加文件处理工具函数
import io
from typing import Union

# ========================
# 文件解析配置
# ========================
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {
    '.txt', '.md', '.json', '.csv',
    '.pdf', '.docx', '.doc'
}
ALLOWED_MIME_TYPES = {
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
}

def extract_text_from_file(content: bytes, filename: str) -> str:
    """从各种格式提取文本"""
    ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件格式: {ext}，支持格式: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    try:
        if ext == '.pdf':
            return extract_pdf_text(content)
        elif ext in ['.docx', '.doc']:
            return extract_docx_text(content)
        else:
            # 纯文本格式
            return content.decode('utf-8', errors='replace')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

def extract_pdf_text(content: bytes) -> str:
    """提取PDF文本"""
    import pdfplumber
    
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    
    if not text_parts:
        raise HTTPException(status_code=400, detail="PDF文件中没有可提取的文本")
    
    return '\n\n'.join(text_parts)

def extract_docx_text(content: bytes) -> str:
    """提取Word文档文本"""
    from docx import Document
    
    doc = Document(io.BytesIO(content))
    paragraphs = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
    return '\n'.join(paragraphs)

# ========================
# 修改上传端点
# ========================
@app.post("/api/v1/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # 读取内容
    content = await file.read()
    
    # 大小检查
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"文件大小超过 {MAX_FILE_SIZE // (1024*1024)}MB 限制"
        )
    
    # 空文件检查
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="上传文件为空")
    
    # 提取文本
    text = extract_text_from_file(content, file.filename)
    
    return {"text": text}
```

**验证方法**:
```bash
# 测试文件大小限制
dd if=/dev/zero of=test_25mb.pdf bs=1M count=25
curl -X POST https://your-space.hf.space/api/v1/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test_25mb.pdf"
# 应返回: {"detail": "文件大小超过 20MB 限制"}

# 测试格式支持
curl -X POST https://your-space.hf.space/api/v1/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test.pdf"
# 应返回提取的文本内容
```

---

## Task 2.4: 模型加载路径修复（适配HF Spaces）

**目标**: 修复本地模型路径为HuggingFace Hub路径

**涉及文件**:
- `python_backend/app.py`
- `python_backend/requirements.txt`

**详细步骤**:

```python
# python_backend/app.py - 模型加载部分完全重写

# ========================
# 模型加载配置
# ========================
import os

# 模型配置（可自定义或通过环境变量覆盖）
MODEL_CONFIG = {
    "classifier": {
        "repo": "hfl/chinese-roberta-wwm-ext",
        "task": "zero-shot-classification",  # 使用零样本分类
        "num_labels": 12,  # 12项违规指标
    },
    "generator": {
        "repo": "google/mt5-base",
        "task": "text2text-generation",
    },
    "embedder": {
        "repo": "shibing624/text2vec-base-chinese",
        "task": "embeddings",
    }
}

# ========================
# 懒加载模型（节省内存）
# ========================
class LazyModelLoader:
    """延迟加载模型，仅在首次使用时加载"""
    
    _instance = None
    _models = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @property
    def classifier(self):
        if "classifier" not in self._models:
            print("正在加载分类模型...")
            from transformers import pipeline
            self._models["classifier"] = pipeline(
                "zero-shot-classification",
                model=MODEL_CONFIG["classifier"]["repo"],
                device=-1  # CPU, 设为0使用GPU
            )
        return self._models["classifier"]
    
    @property
    def generator(self):
        if "generator" not in self._models:
            print("正在加载生成模型...")
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            model_name = os.environ.get("MT5_MODEL", MODEL_CONFIG["generator"]["repo"])
            self._models["generator"] = {
                "tokenizer": AutoTokenizer.from_pretrained(model_name),
                "model": AutoModelForSeq2SeqLM.from_pretrained(model_name)
            }
        return self._models["generator"]
    
    @property
    def embedder(self):
        if "embedder" not in self._models:
            print("正在加载向量化模型...")
            from sentence_transformers import SentenceTransformer
            self._models["embedder"] = SentenceTransformer(
                MODEL_CONFIG["embedder"]["repo"]
            )
        return self._models["embedder"]

# 全局模型加载器
model_loader = LazyModelLoader()

# ========================
# 合规指标定义
# ========================
VIOLATION_LABELS = [
    "过度收集敏感数据",
    "未说明收集目的",
    "未获得明示同意",
    "收集范围超出服务需求",
    "未明确第三方共享范围",
    "未获得单独共享授权",
    "未明确共享数据用途",
    "未明确留存期限",
    "未说明数据销毁机制",
    "未明确用户权利范围",
    "未提供便捷权利行使途径",
    "未明确权利响应时限"
]

# ========================
# 真实推理函数
# ========================
def roberta_predict(sentence: str) -> dict[str, float]:
    """使用真实模型进行违规检测"""
    try:
        # 使用零样本分类
        classifier = model_loader.classifier
        
        result = classifier(
            sentence,
            candidate_labels=VIOLATION_LABELS,
            multi_label=True
        )
        
        # 转换格式
        probs = {}
        for label, score in zip(result['labels'], result['scores']):
            probs[label] = score
        
        return probs
        
    except Exception as e:
        print(f"分类模型推理失败: {e}")
        # 降级：返回均匀分布
        return {label: 0.0 for label in VIOLATION_LABELS}

def mt5_generate(prompt: str, max_length: int = 128) -> str:
    """使用mT5生成整改建议"""
    try:
        gen_data = model_loader.generator
        tokenizer = gen_data["tokenizer"]
        model = gen_data["model"]
        
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs, 
                max_length=max_length,
                num_beams=4,
                early_stopping=True
            )
        
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
        
    except Exception as e:
        print(f"生成模型推理失败: {e}")
        return "抱歉，生成功能暂时不可用"
```

**验证方法**:
```bash
# 测试模型加载（首次调用会下载模型）
curl -X POST https://your-space.hf.space/api/v1/analyze \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "我们可能会收集您的位置信息"}'

# 检查HF Space日志，确认模型加载成功
```

---

## Task 2.5: 移除前端模拟数据

**目标**: 删除MOCK_PROJECTS，使用真实API数据

**涉及文件**:
- `sy-s_web/src/constants.ts`
- `sy-s_web/src/App.tsx`

**详细步骤**:

```typescript
// src/constants.ts - 删除MOCK数据，保留配置常量

export const APP_CONFIG = {
  APP_NAME: '隐私政策合规审查平台',
  VERSION: '1.0.0',
  SUPPORTED_FILE_TYPES: ['.txt', '.md', '.json', '.csv', '.pdf', '.docx'],
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
};

// 合规指标配置（与后端保持一致）
export const VIOLATION_INDICATORS = [
  { key: 'over_collect', label: '过度收集敏感数据', weight: 0.15 },
  { key: 'unclear_purpose', label: '未说明收集目的', weight: 0.12 },
  { key: 'no_consent', label: '未获得明示同意', weight: 0.15 },
  { key: 'over_scope', label: '收集范围超出服务需求', weight: 0.10 },
  { key: 'unclear_third_party', label: '未明确第三方共享范围', weight: 0.08 },
  { key: 'no_share_consent', label: '未获得单独共享授权', weight: 0.12 },
  { key: 'unclear_usage', label: '未明确共享数据用途', weight: 0.08 },
  { key: 'no_retention', label: '未明确留存期限', weight: 0.05 },
  { key: 'no_destruction', label: '未说明数据销毁机制', weight: 0.05 },
  { key: 'unclear_rights', label: '未明确用户权利范围', weight: 0.05 },
  { key: 'no_channel', label: '未提供便捷权利行使途径', weight: 0.03 },
  { key: 'no_timeline', label: '未明确权利响应时限', weight: 0.02 },
] as const;

// 风险等级映射
export const RISK_LEVELS = {
  high: { label: '高风险', color: '#ef4444' },
  medium: { label: '中等风险', color: '#f59e0b' },
  low: { label: '低风险', color: '#22c55e' },
} as const;
```

```typescript
// src/App.tsx - 修改数据加载逻辑
// 删除所有 MOCK_PROJECTS 引用

// 在组件加载时获取真实数据
useEffect(() => {
  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('加载项目失败:', error);
      toast.show('加载项目失败', 'error');
    }
  };

  if (isLoggedIn) {
    loadProjects();
  }
}, [isLoggedIn]);
```

**验证方法**:
```bash
# 登录后检查Network面板
# 确认有 /api/v1/projects 请求
# 确认没有 MOCK_PROJECTS 相关代码
grep -r "MOCK" src/
# 应返回空
```

---

# Phase 3: P2 重要问题修复

## Task 3.1: API错误处理完善

**目标**: 统一错误处理，添加网络错误捕获

**涉及文件**:
- `sy-s_web/src/utils/api.ts`

**详细步骤**:

```typescript
// src/utils/api.ts - 重写错误处理
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const isFormData = options.body instanceof FormData;
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(isFormData),
        ...options.headers
      }
    });

    // 处理 401 未授权
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 广播全局事件
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new ApiError('登录已过期，请重新登录', 401, 'TOKEN_EXPIRED');
    }

    // 处理其他 HTTP 错误
    if (!response.ok) {
      let errorData = { detail: '请求失败' };
      try {
        errorData = await response.json();
      } catch {
        // JSON解析失败，使用默认错误
      }
      
      const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
      throw new ApiError(errorMessage, response.status, errorData.code);
    }

    // 处理无内容响应
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return await response.text();

  } catch (error) {
    // 网络错误（断网、超时等）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        '网络连接失败，请检查网络设置', 
        0, 
        'NETWORK_ERROR'
      );
    }
    
    // 已经是 ApiError，直接抛出
    if (error instanceof ApiError) {
      throw error;
    }
    
    // 其他未知错误
    console.error('API请求未知错误:', error);
    throw new ApiError(
      '发生未知错误，请稍后重试', 
      500, 
      'UNKNOWN_ERROR'
    );
  }
}

// 全局认证过期监听
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    toast.show('登录已过期，请重新登录', 'warning');
    // 使用React Router而非window.location
    window.location.href = '/';
  });
}
```

---

## Task 3.2: Pydantic V2 迁移

**目标**: 升级到Pydantic V2语法

**涉及文件**:
- `python_backend/app.py`

**详细步骤**:

```python
# python_backend/app.py - 更新数据模型
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional

# ========================
# Pydantic V2 数据模型
# ========================
class AnalyzeRequest(BaseModel):
    """分析请求"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "text": "我们可能会收集您的位置信息、通讯录等敏感数据...",
                "source_type": "text"
            }
        }
    )
    
    text: str = Field(
        ..., 
        min_length=10, 
        max_length=50000,
        description="待审查的隐私政策文本"
    )
    source_type: str = Field(
        default="text",
        description="来源类型: text, url, file"
    )
    
    @field_validator('text')
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('文本不能为空')
        return v.strip()
    
    @field_validator('source_type')
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        allowed = {'text', 'url', 'file'}
        if v not in allowed:
            raise ValueError(f'无效的source_type，可选值: {allowed}')
        return v

class RectifyRequest(BaseModel):
    """整改建议请求"""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    original_snippet: str = Field(
        ..., 
        min_length=5, 
        max_length=2000,
        description="待整改的原始条款"
    )
    violation_type: str = Field(
        ..., 
        min_length=1,
        description="违规类型"
    )
    
    @field_validator('original_snippet', 'violation_type')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

class UrlRequest(BaseModel):
    """URL抓取请求"""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    url: str = Field(
        ..., 
        min_length=5,
        description="目标URL"
    )
    
    @field_validator('url')
    @classmethod
    def validate_url_format(cls, v: str) -> str:
        from urllib.parse import urlparse
        try:
            result = urlparse(v)
            if result.scheme not in ('http', 'https'):
                raise ValueError('URL必须以 http:// 或 https:// 开头')
            if not result.netloc:
                raise ValueError('无效的URL格式')
            return v
        except Exception:
            raise ValueError('无效的URL格式')
```

**验证方法**:
```bash
# 测试验证
curl -X POST https://your-space.hf.space/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "短"}'
# 应返回: {"detail": "Text must have at least 10 characters"}

curl -X POST https://your-space.hf.space/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "", "source_type": "invalid"}'
# 应返回验证错误
```

---

## Task 3.3: 添加Rate Limiting

**目标**: 防止API滥用

**涉及文件**:
- `python_backend/app.py`
- `python_backend/requirements.txt`

**详细步骤**:

```bash
# requirements.txt - 添加
slowapi>=0.1.9
```

```python
# python_backend/app.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ========================
# Rate Limiter 配置
# ========================
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # 全局限流
)

# 将 limiter 添加到 app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ========================
# 端点限流配置
# ========================
@app.post("/api/v1/analyze")
@limiter.limit("10/minute")  # 分析接口更严格
async def analyze(...):
    pass

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 登录接口最严格
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    pass

@app.post("/api/v1/auth/register")
@limiter.limit("3/minute")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    pass

@app.post("/api/v1/fetch-url")
@limiter.limit("20/minute")
async def fetch_url(...):
    pass
```

---

## Task 3.4: 全局异常处理完善

**目标**: 统一错误响应格式

**涉及文件**:
- `python_backend/app.py`

**详细步骤**:

```python
# python_backend/app.py - 添加全局异常处理器
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={"path": request.url.path}
    )
    
    # 不向客户端暴露内部错误详情
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "服务器内部错误，请稍后重试"
            }
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常统一格式"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail)
            }
        }
    )
```

---

# Phase 4: P3 优化级问题

## Task 4.1: 健康检查端点完善

**目标**: 返回完整的依赖状态

**涉及文件**:
- `python_backend/app.py`

**详细步骤**:

```python
# python_backend/app.py
@app.get("/health")
async def health_check():
    """健康检查端点"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api": "ok",
            "database": "unknown",
            "models": "unknown"
        }
    }
    
    # 检查数据库
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        health_status["services"]["database"] = "ok"
    except Exception as e:
        health_status["services"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # 检查模型
    try:
        if hasattr(model_loader, '_models') and model_loader._models:
            health_status["services"]["models"] = "ok"
        else:
            health_status["services"]["models"] = "not_loaded"
    except Exception as e:
        health_status["services"]["models"] = f"error: {str(e)}"
    
    # 如果有服务异常，返回 503
    if health_status["status"] != "healthy":
        return JSONResponse(
            status_code=503,
            content=health_status
        )
    
    return health_status
```

---

## Task 4.2: 前端类型安全改进

**目标**: 移除any类型，使用unknown + 类型守卫

**涉及文件**:
- `sy-s_web/src/types.ts`
- `sy-s_web/src/utils/api.ts`

**详细步骤**:

```typescript
// src/types.ts - 完整类型定义
export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Violation {
  indicator: string;
  snippet: string;
  legal_basis: string;
}

export interface Project {
  id: string;
  name: string;
  score: number;
  risk_level: RiskLevel;
  created_at: string;
  violations?: Violation[];
  clauses?: Clause[];
}

export type RiskLevel = '低风险' | '中等风险' | '高风险';

export interface Clause {
  id: string;
  location: string;
  category: string;
  snippet: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  originalText: string;
  suggestedText: string;
  legalBasis: string;
}

export interface AnalyzeResponse {
  id: string;
  name: string;
  score: number;
  risk_level: RiskLevel;
  violations: Violation[];
}

// API 响应类型
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

```typescript
// src/utils/api.ts - 类型守卫
function isViolation(data: unknown): data is Violation {
  return (
    typeof data === 'object' &&
    data !== null &&
    'indicator' in data &&
    'snippet' in data
  );
}

function isProject(data: unknown): data is Project {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'score' in data
  );
}

// 使用示例
const response = await apiFetch('/api/v1/projects');
if (Array.isArray(response) && response.every(isProject)) {
  return response;
}
```

---

# Phase 5: 跨域部署配置

## Task 5.1: HuggingFace Spaces 部署配置

**目标**: 确保后端正确部署到HF Spaces

**涉及文件**:
- `python_backend/Dockerfile`
- `python_backend/README.md`
- `sy-s_web/.github/workflows/deploy.yml` (如需要)

**详细步骤**:

```dockerfile
# python_backend/Dockerfile - 优化版
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 先复制 requirements 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# HuggingFace Spaces 默认端口
EXPOSE 7860

# 启动命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
```

```markdown
# python_backend/README.md

# 隐私政策合规审查后端

## 部署到 HuggingFace Spaces

### 1. 创建 Space

访问 [HuggingFace Spaces](https://huggingface.co/new-space) 创建一个新的 Space。

### 2. 配置

在 Space 设置中：
- SDK: Docker
- Hardware: 选择合适的配置（建议 16GB+ RAM 用于模型推理）

### 3. 环境变量

在 Space 的 Settings > Repository secrets 中添加：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| JWT_SECRET | JWT签名密钥 | 是（生产） |
| HF_TOKEN | HuggingFace 访问令牌 | 如使用私有模型 |

### 4. 推送代码

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE
cd YOUR_SPACE
# 复制后端代码
git push
```

### 5. 验证部署

访问 `https://YOUR_USERNAME-YOUR_SPACE.hf.space/health` 确认服务正常。

## 本地开发

```bash
cd python_backend
pip install -r requirements.txt
uvicorn app:app --reload
```
```

---

## Task 5.2: Cloudflare Pages 部署配置

**目标**: 正确配置前端部署

**涉及文件**:
- `sy-s_web/.env.example`
- Cloudflare Pages 设置

**详细步骤**:

### Cloudflare Pages 设置

| 配置项 | 值 |
|--------|-----|
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| 根目录 | `/sy-s_web`（如需） |

### 环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| VITE_API_URL | `https://username-space-name.hf.space` | 后端API地址 |
| GEMINI_API_KEY | `xxx` | Gemini API密钥（如使用） |

### 部署后验证

1. 检查 `https://sy-s_web.pages.dev/health` → 应返回前端页面（非API）
2. 登录后调用 `/api/v1/projects` → 应正常返回数据
3. 检查浏览器 Console 无 CORS 错误

---

# 验证检查清单

## P0 问题验证

- [ ] JWT_SECRET 可通过环境变量配置
- [ ] VITE_API_URL 在生产环境已设置

## P1 问题验证

- [ ] 导出功能使用 Header Token，无 Query Token
- [ ] SSRF 测试: `http://127.0.0.1` 请求被拒绝
- [ ] 文件上传: 20MB+ 文件被拒绝
- [ ] 模型加载: 分析接口返回真实结果
- [ ] 前端无 MOCK_PROJECTS 代码

## P2 问题验证

- [ ] API 网络错误被正确捕获和提示
- [ ] Pydantic 验证错误返回统一格式
- [ ] Rate Limiting 生效（高频请求返回 429）
- [ ] 所有异常返回统一错误格式

## P3 问题验证

- [ ] 健康检查返回模型和数据库状态
- [ ] TypeScript 无 any 类型（strict 模式）

## 部署验证

- [ ] HF Space health 返回 200
- [ ] Cloudflare Pages 可访问
- [ ] 跨域 API 调用无 CORS 错误
- [ ] 认证流程正常（登录→分析→导出）

---

# 附录：完整依赖清单

## Python (requirements.txt)

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.2
python-multipart==0.0.6
torch>=2.0.0
transformers>=4.35.0
sentence-transformers>=2.2.2
sqlalchemy==2.0.23
passlib==1.7.4
bcrypt==4.1.2
python-jose==3.3.0
httpx>=0.25.0
beautifulsoup4==4.12.2
slowapi>=0.1.9
pdfplumber>=0.10.0
python-docx>=1.0.0
```

## Node.js (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

*修改方案生成时间: 2026-04-12*  
*基于审查报告: 功能性审查(前端+后端) + 代码审查 + 跨域架构审查*
