// api/search.js - Serverless function for Vercel
// Handles: /search?q=xxx (DuckDuckGo API)
//          /fetch?url=xxx (Proxy for any URL)
//          /redirect?u=xxx (Alias for /fetch)

export default async function handler(req, res) {
  // إعدادات CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // ========== /search endpoint ==========
  if (pathname === '/search') {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`DuckDuckGo API returned ${response.status}`);

      const data = await response.json();

      function fixUrl(url) {
        if (!url) return url;
        
        if (url.startsWith('/c/') || (url.startsWith('/') && !url.startsWith('http'))) {
          let term = url;
          if (url.startsWith('/c/')) term = url.substring(3);
          else if (url.startsWith('/')) term = url.substring(1);
          
          term = decodeURIComponent(term).replace(/[^a-zA-Z0-9_\-\s]/g, '');
          return `/fetch?url=https://duckduckgo.com/?q=${encodeURIComponent(term)}`;
        }
        
        if (url.startsWith('http')) {
          return `/fetch?url=${encodeURIComponent(url)}`;
        }
        
        return url;
      }

      if (Array.isArray(data.RelatedTopics)) {
        const fixTopic = t => {
          if (t.FirstURL) t.FirstURL = fixUrl(t.FirstURL);
          if (t.Topics) t.Topics = t.Topics.map(fixTopic);
          return t;
        };
        data.RelatedTopics = data.RelatedTopics.map(fixTopic);
      }
      
      if (Array.isArray(data.Results)) {
        data.Results = data.Results.map(r => {
          if (r.FirstURL) r.FirstURL = fixUrl(r.FirstURL);
          return r;
        });
      }

      if (data.AbstractURL) data.AbstractURL = fixUrl(data.AbstractURL);

      const enhancedData = {
        ...data,
        timestamp: Date.now(),
        source: 'DuckDuckGo Instant Answer',
        AbstractText: data.AbstractText ? data.AbstractText.replace(/<[^>]*>/g, '') : null,
      };
      
      return res.status(200).json(enhancedData);
      
    } catch (err) {
      console.error('Search error:', err?.message || err);
      const msg = err.name === 'AbortError' ? 'Request timed out' : err.message;
      return res.status(500).json({ error: 'Failed to fetch from search API', message: msg, query: q });
    }
  }
  
  // ========== /fetch endpoint ==========
  if (pathname === '/fetch') {
    let { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      let decoded = decodeURIComponent(url);
      
      // معالجة الروابط المكررة
      while (decoded.startsWith('/fetch?url=')) {
        const match = decoded.match(/[?&]url=([^&]+)/);
        if (match) {
          decoded = decodeURIComponent(match[1]);
        } else {
          break;
        }
      }
      
      // التأكد من وجود بروتوكول
      if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
        decoded = 'https://' + decoded;
      }
      
      let target;
      try {
        target = new URL(decoded);
      } catch (e) {
        return res.status(400).send('Invalid URL format');
      }

      if (!['http:', 'https:'].includes(target.protocol)) {
        return res.status(400).send('Only http/https protocols are allowed');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(target.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).send(`Upstream error: ${response.status}`);
      }

      let html = await response.text();
      
      // إزالة السكربتات الضارة
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // إضافة base tag للروابط النسبية
      html = html.replace('<head>', `<head><base href="${target.origin}/">`);
      
      // إزالة سياسات CSP التي تمنع العرض في iframe
      html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*X-Frame-Options[^>]*>/gi, '');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
      return res.send(html);
      
    } catch (err) {
      console.error('Fetch error:', err.message);
      return res.status(500).send(`Failed to fetch: ${err.message}`);
    }
  }
  
  // ========== /redirect endpoint (alias for /fetch) ==========
  if (pathname === '/redirect') {
    const { u } = req.query;
    if (!u) {
      return res.status(400).send('Missing u parameter');
    }
    req.query.url = u;
    return handler(req, res);
  }
  
  // ========== Unknown endpoint ==========
  return res.status(404).json({ error: 'Not found' });
}