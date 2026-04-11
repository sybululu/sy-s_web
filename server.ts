import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// In-memory database for projects
const projects: any[] = [
  {
    id: 'p1',
    name: '某某金融App隐私政策审查',
    date: '2023-11-20',
    description: '针对 V3.2.1 版本的全量审查。发现涉及跨境传输及超范围收集敏感权限问题，合规风险较大。',
    score: 45.2,
    riskStatus: '极高风险',
    clauses: [
      {
        id: 'CL-8021',
        location: '第4.2节 / 第3段',
        category: '数据跨境传输不透明',
        snippet: '...可能会将您的数据传输至境外合作伙伴...',
        riskLevel: 'high',
        reason: '数据跨境传输不透明',
        originalText: '为了向您提供全球范围内的优质服务，我们可能会将您的个人信息传输至位于境外的合作伙伴处进行处理。这些合作伙伴将遵守当地法律进行数据保护。',
        suggestedText: '为了向您提供全球范围内的优质服务，我们将在获得您的明确单独同意后，将您的个人信息传输至位于新加坡及美国的合作伙伴处进行处理。这些合作伙伴将签署《数据保护协议 (DPA)》并遵守当地法律进行数据保护。',
        diffOriginalHtml: '为了向您提供全球范围内的优质服务，我们<span class="diff-remove">可能会将</span>您的个人信息传输至位于<span class="diff-remove">境外</span>的合作伙伴处进行处理。这些合作伙伴将遵守当地法律进行数据保护。',
        diffSuggestedHtml: '为了向您提供全球范围内的优质服务，我们<span class="diff-add">将在获得您的明确单独同意后，</span>将您的个人信息传输至位于<span class="diff-add">新加坡及美国</span>的合作伙伴处进行处理。这些合作伙伴将<span class="diff-add">签署《数据保护协议 (DPA)》并</span>遵守当地法律进行数据保护。',
        legalBasis: '根据 《个人信息保护法》第三十八条：个人信息处理者向境外提供个人信息的，应当告知个人境外接收方的名称、联系方式、处理目的、处理方式、个人信息的种类以及个人向境外接收方行使本法规定权利的方式和程序，并取得个人的单独同意。'
      },
      {
        id: 'CL-7104',
        location: '第6.1节 / 第1段',
        category: '撤回同意机制缺失',
        snippet: '...用户一旦开启则无法关闭定位功能...',
        riskLevel: 'high',
        reason: '撤回同意机制缺失',
        originalText: '为了确保服务的连续性，用户一旦开启则无法关闭定位功能，除非卸载本应用。',
        suggestedText: '为了确保服务的连续性，用户可以随时在“设置-隐私管理”中关闭定位功能。关闭后，我们将停止收集您的位置信息，但这可能会影响部分基于位置的功能体验。',
        diffOriginalHtml: '为了确保服务的连续性，用户<span class="diff-remove">一旦开启则无法关闭定位功能，除非卸载本应用</span>。',
        diffSuggestedHtml: '为了确保服务的连续性，用户<span class="diff-add">可以随时在“设置-隐私管理”中关闭定位功能。关闭后，我们将停止收集您的位置信息，但这可能会影响部分基于位置的功能体验</span>。',
        legalBasis: '根据《个人信息保护法》第十五条：基于个人同意处理个人信息的，个人有权撤回其同意。个人信息处理者应当提供便捷的撤回同意的方式。'
      }
    ]
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 配置跨域 (CORS)，允许 Netlify 等外部前端调用此后端
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // 处理 AI Studio 平台的内部日志拉取请求，防止控制台一直报 404
  app.get('/', (req, res, next) => {
    if (req.query.logs === 'container') {
      res.status(200).send('ok');
      return;
    }
    next();
  });

  // API Routes
  
  // 1. 获取历史项目列表
  app.get('/api/v1/projects', (req, res) => {
    res.json(projects);
  });

  // 2. 真实调用大模型进行审查
  app.post('/api/v1/analyze', async (req, res) => {
    const { text } = req.body;
    const value = text || '';
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `你是一个专业的隐私政策合规审查引擎。请分析以下文本内容，找出其中违反《个人信息保护法》(PIPL) 的条款。
      文本内容：${value.substring(0, 5000)}

      请返回一个 JSON 数组，包含 1 到 3 个违规条款对象。如果没有明显违规，也请构造1个潜在的改进建议。
      每个对象必须严格遵循以下 JSON 格式：
      [{
        "id": "CL-随机4位数字",
        "location": "例如：第X节 / 第Y段",
        "category": "违规类别，例如：过度收集敏感数据、未说明收集目的、撤回同意机制缺失等",
        "snippet": "违规文本的简短摘录...",
        "riskLevel": "high" 或 "medium" 或 "low",
        "reason": "违规的具体原因",
        "originalText": "完整的原始违规句子",
        "suggestedText": "修改后的合规句子",
        "diffOriginalHtml": "带有 <span class=\\"diff-remove\\">删除内容</span> 的原始HTML片段",
        "diffSuggestedHtml": "带有 <span class=\\"diff-add\\">新增内容</span> 的修改后HTML片段",
        "legalBasis": "相关的法律依据，例如《个人信息保护法》第X条..."
      }]
      只返回 JSON 数组，不要包含任何 markdown 标记（如 \`\`\`json）或其他解释性文本。`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const jsonString = response.text;
      const mockClauses = JSON.parse(jsonString || '[]');

      const score = Math.max(40, 100 - (mockClauses.length * 15));
      let riskStatus = '中度风险';
      if (score < 60) riskStatus = '极高风险';
      if (score >= 80) riskStatus = '低风险';

      const newProject = {
        id: generateId(),
        name: `文本分析: ${value.substring(0, 20)}...`,
        date: new Date().toISOString().split('T')[0],
        description: `基于大语言模型风险识别与整改建议生成的自动化审查报告。共发现 ${mockClauses.length} 项潜在风险。`,
        score,
        riskStatus,
        clauses: mockClauses
      };

      projects.unshift(newProject);
      res.json(newProject);
    } catch (error) {
      console.error('AI Analysis Error:', error);
      res.status(500).json({ error: 'Analysis failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
