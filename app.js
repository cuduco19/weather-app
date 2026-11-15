// app.js - Weather App
//const API_KEY = 'YOUR_API_KEY';// <-- Replace with your API key
const BASE = '/api/weather';
const FORECAST_BASE = '/api/forecast';

// 1. DOM Hooks
const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const loader = document.getElementById('loader');
const errorEl = document.getElementById('error');
const weatherSection = document.getElementById('weather');
const forecastSection = document.getElementById('forecast');
const forecastGrid = document.getElementById('forecast-grid');

const wCity = document.getElementById('w-city');
const wTemp = document.getElementById('w-temp');
const wDesc = document.getElementById('w-desc');
const wHumidity = document.getElementById('w-humidity');
const wWind = document.getElementById('w-wind');
const wIcon = document.getElementById('w-icon');
const unitToggleBtn = document.getElementById('unit-toggle');
const historyContainer = document.getElementById('search-history');

const geoBtn = document.getElementById('geo-btn');

// 2. App State
let currentTempC = null;
let isCelsius = true;
let currentForecastList = [];
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];


// 3. UI State Helpers
function showLoading(show = true, message = 'Loading...') {
    loader.textContent = message;
    loader.classList.toggle('hidden', !show);
    if (show) {
        weatherSection.classList.add('hidden');
        forecastSection.classList.add('hidden');
        errorEl.classList.add('hidden');
    }
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    weatherSection.classList.add('hidden');
    forecastSection.classList.add('hidden');
}


// 4. API Fetch & Retry Logic
async function fetchWeatherByCity(city) {
    const url = `${BASE}?q=${encodeURIComponent(city)}`;

    // Basic fetch; check response.ok
    const res = await fetch(url);

    if(!res.ok){
        if(res.status === 404)
            throw new Error('City not found');
        throw new Error(`Server error:${res.status}`);
    }

    return res.json();
}

async function fetchWeatherByCoords(lat, lon) {
    const url = `${BASE}?lat=${lat}&lon=${lon}`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
    }

    return res.json();
}

async function fetchForecastByCoords(lat, lon) {
    const url = `${FORECAST_BASE}?lat=${lat}&lon=${lon}`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
    }

    return res.json();
}


// Helper to pause execution for a given number of milliseconds
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generic retry wrapper so it works for both current weather and 5-day forecast
async function fetchWithRetry(fetchFn, retries = 2, backoffMs = 500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fetchFn();
        } catch (err) {
            // Do NOT retry if the city doesn't exist (404) or API key is invalid (401)
            if (err.message === 'City not found' || err.message.includes('401')) {
                throw err;
            }

            // If we've used all attempts, throw the error to the UI
            if (attempt === retries) {
                throw err;
            }

            console.warn(`Attempt ${attempt} failed. Retrying in ${backoffMs * attempt}ms...`);
            await delay(backoffMs * attempt); // Short backoff: 500ms, then 1000ms
        }
    }
}

// 5. Render Functions
function updateTempDisplay() {
    if (currentTempC === null) return;

    if (isCelsius) {
        wTemp.textContent = `${currentTempC.toFixed(1)}°C`;
        unitToggleBtn.textContent = '°F';
    } else {
        const tempF = (currentTempC * 9) / 5 + 32;
        wTemp.textContent = `${tempF.toFixed(1)}°F`;
        unitToggleBtn.textContent = '°C';
    }
}

function renderWeather(data) {
    // OpenWeather returns weather[0].description, main.temp, main.humidity, wind.speed
    const cityLabel = data.sys?.country ? `${data.name}, ${data.sys.country}` : data.name;
    wCity.textContent = cityLabel;
    cityInput.value = cityLabel;  // Automatically shows the detected city in the search box!
    currentTempC = data.main.temp;
    updateTempDisplay();
    wDesc.textContent = data.weather?.[0]?.description || '';
    wHumidity.textContent = `Humidity: ${data.main.humidity}%`;
    wWind.textContent = `Wind: ${data.wind.speed} m/s`;

    // Weather Icon
    const iconCode = data.weather?.[0]?.icon;
    if (iconCode) {
        wIcon.src = `https://openweathermap.org/payload/api/media/file/${iconCode}.png`;
        wIcon.alt = data.weather?.[0]?.description || 'Weather icon';
        wIcon.classList.remove('hidden');
    } else {
        wIcon.classList.add('hidden');
    }

    weatherSection.classList.remove('hidden');
}

function extractDailyForecasts(list) {
    const daily = list.filter((item) => item.dt_txt.includes('12:00:00'));
    return daily.length >= 5 ? daily.slice(0, 5) : list.filter((_, idx) => idx % 8 === 0).slice(0, 5);
}

