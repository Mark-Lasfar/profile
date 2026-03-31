# 🌐 MGzon Browser CV – Mark Al-Asfar

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)

> **An interactive CV with a fully functional embedded browser and smart search engine**  
> Built by Mark Al-Asfar – Senior Full-Stack Developer & Systems Architect

---

## ✨ Live Demo

🔗 **[View Live CV](https://elasfar.vercel.app)** – Deployed on Vercel

---

## 📖 Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
  - [Smart Search Engine](#smart-search-engine)
  - [Embedded Browser](#embedded-browser)
  - [Proxy System](#proxy-system)
- [Technical Architecture](#technical-architecture)
- [Installation & Setup](#installation--setup)
- [Deployment](#deployment)
- [File Structure](#file-structure)
- [Built With](#built-with)
- [License](#license)

---

## 🚀 About The Project

This is not just a CV – it's a **fully functional web browser embedded inside a professional portfolio**. Visitors can:

- Browse any website directly from the CV
- Search the web using DuckDuckGo (via a smart proxy)
- View your professional experience, skills, and projects
- Download a clean PDF version of the CV

The project solves the **CORS and iframe blocking issues** that normally prevent websites from being embedded, using a custom proxy server.

---

## 🔥 Key Features

### 📄 Professional CV
- Complete developer portfolio with skills, projects, and experience
- Responsive design works on desktop and mobile
- One-click PDF download (without browser widget)

### 🔍 Smart Search Engine
- Powered by **DuckDuckGo Instant Answer API**
- Returns instant summaries and related topics
- Falls back to full DuckDuckGo search when no API results are found
- All search results displayed **inside the browser**, not in new tabs

### 🌐 Embedded Full Browser
- Multi-tab support (open multiple pages)
- Address bar with navigation controls (Back, Forward, Refresh)
- Opens external URLs via a **proxy** to bypass CORS restrictions
- Quick links: GitHub, LinkedIn, MGzon Platform, npm CLI

### 🛡️ Proxy System
- Server-side proxy fetches any URL and removes restrictive headers
- Solves the "refused to connect" error for most websites
- Removes scripts and adds base tags for relative links
- Whitelist support for enhanced security (optional)

---

## ⚙️ How It Works

### Smart Search Engine Flow

```
User enters query
       ↓
1. DuckDuckGo Instant Answer API
       ↓
   Has results? ──Yes──→ Display instant summary + related topics
       ↓ No
2. Fallback to DuckDuckGo.com via proxy
       ↓
   Display full search results page inside iframe
```

### Embedded Browser Flow

```
User enters URL or clicks a link
       ↓
Is it a search query? ──Yes──→ Run search engine
       ↓ No
Is it a URL?
       ↓
Convert to proxy URL: /fetch?url=https://example.com
       ↓
Proxy fetches content, removes restrictions
       ↓
Display in iframe inside the current tab
```

### Proxy Server (How It Bypasses Restrictions)

1. Receives request: `/fetch?url=https://example.com`
2. Fetches the actual page from `example.com`
3. Removes `<script>` tags (prevents XSS)
4. Removes CSP and X-Frame-Options headers
5. Adds `<base href="https://example.com/">` to fix relative links
6. Returns clean HTML that can be displayed in an iframe

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │              index.html (CV + Browser)            │  │
│  │  ┌─────────────┐  ┌─────────────────────────────┐ │  │
│  │  │   CV Info   │  │      Embedded Browser       │ │  │
│  │  │  (Static)   │  │  ┌───────────────────────┐  │ │  │
│  │  └─────────────┘  │  │     iframe           │  │ │  │
│  │                   │  │   (renders content)   │  │ │  │
│  │                   │  └───────────────────────┘  │ │  │
│  │                   └─────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         │ fetch()                       │
│                         ▼                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Express Proxy Server                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   /search    │  │   /fetch     │  │   /redirect  │  │
│  │ DuckDuckGo   │  │  Fetch any   │  │   Alias for  │  │
│  │    API       │  │     URL      │  │    /fetch    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    External Services                     │
│  ┌─────────────────┐        ┌─────────────────────────┐ │
│  │ DuckDuckGo API  │        │   Any Website (GitHub,  │ │
│  │ (Instant Answer)│        │   LinkedIn, Wikipedia)  │ │
│  └─────────────────┘        └─────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/Mark-Lasfar/mgzon-cv.git
cd mgzon-cv

# Install dependencies
npm install

# Start the proxy server
node proxy.js

# Open browser at http://localhost:3000
```

### Running with Nodemon (auto-restart on changes)
```bash
npm run dev
```

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Environment Variables (if using Google CSE)
Create `.env` file:
```
GOOGLE_API_KEY=your_api_key
GOOGLE_CX_ID=your_cx_id
```

---



## 🛠️ Built With

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **PDF Generation**: [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
- **Backend**: Node.js, Express.js
- **Proxy**: Fetch API with custom headers
- **Search API**: DuckDuckGo Instant Answer API
- **Deployment**: Vercel (serverless functions)

---

## 📚 How to Use the Browser

### Searching
1. Type any keyword in the address bar (e.g., `node.js tutorials`)
2. Press Enter or click the arrow button
3. Results appear inside the current tab:
   - Instant summary (if available)
   - Related topics with links
   - Fallback to DuckDuckGo search page

### Browsing Websites
1. Type a URL in the address bar (e.g., `github.com`)
2. Press Enter – the site opens inside the browser
3. Use **Back**, **Forward**, and **Refresh** buttons
4. Open multiple tabs with the **+** button

### Quick Links
- **GitHub** – View my repositories
- **LinkedIn** – Connect with me
- **MGzon Platform** – Explore my ERP project
- **npm CLI** – Install the MGzon CLI tool

---

## 🔧 Troubleshooting

### "Failed to fetch" error
- Check if the proxy server is running (`node proxy.js`)
- Ensure the URL is valid and accessible
- Some sites (like Facebook, YouTube) may still block iframes despite the proxy

### Blank page / Black screen
- Wait a few seconds – some sites load slowly
- Try refreshing the tab
- Check browser console for errors (F12)

### Search returns "No results found"
- The DuckDuckGo API may not have instant answers for your query
- Click "Search on DuckDuckGo" to see full results

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Mark Al-Asfar** (aka Ibrahim Alasfar)

- GitHub: [@Mark-Lasfar](https://github.com/Mark-Lasfar)
- LinkedIn: [in/mark-alasfar](https://linkedin.com/in/mark-alasfar)
- Email: marklasfar@gmail.com
- Project: [MGzon ERP](https://mgzon.com)

---

## 🙏 Acknowledgments

- DuckDuckGo for their Instant Answer API
- Lucide for the beautiful icons
- Vercel for seamless deployment
- All open source contributors

---

*Built with ❤️ by a terminal-first developer who loves Linux and clean architecture.*
