# 法律知识库架构设计方案

**日期**: 2026-04-12
**任务**: 设计隐私政策合规审查RAG知识库
**状态**: 待用户审批

---

## 一、设计目标

| 目标 | 描述 |
|------|------|
| **可配置** | 法律条款从JSON文件加载，非硬编码 |
| **覆盖全面** | 《个人信息保护法》《数据安全法》《网络安全法》+ GB/T 35273 |
| **可映射** | 条款需支持12种违规类型(I1-I12)检索 |
| **可扩展** | 用户可自行添加/修改法律条款 |
| **可维护** | 代码与数据分离，便于版本管理 |

---

## 二、系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          用户请求层                                   │
│                     (隐私政策文本 / API调用)                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API 网关层 (FastAPI)                          │
│                    /api/v1/analyze - 分析接口                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  文本解析器    │       │   RAG检索器   │       │  违规分类器   │
│ TextParser    │       │  VectorStore  │       │ CAPP130Analyzer│
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        │                       ▼                       │
        │              ┌───────────────┐               │
        │              │ 法律知识库接口 │               │
        │              │ LegalKBLoader │               │
        │              └───────────────┘               │
        │                       │                       │
        │                       ▼                       │
        │              ┌─────────────────────────────────────┐
        │              │         知识库存储层                 │
        │              │  ┌─────────┐  ┌─────────────┐       │
        │              │  │JSON文件 │  │ FAISS向量库 │       │
        │              │  │(源数据) │  │  (检索索引)  │       │
        │              │  └─────────┘  └─────────────┘       │
        │              └─────────────────────────────────────┘
        │                                                       │
        └───────────────────────┬───────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           分析结果层                                 │
│   - 违规条款检测 (I1-I12)  - 法律条款引用  - 整改建议生成             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、文件结构设计

```
privacy-policy-checker/
├── app.py                      # 主应用 (FastAPI)
├── analyzer.py                 # 违规分析器 (CAPP130)
├── rag.py                      # RAG检索模块 [重构]
├── models.py                   # 数据模型
│
├── knowledge/                  # 📌 法律知识库目录 (新增)
│   ├── _meta.json              # 知识库元数据
│   ├── laws/                   # 法律条款源文件
│   │   ├── personal_info_law.json      # 《个人信息保护法》
│   │   ├── data_security_law.json       # 《数据安全法》
│   │   ├── cybersecurity_law.json      # 《网络安全法》
│   │   └── gb35273_2020.json            # GB/T 35273-2020
│   └── mapping/                # 违规类型映射
│       └── violation_mapping.json       # I1-I12 映射配置
│
├── src/                        # 📌 源代码模块 (重构)
│   ├── __init__.py
│   ├── loader/                 # 知识库加载模块
│   │   ├── __init__.py
│   │   ├── legal_kb_loader.py  # 法律知识库加载器
│   │   └── chunker.py         # 文档切分器
│   ├── store/                  # 向量存储模块
│   │   ├── __init__.py
│   │   └── vector_store.py     # FAISS向量存储
│   ├── search/                 # 检索模块
│   │   ├── __init__.py
│   │   └── retriever.py        # 检索器
│   └── config.py               # 配置管理
│
├── vector_store/               # 向量数据库 (运行时生成)
│   ├── index.faiss
│   └── chunks.pkl
│
└── requirements.txt
```

---

## 四、JSON结构设计

### 4.1 法律条款文件结构 (`laws/*.json`)

```json
{
  "_meta": {
    "law_name": "个人信息保护法",
    "law_name_en": "Personal Information Protection Law",
    "effective_date": "2021-11-01",
    "jurisdiction": "中国",
    "version": "1.0"
  },
  "articles": [
    {
      "article_id": "PIPL-017",
      "article_number": "第十七条",
      "title": "个人信息处理规则告知",
      "content": "个人信息处理者处理个人信息，应当事先告知个人信息主体以下事项：...",
      "keywords": ["告知义务", "处理目的", "保存期限", "权利行使"],
      "violation_types": ["I2", "I8"],  // 映射到违规类型
      "risk_level": "medium",
      "annotations": {
        "key_points": ["处理目的必须明确", "保存期限必须具体"],
        "common_issues": ["使用模糊表述如'必要时'", "未明确保存期限"]
      }
    }
  ]
}
```

### 4.2 违规映射文件 (`mapping/violation_mapping.json`)

