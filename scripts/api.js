const BASE = '/api/weather';
const FORECAST_BASE = '/api/forecast';
export const RATE_LIMIT_MSG = 'Rate limit exceeded. Too many requests—please try again later.';

async function handleApiResponse(res) {
    if (!res.ok) {
        if (res.status === 404) throw new Error('City not found');
        if (res.status === 429) throw new Error(RATE_LIMIT_MSG);
        throw new Error(`Server error: ${res.status}`);
    }
    return res.json();
}

export async function fetchWeatherByCity(city) {
    const res = await fetch(`${BASE}?q=${encodeURIComponent(city)}`);
    return handleApiResponse(res);
}

export async function fetchWeatherByCoords(lat, lon) {
    const res = await fetch(`${BASE}?lat=${lat}&lon=${lon}`);
    return handleApiResponse(res);
}

export async function fetchForecastByCoords(lat, lon) {
    const res = await fetch(`${FORECAST_BASE}?lat=${lat}&lon=${lon}`);
    return handleApiResponse(res);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(fetchFn, retries = 2, backoffMs = 500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fetchFn();
        } catch (err) {
            if (
                err.message === 'City not found' ||
                err.message === RATE_LIMIT_MSG ||
                err.message.includes('401')
            ) {
                throw err;
            }
            if (attempt === retries) throw err;

            console.warn(`Attempt ${attempt} failed. Retrying in ${backoffMs * attempt}ms...`);
            await delay(backoffMs * attempt);
        }
    }
}