function renderForecast() {
    if (!currentForecastList.length) return;

    forecastGrid.innerHTML = '';

    currentForecastList.forEach((dayData) => {
        const date = new Date(dayData.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const tempC = dayData.main.temp;
        const displayTemp = isCelsius
            ? `${Math.round(tempC)}°C`
            : `${Math.round((tempC * 9) / 5 + 32)}°F`;

        const iconCode = dayData.weather?.[0]?.icon;
        const desc = dayData.weather?.[0]?.description || '';

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <span class="forecast-day">${dayName}</span>
            ${iconCode ? `<img src="https://openweathermap.org/payload/api/media/file/${iconCode}.png" alt="${desc}" />` : ''}
            <span class="forecast-temp">${displayTemp}</span>
        `;

        forecastGrid.appendChild(card);
    });

    forecastSection.classList.remove('hidden');
}


// 6. Search History Helpers
function saveSearchHistory(data) {

     // Combine city and country code (e.g., "San Cristóbal, DO")
    const country = data.sys?.country;
    const label = country ? `${data.name}, ${country}` : data.name;
    const { lat, lon } = data.coord;
    
    // Remove duplicates by matching either the same label OR exact same coordinates
    searchHistory = searchHistory.filter(
        (item) =>
            item.label?.toLowerCase() !== label.toLowerCase() &&
            !(item.lat === lat && item.lon === lon)
    );

    // Add the new city to the very beginning of the array
    searchHistory.unshift({ label, lat, lon });

    // Keep only the last 5 searched cities
    searchHistory = searchHistory.slice(0, 5);

    // Save back to localStorage as a JSON string
    localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));

    renderSearchHistory();
}

function renderSearchHistory() {
    historyContainer.innerHTML = '';

    searchHistory.forEach((entry) => {
        // Safety fallback in case old string entries are still in localStorage
        if (typeof entry === 'string') return;

        const btn = document.createElement('button');
        btn.type = 'button'; // Important: prevents accidental form submission behavior
        btn.className = 'history-btn';
        btn.textContent = entry.label;

        btn.addEventListener('click', () => {
            cityInput.value = entry.label;
            //form.dispatchEvent(new Event('submit'));
            loadWeatherByCoords(entry.lat, entry.lon);
        });

        historyContainer.appendChild(btn);
    });
}

// 7. Weather Loaders & Event Listeners
async function loadWeatherByCoords(lat, lon) {
    showLoading(true);

    try {
        const [weatherData, forecastData] = await Promise.all([
            fetchWithRetry(() => fetchWeatherByCoords(lat, lon)),
            fetchWithRetry(() => fetchForecastByCoords(lat, lon))
        ]);

        renderWeather(weatherData);
        currentForecastList = extractDailyForecasts(forecastData.list);
        renderForecast();
        saveSearchHistory(weatherData);
    } catch (err) {
        console.error('Weather fetch error', err);
        showError(err.message || 'Failed to load weather data');
    } finally {
        showLoading(false);
    }
}

// 7. Event Listeners & Init
form.addEventListener('submit', async(e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if(!city) return;
    showLoading(true);

    try{
         // 1. Get initial city data (including its exact lat & lon)
        const weatherData = await fetchWithRetry(() => fetchWeatherByCity(city));
        renderWeather(weatherData);
        saveSearchHistory(weatherData);

        // 2. Fetch 5-day forecast using those exact coordinates
        const { lat, lon } = weatherData.coord;
        const forecastData = await fetchWithRetry(() => fetchForecastByCoords(lat, lon));
        currentForecastList = extractDailyForecasts(forecastData.list);
        renderForecast();

    } catch (err) {
        console.error('Weather fetch error', err);
        showError(err.message || 'Failed to load weather data');
    } finally {
        showLoading(false);
    }
});

unitToggleBtn.addEventListener('click', () => {
    isCelsius = !isCelsius;
    updateTempDisplay();
    renderForecast();
});

geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    showLoading(true, 'Detecting location...');
    geoBtn.disabled = true; // Prevents double-clicking while waiting for GPS

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await loadWeatherByCoords(latitude, longitude);
            geoBtn.disabled = false;
        },
        (err) => {
            geoBtn.disabled = false;
            if (err.code === err.PERMISSION_DENIED) {
                showError('Location access denied. Please enable location permissions.');
            } else {
                showError('Unable to retrieve your location.');
            }
            showLoading(false);
        },
        { timeout: 10000 } // Gives up cleanly after 10 seconds if GPS hangs
    );
});

// 8. Initial Load
renderSearchHistory();

(() => {
    if (searchHistory.length > 0 && typeof searchHistory[0] === 'object') {
        const lastCity = searchHistory[0];
        cityInput.value = lastCity.label;
        loadWeatherByCoords(lastCity.lat, lastCity.lon);
    } else {
        cityInput.value = 'London';
        form.dispatchEvent(new Event('submit'));
    }
})();