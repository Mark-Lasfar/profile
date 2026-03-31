// api/search.js - Minimal stable version
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log للـ debugging
  console.log('Request URL:', req.url);
  console.log('Query params:', req.query);

  const urlPath = req.url.split('?')[0];

  // ========== /search endpoint ==========
  if (urlPath === '/search') {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      // استدعاء DuckDuckGo API
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'MGzonBrowser/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API returned ${response.status}`);
      }

      const data = await response.json();

      // إرجاع النتائج بشكل مبسط
      return res.status(200).json({
        success: true,
        query: q,
        abstract: data.AbstractText || null,
        abstractUrl: data.AbstractURL || null,
        topics: data.RelatedTopics?.slice(0, 10).map(t => ({
          text: t.Text,
          url: t.FirstURL ? `/fetch?url=${encodeURIComponent(t.FirstURL)}` : null
        })) || [],
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Search failed',
        message: error.message,
        query: q
      });
    }
  }

  // ========== /fetch endpoint ==========
  if (urlPath === '/fetch') {
    let { url } = req.query;
    
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      let targetUrl = decodeURIComponent(url);
      
      // تأكد من وجود بروتوكول
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // تحقق من صحة الرابط
      try {
        new URL(targetUrl);
      } catch (e) {
        return res.status(400).send('Invalid URL format');
      }

      console.log('Fetching:', targetUrl);

      // مهلة 10 ثواني
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).send(`Cannot load page: ${response.status}`);
      }

      let html = await response.text();
      
      // تنظيف بسيط
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      return res.send(html);
      
    } catch (err) {
      console.error('Fetch error:', err.message);
      if (err.name === 'AbortError') {
        return res.status(504).send('Request timeout - The website took too long to respond');
      }
      return res.status(500).send(`Failed to load page: ${err.message}`);
    }
  }

  // ========== Unknown endpoint ==========
  return res.status(404).json({ error: 'Endpoint not found' });
}