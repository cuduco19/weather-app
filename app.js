// app.js - Weather App
//const API_KEY = 'YOUR_API_KEY';// <-- Replace with your API key
const API_KEY = CONFIG.API_KEY;
const BASE ='https://api.openweathermap.org/data/2.5/weather';
const FORECAST_BASE = 'https://api.openweathermap.org/data/2.5/forecast';

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
// Add this with your other DOM hooks at the top
const unitToggleBtn = document.getElementById('unit-toggle');
// I (search history feature)- Add this to your DOM Hooks at the top
const historyContainer = document.getElementById('search-history');

// 2. App State
// State variables to remember the current temperature and unit
let currentTempC = null;
let isCelsius = true;
let currentForecastList = [];
// (search history feature) II. Add this to your App State at the top (loads saved array or starts empty)
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];


// 3. UI State Helpers
function showLoading(show = true) {
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

/*
function kelvinToCelcius(k){
    return (k - 273.15).toFixed(1);
}
*/

// (history feature) IV 4. API Fetch & Retry Logic
async function fetchWeatherByCity(city) {
    const url = `${BASE}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

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
    const url = `${BASE}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
    }

    return res.json();
}

async function fetchForecastByCity(city) {
    const url = `${FORECAST_BASE}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
    const res = await fetch(url);
    
    // Basic fetch; check response.ok
    if (!res.ok) {
        if (res.status === 404) throw new Error('City not found');
        throw new Error(`Server error: ${res.status}`);
    }

    return res.json();
}

async function fetchForecastByCoords(lat, lon) {
    const url = `${FORECAST_BASE}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
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
    wCity.textContent = `${data.name}, ${data.sys?.country || ''}`;
    //wTemp.textContent = `${data.main.temp.toFixed(1)}°C`;
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
// (searc history feature )III. Add these two functions with your other functions
function saveSearchHistory(data) {

     // Combine city and country code (e.g., "San Cristóbal, DO")
    const country = data.sys?.country;
    const label = country ? `${data.name}, ${country}` : data.name;
    const { lat, lon } = data.coord;
    
    // Remove the city if it already exists (case-insensitive) so we don't get duplicates
    //searchHistory = searchHistory.filter((item) => item.toLowerCase() !== city.toLowerCase());
    //searchHistory = searchHistory.filter((item) => item.toLowerCase() !== label.toLowerCase());

    // Remove duplicates by matching either the same label OR exact same coordinates
    searchHistory = searchHistory.filter(
        (item) =>
            item.label?.toLowerCase() !== label.toLowerCase() &&
            !(item.lat === lat && item.lon === lon)
    );

    // Add the new city to the very beginning of the array
    //searchHistory.unshift(city);
    //searchHistory.unshift(cityLabel);
    searchHistory.unshift({ label, lat, lon });

    // Keep only the last 5 searched cities
    searchHistory = searchHistory.slice(0, 5);

    // Save back to localStorage as a JSON string
    localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));

    renderSearchHistory();
}

function renderSearchHistory() {
    historyContainer.innerHTML = '';

    //searchHistory.forEach((city) => {
    searchHistory.forEach((entry) => {
        // Safety fallback in case old string entries are still in localStorage
        if (typeof entry === 'string') return;

        const btn = document.createElement('button');
        btn.type = 'button'; // Important: prevents accidental form submission behavior
        btn.className = 'history-btn';
        //btn.textContent = city;
        btn.textContent = entry.label;

        btn.addEventListener('click', () => {
            //cityInput.value = city;
            cityInput.value = entry.label;
            //form.dispatchEvent(new Event('submit'));
            loadWeatherByCoords(entry.lat, entry.lon);
        });

        historyContainer.appendChild(btn);
    });
}

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

// (Search history) IV. Inside your form 'submit' listener, call saveSearchHistory(data.name) right after renderWeather(data):
// 7. Event Listeners & Init
form.addEventListener('submit', async(e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if(!city) return;
    showLoading(true);

    try{
        /*
        //const data = await fetchWeatherByCity(city);
        const [weatherData, forecastData] = await Promise.all([
            fetchWithRetry(() => fetchWeatherByCity(city)),
            fetchWithRetry(() => fetchForecastByCity(city))
        ]);

        //renderWeather(data);
        renderWeather(weatherData);
        currentForecastList = extractDailyForecasts(forecastData.list);
        renderForecast();
        //saveSearchHistory(data.name); // Uses the official capitalized city name from OpenWeather!
        //saveSearchHistory(weatherData.name); // Uses the official capitalized city name from OpenWeather!
        saveSearchHistory(weatherData); // Pass the whole data object instead of just weatherData.name
         */
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

// (search histor feature )V. Render any saved history immediately when the page first loads (put at the bottom of app.js)
renderSearchHistory();

// Optionally: auto-load weather for an initial city (uncomment to use)
//(async () => {
//    cityInput.value = 'London';
//    form.dispatchEvent(new Event('submit'));
//})();

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