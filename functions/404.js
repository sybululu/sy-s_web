// Cloudflare Pages SPA Fallback Handler
// 处理所有非静态资源的请求，返回index.html

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 跳过API请求和静态资源
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.match(/\.[^/]+$/)  // 任何带扩展名的文件
    ) {
      return fetch(request);
    }

    // 获取index.html
    const indexUrl = new URL('/index.html', url.origin);
    const indexResponse = await fetch(indexUrl);
    
    return new Response(indexResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  },
};
