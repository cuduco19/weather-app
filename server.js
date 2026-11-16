// server.js - Minimal Node.js Weather Proxy & Static Server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const OW_BASE = 'https://api.openweathermap.org/data/2.5';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

let requestTimestamps = [];
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // Allows 15 searches per minute (2 calls per search)

const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    // 1. Handle API Proxy Routes (/api/weather or /api/forecast)
    if (reqUrl.pathname === '/api/weather' || reqUrl.pathname === '/api/forecast') {
        // Rate limit check (returns 429 if exceeded)
        const now = Date.now();
        requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
        
        if (requestTimestamps.length >= MAX_REQUESTS) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Too many requests. Please try again later.' }));
        }
        
        requestTimestamps.push(now);

        if (!API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Server missing OPENWEATHER_API_KEY' }));
        }

        const endpoint = reqUrl.pathname === '/api/forecast' ? 'forecast' : 'weather';
        const forwardUrl = new URL(`${OW_BASE}/${endpoint}`);

        // Forward query params (q, lat, lon) and enforce metric + secret API key
        reqUrl.searchParams.forEach((value, key) => {
            if (key !== 'appid') forwardUrl.searchParams.set(key, value);
        });
        forwardUrl.searchParams.set('units', 'metric');
        forwardUrl.searchParams.set('appid', API_KEY);

        try {
            const owRes = await fetch(forwardUrl);
            const data = await owRes.text();
            res.writeHead(owRes.status, { 'Content-Type': 'application/json' });
            return res.end(data);
        } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Failed to reach OpenWeatherMap' }));
        }
    }

    // 2. Serve Static Frontend Files (index.html, styles.css, app.js)
    // Block access to secret files just in case
    if (reqUrl.pathname.includes('config.js') || reqUrl.pathname.includes('.env')) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    const filePath = path.join(__dirname, reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname);
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Not Found');
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Weather server running at http://localhost:${PORT}`);
});