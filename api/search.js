// api/search.js - Stable version for Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const urlPath = req.url.split('?')[0];

  // ========== /search endpoint ==========
  if (urlPath === '/search') {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'MGzonBrowser/1.0' }
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API returned ${response.status}`);
      }

      const data = await response.json();

      // تحويل الروابط البسيطة
      function fixUrl(url) {
        if (!url) return url;
        if (url.startsWith('http')) {
          return `/fetch?url=${encodeURIComponent(url)}`;
        }
        return url;
      }

      if (Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics = data.RelatedTopics.map(topic => {
          if (topic.FirstURL) topic.FirstURL = fixUrl(topic.FirstURL);
          if (topic.Topics) {
            topic.Topics = topic.Topics.map(sub => {
              if (sub.FirstURL) sub.FirstURL = fixUrl(sub.FirstURL);
              return sub;
            });
          }
          return topic;
        });
      }

      return res.status(200).json({
        ...data,
        timestamp: Date.now(),
        AbstractText: data.AbstractText ? data.AbstractText.replace(/<[^>]*>/g, '') : null,
      });
    } catch (err) {
      console.error('Search error:', err.message);
      return res.status(500).json({ 
        error: 'Search failed', 
        message: err.message,
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

      console.log(`Fetching: ${targetUrl}`);

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

  // ========== /redirect endpoint (alias for /fetch) ==========
  if (urlPath === '/redirect') {
    const { u } = req.query;
    if (!u) return res.status(400).send('Missing u parameter');
    req.query.url = u;
    return handler(req, res);
  }

  // ========== Unknown endpoint ==========
  return res.status(404).json({ error: 'Endpoint not found' });
}