```json
{
  "_meta": {
    "description": "12种违规类型与法律条款的映射关系",
    "version": "1.0"
  },
  "mappings": {
    "I1": {
      "name": "收集范围超出必要",
      "category": "Information Collection",
      "primary_laws": [
        {"law": "PIPL", "article": "第六条"},
        {"law": "CSL", "article": "第四十一条"}
      ],
      "keywords": ["最小必要", "服务无关", "超范围收集"],
      "examples": {
        "violation": "收集用户的通讯录、通话记录等与服务无关的信息",
        "compliant": "仅收集用户注册所必需的手机号码和验证码"
      }
    },
    "I2": {
      "name": "未明确收集目的",
      "category": "Information Collection",
      "primary_laws": [
        {"law": "PIPL", "article": "第十七条"}
      ],
      "keywords": ["处理目的", "使用目的", "收集目的"],
      "examples": {
        "violation": "收集用户位置信息用于'改善服务'",
        "compliant": "收集用户位置信息用于提供就近商家推荐服务"
      }
    }
    // ... I3-I12 同理
  }
}
```

### 4.3 知识库元数据 (`_meta.json`)

```json
{
  "version": "1.0.0",
  "last_updated": "2024-01-15",
  "laws_count": 4,
  "total_articles": 45,
  "coverage": {
    "I1": ["PIPL-006", "CSL-041"],
    "I2": ["PIPL-017"],
    // ...
    "I12": ["PIPL-050"]
  }
}
```

---

## 五、核心类设计

### 5.1 知识库加载器 (`LegalKBLoader`)

```python
class LegalKBLoader:
    """法律知识库加载器 - 从JSON文件加载法律条款"""
    
    def __init__(self, knowledge_dir: str = "./knowledge"):
        self.knowledge_dir = Path(knowledge_dir)
        self.laws: Dict[str, LawDocument] = {}
        self.mapping: Dict[str, ViolationMapping] = {}
    
    def load_all(self) -> None:
        """加载所有法律文件和映射配置"""
        self._load_laws()
        self._load_mapping()
    
    def _load_laws(self) -> None:
        """加载laws目录下的所有法律JSON文件"""
    
    def _load_mapping(self) -> None:
        """加载违规类型映射配置"""
    
    def get_article(self, article_id: str) -> Optional[Article]:
        """根据条款ID获取法律条款"""
    
    def get_articles_by_violation(self, violation_id: str) -> List[Article]:
        """获取指定违规类型关联的所有法律条款"""
    
    def search_articles(self, query: str) -> List[Article]:
        """根据关键词搜索相关条款"""
```

### 5.2 向量存储 (`VectorStore`)

```python
class VectorStore:
    """FAISS向量存储 - 支持持久化"""
    
    def __init__(self, embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        self.embedding_model = embedding_model
        self.index = None
        self.chunks = []
        self.persist_path = Path("./vector_store")
    
    def initialize(self, articles: List[Article]) -> None:
        """从Article列表初始化向量库"""
    
    def persist(self) -> None:
        """保存向量库到磁盘"""
    
    def restore(self) -> bool:
        """从磁盘恢复向量库"""
    
    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """向量相似度检索"""
```

### 5.3 检索器 (`Retriever`)

```python
class Retriever:
    """法律条款检索器"""
    
    def __init__(self, vector_store: VectorStore, mapping: ViolationMapping):
        self.vector_store = vector_store
        self.mapping = mapping
    
    def retrieve_by_violation_type(
        self, 
        violation_type: str, 
        context: str
    ) -> List[RetrievedChunk]:
        """根据违规类型检索相关法律条款"""
    
    def retrieve_by_query(
        self, 
        query: str, 
        filters: Optional[Dict] = None
    ) -> List[RetrievedChunk]:
        """通用检索，支持按法律/条款类型过滤"""
```

### 5.4 配置管理 (`Config`)

```python
@dataclass
class Config:
    """系统配置"""
    
    # 知识库配置
    knowledge_dir: str = "./knowledge"
    default_top_k: int = 5
    
    # 模型配置
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    analyzer_model: str = "EnlightenedAI/TCSI_pp_zh"
    
    # 向量存储配置
    vector_store_path: str = "./vector_store"
    persist_index: bool = True
    
    # 合规检查配置
    enabled_violation_types: List[str] = field(default_factory=lambda: [f"I{i}" for i in range(1, 13)])
```

---

## 六、数据流图

