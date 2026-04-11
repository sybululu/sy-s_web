import { Project } from './types';

export const MOCK_PROJECTS: Project[] = [
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
  },
  {
    id: 'p2',
    name: '某电商平台支付合规审计',
    date: '2023-11-15',
    description: '支付插件权限调用审计。符合央行个人金融信息保护要求，仅存在极小文字表述优化项。',
    score: 94.8,
    riskStatus: '低风险',
    clauses: []
  },
  {
    id: 'p3',
    name: '在线教育平台隐私协议补录',
    date: '2023-11-10',
    description: '主要集中在用户注销账号后的数据保存时限问题，建议缩短至 180 天以内。',
    score: 72.5,
    riskStatus: '中度风险',
    clauses: [
      {
        id: 'CL-6032',
        location: '附录A / 第三方列表',
        category: '共享第三方清单不全',
        snippet: '...将分享给必要的第三方，不限于广告主...',
        riskLevel: 'medium',
        reason: '共享第三方清单不全',
        originalText: '我们将分享给必要的第三方，不限于广告主、分析服务商等。',
        suggestedText: '我们将仅在合法、正当、必要的前提下，与《第三方信息共享清单》中列明的合作伙伴共享您的信息。',
        diffOriginalHtml: '我们将<span class="diff-remove">分享给必要的第三方，不限于广告主、分析服务商等</span>。',
        diffSuggestedHtml: '我们将<span class="diff-add">仅在合法、正当、必要的前提下，与《第三方信息共享清单》中列明的合作伙伴共享您的信息</span>。',
        legalBasis: '根据《信息安全技术 个人信息安全规范》，应向个人信息主体告知共享、转让个人信息的目的、数据接收方的类型等。'
      }
    ]
  }
];
