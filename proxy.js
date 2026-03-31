import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './api/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// خدمة الملفات الثابتة
app.use(express.static(__dirname));

// ========== ENDPOINT /search ==========
app.get('/search', (req, res) => handler(req, res));

// ========== ENDPOINT /fetch - Proxy محسن ==========
app.get('/fetch', async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

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

    console.log(`🌐 [FETCH] ${target.toString()}`);

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
    
    // 🔥 إزالة السكربتات الضارة فقط
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 🔥 إضافة base tag للروابط النسبية
    html = html.replace('<head>', `<head><base href="${target.origin}/">`);
    
    // 🔥 إزالة سياسة CSP التي تمنع العرض في iframe
    html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '');
    html = html.replace(/<meta[^>]*X-Frame-Options[^>]*>/gi, '');
    
    // 🔥 إضافة إعدادات للسماح بالعرض في iframe
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.send(html);
    
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
    res.status(500).send(`Failed to fetch: ${err.message}`);
  }
});
// ========== ENDPOINT /redirect - يحول إلى /fetch ==========
app.get('/redirect', async (req, res) => {
  const { u } = req.query;
  if (!u) {
    return res.status(400).send('Missing u parameter');
  }
  // حول الطلب لـ /fetch
  req.query.url = u;
  return app.handle(req, res, '/fetch');
});

// ========== الصفحة الرئيسية ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   - /search?q=...  (DuckDuckGo API)`);
  console.log(`   - /fetch?url=... (Proxy for any URL)`);
  console.log(`   - /redirect?u=... (Alias for /fetch)`);
});