```
┌──────────────────────────────────────────────────────────────────────┐
│                          启动阶段                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   knowledge/*.json ──► LegalKBLoader ──► Article objects            │
│                                      │                               │
│                                      ▼                               │
│                           VectorStore.initialize()                   │
│                                      │                               │
│                                      ▼                               │
│                       vector_store/index.faiss (持久化)              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                          分析阶段                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   用户输入隐私政策 ──► TextParser ──► 条款列表                       │
│                                      │                               │
│                                      ▼                               │
│                           CAPP130Analyzer                            │
│                           (违规检测 I1-I12)                          │
│                                      │                               │
│                    ┌─────────────────┼─────────────────┐              │
│                    ▼                 ▼                 ▼              │
│               检测到I1          检测到I3          检测到I5          │
│                    │                 │                 │              │
│                    ▼                 ▼                 ▼              │
│            Retriever          Retriever          Retriever           │
│            (retrieve_by_violation_type)                               │
│                    │                 │                 │              │
│                    └─────────────────┼─────────────────┘              │
│                                      ▼                               │
│                              检索结果:                               │
│                              - 法律条款引用                          │
│                              - 整改建议                              │
│                                      │                               │
│                                      ▼                               │
│                           合并分析结果 ──► 返回用户                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 七、接口定义

### 7.1 知识库接口

```python
# 加载知识库
PUT /api/v1/knowledge/reload

# 获取知识库状态
GET /api/v1/knowledge/status
Response: {
    "version": "1.0.0",
    "laws_loaded": 4,
    "articles_count": 45,
    "mappings_complete": true
}

# 添加自定义法律文件
POST /api/v1/knowledge/laws
Body: { "file": <multipart> }

# 更新违规映射
PUT /api/v1/knowledge/mapping
Body: { "mappings": {...} }
```

### 7.2 检索接口

```python
# 检索相关法律条款
POST /api/v1/search
Body: {
    "query": "用户位置信息收集",
    "violation_type": "I1",  // 可选
    "top_k": 5
}
Response: {
    "results": [
        {
            "article_id": "PIPL-006",
            "law": "个人信息保护法",
            "article_number": "第六条",
            "content": "...",
            "relevance_score": 0.95,
            "keywords_matched": ["最小必要", "服务无关"]
        }
    ]
}
```

---

## 八、可扩展性设计

### 8.1 换模型支持

```python
# config.py
class Config:
    # 通过配置文件切换模型
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"  # 默认
    # 支持切换:
    # - "text2vec-base-chinese"
    # - "moka-ai/m3e-base"
    
    analyzer_model: str = "EnlightenedAI/TCSI_pp_zh"
    # 支持切换:
    # - "transformers/xxx"
    # - 本地模型路径
```

### 8.2 扩展知识库

```
knowledge/
├── laws/                      # 内置法律 (只读)
│   └── *.json
├── custom_laws/               # 用户自定义法律 (可读写)
│   └── *.json
└── mapping/
    ├── default_mapping.json    # 默认映射
    └── custom_mapping.json     # 用户自定义映射
```

**扩展流程**:
1. 用户在 `knowledge/custom_laws/` 添加新的法律JSON
2. 在 `knowledge/mapping/custom_mapping.json` 添加违规映射
3. 调用 `PUT /api/v1/knowledge/reload` 重新加载

### 8.3 新法律条款支持

在JSON中添加新条款时，添加 `violation_types` 字段即可自动映射：

```json
{
  "article_id": "NEW-001",
  "title": "新条款标题",
  "violation_types": ["I1", "I2", "I9"],  // 自动注册
  ...
}
```

---

## 九、实现优先级

| 阶段 | 任务 | 优先级 |
|------|------|--------|
| **Phase 1** | 创建知识库目录结构和JSON Schema | P0 |
| **Phase 1** | 实现 `LegalKBLoader` 加载器 | P0 |
| **Phase 1** | 重构 `VectorStore` 支持持久化 | P0 |
| **Phase 2** | 生成完整的 `legal_knowledge.json` | P0 |
| **Phase 2** | 实现违规类型映射 `violation_mapping.json` | P0 |
| **Phase 3** | 实现 `Retriever` 检索器 | P1 |
| **Phase 3** | 更新 `app.py` 集成新模块 | P1 |
| **Phase 4** | 添加API接口 (reload/status) | P2 |
| **Phase 4** | 添加用户自定义法律支持 | P2 |

---

## 十、验证清单

- [ ] JSON Schema 验证通过
- [ ] `LegalKBLoader` 正确加载所有法律
- [ ] 12种违规类型 (I1-I12) 全部有法律条款映射
- [ ] 向量库持久化/恢复正常工作
- [ ] RAG检索返回相关法律条款
- [ ] 用户可添加自定义法律文件

---

## 十一、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 法律条款JSON格式错误 | 加载失败 | 添加JSON Schema验证 |
| 违规类型映射遗漏 | 检索结果不完整 | Phase 2完成后人工复核 |
| 向量库版本冲突 | 检索结果不一致 | 持久化时保存版本号 |
| 法律更新 | 知识库过时 | 提供reload接口，支持版本管理 |

---

**下一步**: 请审批本设计文档，批准后我将进入 Phase 1 实现。
