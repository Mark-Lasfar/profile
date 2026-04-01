// api/search.js - Using axios for better reliability
import axios from 'axios';

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

  const urlPath = req.url.split('?')[0];

  // ========== /search endpoint ==========
  if (urlPath === '/search') {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`;
      
      const response = await axios.get(apiUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'MGzonBrowser/1.0',
          'Accept': 'application/json'
        }
      });

      const data = response.data;

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
        success: true,
        query: q,
        AbstractText: data.AbstractText ? data.AbstractText.replace(/<[^>]*>/g, '') : null,
        AbstractURL: data.AbstractURL ? fixUrl(data.AbstractURL) : null,
        RelatedTopics: data.RelatedTopics || [],
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Search error:', error.message);
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
      
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        new URL(targetUrl);
      } catch (e) {
        return res.status(400).send('Invalid URL format');
      }

      console.log('Fetching:', targetUrl);

      const response = await axios.get(targetUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        responseType: 'text'
      });

      let html = response.data;
      
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      return res.send(html);
      
    } catch (error) {
      console.error('Fetch error:', error.message);
      if (error.code === 'ECONNABORTED') {
        return res.status(504).send('Request timeout - The website took too long to respond');
      }
      return res.status(500).send(`Failed to load page: ${error.message}`);
    }
  }

  // ========== /redirect endpoint ==========
  if (urlPath === '/redirect') {
    const { u } = req.query;
    if (!u) return res.status(400).send('Missing u parameter');
    req.query.url = u;
    return handler(req, res);
  }

  // ========== Unknown endpoint ==========
  return res.status(404).json({ error: 'Endpoint not found' });
}