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
// Add this with your other DOM hooks at the top
const unitToggleBtn = document.getElementById('unit-toggle');
// 1. Add this to your DOM Hooks at the top
const historyContainer = document.getElementById('search-history');

// State variables to remember the current temperature and unit
let currentTempC = null;
let isCelsius = true;


// 2. Add this to your App State at the top (loads saved array or starts empty)
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];


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

/*
function kelvinToCelcius(k){
    return (k - 273.15).toFixed(1);
}
*/

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

function renderWeather(data){
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

// 3. Add these two functions with your other functions
function saveSearchHistory(city) {
    // Remove the city if it already exists (case-insensitive) so we don't get duplicates
    searchHistory = searchHistory.filter(
        (item) => item.toLowerCase() !== city.toLowerCase()
    );

    // Add the new city to the very beginning of the array
    searchHistory.unshift(city);

    // Keep only the last 5 searched cities
    searchHistory = searchHistory.slice(0, 5);

    // Save back to localStorage as a JSON string
    localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));

    renderSearchHistory();
}

function renderSearchHistory() {
    historyContainer.innerHTML = '';

    searchHistory.forEach((city) => {
        const btn = document.createElement('button');
        btn.type = 'button'; // Important: prevents accidental form submission behavior
        btn.className = 'history-btn';
        btn.textContent = city;

        btn.addEventListener('click', () => {
            cityInput.value = city;
            form.dispatchEvent(new Event('submit'));
        });

        historyContainer.appendChild(btn);
    });
}

form.addEventListener('submit', async(e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if(!city) return;
    showLoading(true);

    try{
        const data = await fetchWeatherByCity(city);
        renderWeather(data);
        saveSearchHistory(data.name); // Uses the official capitalized city name from OpenWeather!
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
});

// 5. Render any saved history immediately when the page first loads (put at the bottom of app.js)
renderSearchHistory();

// Optionally: auto-load weather for an initial city (uncomment to use)
//(async () => {
//    cityInput.value = 'London';
//    form.dispatchEvent(new Event('submit'));
//})();