// netlify/functions/weather.js
const OW_BASE = 'https://api.openweathermap.org/data/2.5';

let requestTimestamps = [];
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // Allows 15 searches per minute (2 calls per search)

export async function handler(event) {
    // 1. Sliding-window rate limiter (returns 429 if exceeded)
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < WINDOW_MS);

    if (requestTimestamps.length >= MAX_REQUESTS) {
        return {
            statusCode: 429,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Too many requests. Please try again later.' })
        };
    }

    requestTimestamps.push(now);

    // 2. Verify API key from Netlify Environment Variables
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Server missing OPENWEATHER_API_KEY' })
        };
    }

    // 3. Forward query params (q, lat, lon) and enforce metric + secret API key
    const params = event.queryStringParameters || {};
    const endpoint = params.type === 'forecast' ? 'forecast' : 'weather';
    const forwardUrl = new URL(`${OW_BASE}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
        if (key !== 'appid' && key !== 'type') {
            forwardUrl.searchParams.set(key, value);
        }
    });
    forwardUrl.searchParams.set('units', 'metric');
    forwardUrl.searchParams.set('appid', API_KEY);

    try {
        const owRes = await fetch(forwardUrl);
        const data = await owRes.text();
        return {
            statusCode: owRes.status,
            headers: { 'Content-Type': 'application/json' },
            body: data
        };
    } catch (err) {
        return {
            statusCode: 502,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Failed to reach OpenWeatherMap' })
        };
    }
}