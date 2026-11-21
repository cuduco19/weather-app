import {
    fetchWeatherByCity,
    fetchWeatherByCoords,
    fetchForecastByCoords,
    fetchWithRetry
} from './api.js';
import { getSearchHistory, addCityToHistory } from './storage.js';
import {
    showLoading,
    showError,
    updateTempDisplay,
    renderWeather,
    extractDailyForecasts,
    renderForecast,
    renderSearchHistory
} from './render.js';

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const unitToggleBtn = document.getElementById('unit-toggle');
const geoBtn = document.getElementById('geo-btn');

let currentTempC = null;
let isCelsius = true;
let currentForecastList = [];
let searchHistory = getSearchHistory();

function refreshHistoryUI(history) {
    searchHistory = history;
    renderSearchHistory(searchHistory, loadWeatherByCoords);
}

async function loadWeatherByCoords(lat, lon) {
    showLoading(true);
    try {
        const [weatherData, forecastData] = await Promise.all([
            fetchWithRetry(() => fetchWeatherByCoords(lat, lon)),
            fetchWithRetry(() => fetchForecastByCoords(lat, lon))
        ]);

        currentTempC = weatherData.main.temp;
        renderWeather(weatherData, isCelsius);
        currentForecastList = extractDailyForecasts(forecastData.list);
        renderForecast(currentForecastList, isCelsius);
        refreshHistoryUI(addCityToHistory(weatherData));
    } catch (err) {
        console.error('Weather fetch error', err);
        showError(err.message || 'Failed to load weather data');
    } finally {
        showLoading(false);
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;
    showLoading(true);

    try {
        const weatherData = await fetchWithRetry(() => fetchWeatherByCity(city));
        currentTempC = weatherData.main.temp;
        renderWeather(weatherData, isCelsius);
        refreshHistoryUI(addCityToHistory(weatherData));

        const { lat, lon } = weatherData.coord;
        const forecastData = await fetchWithRetry(() => fetchForecastByCoords(lat, lon));
        currentForecastList = extractDailyForecasts(forecastData.list);
        renderForecast(currentForecastList, isCelsius);
    } catch (err) {
        console.error('Weather fetch error', err);
        showError(err.message || 'Failed to load weather data');
    } finally {
        showLoading(false);
    }
});

unitToggleBtn.addEventListener('click', () => {
    isCelsius = !isCelsius;
    updateTempDisplay(currentTempC, isCelsius);
    renderForecast(currentForecastList, isCelsius);
});

geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    showLoading(true, 'Detecting location...');
    geoBtn.disabled = true;

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
        { timeout: 10000 }
    );
});

// Initial Load
refreshHistoryUI(searchHistory);

if (searchHistory.length > 0 && typeof searchHistory[0] === 'object') {
    const lastCity = searchHistory[0];
    cityInput.value = lastCity.label;
    loadWeatherByCoords(lastCity.lat, lastCity.lon);
} else {
    cityInput.value = 'London';
    form.dispatchEvent(new Event('submit'));
}