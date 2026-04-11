from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import re
import random
import os

# ==========================================
# 配置开关：是否使用真实模型
# ==========================================
# 当你把模型权重传到 Hugging Face 后，将此改为 True
USE_REAL_MODEL = os.environ.get("USE_REAL_MODEL", "False").lower() == "true"

# ---------------------------------------------------------
# 真实深度学习模型加载 (HuggingFace Transformers)
# ---------------------------------------------------------
if USE_REAL_MODEL:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification, MT5ForConditionalGeneration
    from sentence_transformers import SentenceTransformer
    import faiss # 推荐在 HF Space 使用 FAISS 替代 Milvus，更轻量
    import numpy as np
    import json

    print("正在加载真实模型，这可能需要几分钟...")
    
    # 1. 加载 RoBERTa 风险分类模型 (替换为你自己的模型路径或 HF Repo)
    # tokenizer_roberta = AutoTokenizer.from_pretrained("hfl/chinese-roberta-wwm-ext")
    # model_roberta = AutoModelForSequenceClassification.from_pretrained("./models/roberta-compliance", num_labels=12)
    # model_roberta.eval()

    # 2. 加载 mT5 整改生成模型
    # tokenizer_mt5 = AutoTokenizer.from_pretrained("google/mt5-base")
    # model_mt5 = MT5ForConditionalGeneration.from_pretrained("./models/mt5-compliance")
    # model_mt5.eval()

    # 3. 加载 Sentence-BERT 向量化模型 (用于 RAG 检索)
    # model_sbert = SentenceTransformer('shibing624/text2vec-base-chinese')

    # 4. 加载法律知识库 (FAISS 向量库)
    # 假设你已经提前把法律条文转成了向量并保存为 legal_index.index
    # index_faiss = faiss.read_index("./data/legal_index.index")
    # 假设你有一个 JSON 文件存了对应的法律文本：{ "0": "《个保法》第十条...", "1": "..." }
    # with open("./data/legal_texts.json", "r", encoding="utf-8") as f:
    #     legal_texts = json.load(f)
    
    print("模型加载完成！")

app = FastAPI(
    title="隐私政策合规智能审查平台 API",
    description="基于 RoBERTa/PERT 与 RAG-mT5 架构的隐私政策合规审查后端",
    version="1.0.0"
)

# 配置跨域资源共享 (CORS)
# 解决前端 (Vercel) 调用后端 (Hugging Face) 时的跨域拦截问题
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中建议替换为你的 Vercel 域名，例如 ["https://my-app.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 一、 合规指标体系与权重定义
# ==========================================
INDICATORS = {
    "过度收集敏感数据": {"weight": 0.15, "legal_basis": "《个人信息保护法》第六条'最小必要'原则及第二十九条"},
    "未说明收集目的": {"weight": 0.12, "legal_basis": "《个人信息保护法》第十七条"},
    "未获得明示同意": {"weight": 0.15, "legal_basis": "《个人信息保护法》第十四条"},
    "收集范围超出服务需求": {"weight": 0.10, "legal_basis": "《个人信息保护法》第六条"},
    "未明确第三方共享范围": {"weight": 0.08, "legal_basis": "《个人信息保护法》第二十三条"},
    "未获得单独共享授权": {"weight": 0.12, "legal_basis": "《个人信息保护法》第二十三条"},
    "未明确共享数据用途": {"weight": 0.08, "legal_basis": "《个人信息保护法》第二十三条及GDPR第四十六条"},
    "未明确留存期限": {"weight": 0.05, "legal_basis": "《个人信息保护法》第十九条"},
    "未说明数据销毁机制": {"weight": 0.05, "legal_basis": "《个人信息保护法》第四十七条"},
    "未明确用户权利范围": {"weight": 0.05, "legal_basis": "《个人信息保护法》第四十四至四十八条"},
    "未提供便捷权利行使途径": {"weight": 0.03, "legal_basis": "《个人信息保护法》第五十条"},
    "未明确权利响应时限": {"weight": 0.02, "legal_basis": "《个人信息安全规范》GB/T 35273-2020"}
}

INDICATOR_KEYS = list(INDICATORS.keys())

# ==========================================
# Pydantic 数据模型定义 (Schema)
# ==========================================
class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="完整的隐私政策文本")

class ViolationDetail(BaseModel):
    indicator: str = Field(..., description="违规指示符名称")
    snippet: str = Field(..., description="违规原文片段")
    legal_basis: str = Field(..., description="对应的法律依据")

class AnalyzeResponse(BaseModel):
    total_score: float = Field(..., description="合规总分 (0-100)")
    risk_level: str = Field(..., description="风险等级 (低风险/中等风险/高风险)")
    violations: List[ViolationDetail] = Field(..., description="违规明细列表")

class RectifyRequest(BaseModel):
    original_snippet: str = Field(..., description="违规原文片段")
    violation_type: str = Field(..., description="违规类型 (指示符名称)")

class RectifyResponse(BaseModel):
    suggested_text: str = Field(..., description="mT5 生成的修改建议")
    legal_basis: str = Field(..., description="合规依据解释")

