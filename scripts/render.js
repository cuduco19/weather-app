const loader = document.getElementById('loader');
const errorEl = document.getElementById('error');
const weatherSection = document.getElementById('weather');
const forecastSection = document.getElementById('forecast');
const forecastGrid = document.getElementById('forecast-grid');
const cityInput = document.getElementById('city-input');

const wCity = document.getElementById('w-city');
const wTemp = document.getElementById('w-temp');
const wDesc = document.getElementById('w-desc');
const wHumidity = document.getElementById('w-humidity');
const wWind = document.getElementById('w-wind');
const wIcon = document.getElementById('w-icon');
const unitToggleBtn = document.getElementById('unit-toggle');
const historyContainer = document.getElementById('search-history');

export function showLoading(show = true, message = 'Loading...') {
    loader.textContent = message;
    loader.classList.toggle('hidden', !show);
    if (show) {
        weatherSection.classList.add('hidden');
        forecastSection.classList.add('hidden');
        errorEl.classList.add('hidden');
    }
}

export function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    weatherSection.classList.add('hidden');
    forecastSection.classList.add('hidden');
}

export function updateTempDisplay(currentTempC, isCelsius) {
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

export function renderWeather(data, isCelsius) {
    const cityLabel = data.sys?.country ? `${data.name}, ${data.sys.country}` : data.name;
    wCity.textContent = cityLabel;
    cityInput.value = cityLabel;
    updateTempDisplay(data.main.temp, isCelsius);
    wDesc.textContent = data.weather?.[0]?.description || '';
    wHumidity.textContent = `Humidity: ${data.main.humidity}%`;
    wWind.textContent = `Wind: ${data.wind.speed} m/s`;

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

export function extractDailyForecasts(list) {
    const daily = list.filter((item) => item.dt_txt.includes('12:00:00'));
    return daily.length >= 5 ? daily.slice(0, 5) : list.filter((_, idx) => idx % 8 === 0).slice(0, 5);
}

export function renderForecast(forecastList, isCelsius) {
    if (!forecastList.length) return;

    forecastGrid.innerHTML = '';

    forecastList.forEach((dayData) => {
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
            ${iconCode ? `<img src="https://openweathermap.org/payload/api/media/file/${iconCode}.png" alt="${desc}" width="40" height="40" />` : ''}
            <span class="forecast-temp">${displayTemp}</span>
        `;
        
        forecastGrid.appendChild(card);
    });

    forecastSection.classList.remove('hidden');
}

export function renderSearchHistory(history, onSelectCity) {
    historyContainer.innerHTML = '';

    history.forEach((entry) => {
        if (typeof entry === 'string') return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'history-btn';
        btn.textContent = entry.label;

        btn.addEventListener('click', () => {
            cityInput.value = entry.label;
            onSelectCity(entry.lat, entry.lon);
        });

        historyContainer.appendChild(btn);
    });
}