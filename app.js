// app.js - Weather App
//const API_KEY = 'YOUR_API_KEY';// <-- Replace with your API key
const API_KEY = CONFIG.API_KEY;
const BASE ='https://api.openweathermap.org/data/2.5/weather';

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const loader = document.getElementById('loader');
const errorEl = document.getElementById('error');
const weatherSection = document.getElementById('weather');

const wCity = document.getElementById('w-city');
const wTemp = document.getElementById('w-temp');
const wDesc = document.getElementById('w-desc');
const wHumidity = document.getElementById('w-humidity');
const wWind = document.getElementById('w-wind');
const wIcon = document.getElementById('w-icon');

function showLoading(show = true) {
    loader.classList.toggle('hidden', !show);
    if (show) {
        weatherSection.classList.add('hidden');
        errorEl.classList.add('hidden');
    }
}

function showError(message){
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    weatherSection.classList.add('hidden');
}

function kelvinToCelcius(k){
    return (k - 273.15).toFixed(1);
}

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

function renderWeather(data){
    // OpenWeather returns weather[0].description, main.temp, main.humidity, wind.speed
    wCity.textContent = `${data.name}, ${data.sys?.country || ''}`;
    wTemp.textContent = `${data.main.temp}°C`;
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

form.addEventListener('submit', async(e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if(!city) return;
    showLoading(true);

    try{
        const data = await fetchWeatherByCity(city);
        renderWeather(data);
    } catch (err) {
        console.error('Weather fetch error', err);
        showError(err.message || 'Failed to load weather data');
    } finally {
        showLoading(false);
    }
});

// Optionally: auto-load weather for an initial city (uncomment to use)
//(async () => {
//    cityInput.value = 'London';
//    form.dispatchEvent(new Event('submit'));
//})();