# ==========================================
# 辅助函数
# ==========================================
def split_into_sentences(text: str) -> List[str]:
    """文本预处理：将长文本按标点切分为句子片段"""
    # 简单的按句号、分号、换行符切分
    sentences = re.split(r'[。；\n]+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 5]

def mock_roberta_predict(sentence: str) -> Dict[str, float]:
    """
    模拟或真实调用 RoBERTa/PERT 模型的多标签二分类预测
    """
    if USE_REAL_MODEL:
        # --- 真实模型推理代码 ---
        # inputs = tokenizer_roberta(sentence, return_tensors="pt", truncation=True, max_length=512)
        # with torch.no_grad():
        #     outputs = model_roberta(**inputs)
        #     probs = torch.sigmoid(outputs.logits).squeeze().tolist()
        # return {INDICATOR_KEYS[i]: probs[i] for i in range(12)}
        pass # 替换掉 pass，取消上面注释即可运行

    # --- 模拟代码 ---
    probs = {}
    for key in INDICATOR_KEYS:
        probs[key] = random.uniform(0.6, 0.9) if random.random() < 0.05 else random.uniform(0.0, 0.4)
    return probs

# ==========================================
# API 路由实现
# ==========================================

@app.get("/api/v1/projects", summary="获取历史项目列表")
async def get_projects():
    """
    获取历史审查记录。当前为无状态后端，暂时返回空列表。
    如果需要持久化，可以在此处连接 PostgreSQL/MongoDB 等数据库。
    """
    return []

@app.post("/api/v1/analyze", response_model=AnalyzeResponse, summary="风险审查接口")
async def analyze_policy(request: AnalyzeRequest):
    """
    1. 风险分类与定位：使用 RoBERTa/PERT 模型对文本进行句子级特征提取和二分类判断。
    """
    sentences = split_into_sentences(request.text)
    
    # 记录每个指示符是否被触发 (vi = 1)
    violation_flags = {key: 0 for key in INDICATOR_KEYS}
    violations_list = []

    for sentence in sentences:
        # b. 模型推理
        probs = mock_roberta_predict(sentence)
        
        for indicator, prob in probs.items():
            if prob > 0.5:
                # 标记该维度存在违规 (vi = 1)
                violation_flags[indicator] = 1
                
                # 避免同一个指示符添加过多重复片段，这里简单去重
                if not any(v.indicator == indicator for v in violations_list):
                    violations_list.append(
                        ViolationDetail(
                            indicator=indicator,
                            snippet=sentence,
                            legal_basis=INDICATORS[indicator]["legal_basis"]
                        )
                    )

    # c. 分数计算：S = 100 - Σ (wi * vi) * 100
    penalty = 0.0
    for indicator, vi in violation_flags.items():
        wi = INDICATORS[indicator]["weight"]
        penalty += wi * vi
    
    total_score = 100.0 - (penalty * 100.0)
    total_score = round(max(0.0, total_score), 1) # 确保分数在 0-100 之间

    # 风险等级划分
    if total_score >= 70:
        risk_level = "低风险"
    elif 40 <= total_score < 70:
        risk_level = "中等风险"
    else:
        risk_level = "高风险"

    # 如果是测试短文本没有触发任何违规，强行塞一个进去方便测试
    if len(violations_list) == 0 and len(sentences) > 0:
        mock_ind = "未说明收集目的"
        total_score = round(100.0 - (INDICATORS[mock_ind]["weight"] * 100.0), 1)
        risk_level = "低风险" if total_score >= 70 else "中等风险"
        violations_list.append(
            ViolationDetail(
                indicator=mock_ind,
                snippet=sentences[0],
                legal_basis=INDICATORS[mock_ind]["legal_basis"]
            )
        )

    return AnalyzeResponse(
        total_score=total_score,
        risk_level=risk_level,
        violations=violations_list
    )


@app.post("/api/v1/rectify", response_model=RectifyResponse, summary="智能整改接口")
async def rectify_snippet(request: RectifyRequest):
    """
    2. 智能整改生成 (RAG)：针对违规片段，调用向量数据库检索并使用 mT5-base 生成定向改写。
    """
    
    if USE_REAL_MODEL:
        # --- 真实 RAG 检索与生成代码 ---
        # a. 检索 (Retrieve)
        # query_vector = model_sbert.encode([request.original_snippet])
        # D, I = index_faiss.search(query_vector, k=3) # 检索最相似的 3 个案例
        # retrieved_cases = [legal_texts[str(idx)] for idx in I[0]]
        # retrieved_context = " ".join(retrieved_cases)
        
        # b. 生成 (Generate)
        # prompt = f"请根据以下合规规范，修改违规条款：\n规范：{retrieved_context}\n原条款：{request.original_snippet}\n修改后："
        # inputs = tokenizer_mt5(prompt, return_tensors="pt", truncation=True, max_length=512)
        # with torch.no_grad():
        #     outputs = model_mt5.generate(**inputs, max_length=128)
        # suggested_text = tokenizer_mt5.decode(outputs[0], skip_special_tokens=True)
        # legal_basis = INDICATORS.get(request.violation_type, {}).get("legal_basis", "《个人信息保护法》相关规定")
        # return RectifyResponse(suggested_text=suggested_text, legal_basis=legal_basis)
        pass # 替换掉 pass，取消上面注释即可运行

    # --- 模拟代码 ---
    suggested_text = f"【系统建议】为了符合合规要求，建议将原表述修改为：在您使用本服务时，我们将出于提供核心业务功能的目的，在获得您单独同意后，收集必要的个人信息。"
    legal_basis = INDICATORS.get(request.violation_type, {}).get("legal_basis", "《个人信息保护法》相关规定")

    return RectifyResponse(
        suggested_text=suggested_text,
        legal_basis=legal_basis
    )

if __name__ == "__main__":
    import uvicorn
    # 运行命令: python app.py 或 uvicorn app:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
