# 🌦️ Weather Forecast Web App

A responsive, user-centered weather dashboard built with **HTML5, CSS3, and Vanilla JavaScript** using the [OpenWeatherMap API](https://openweathermap.org). Users can search for any city worldwide, detect their local weather via GPS, switch seamlessly between Celsius and Fahrenheit, and revisit recent locations stored locally in the browser.

## ✨ Key Features

- **Real-Time Current Weather:** Displays temperature, weather condition descriptions, condition icons, humidity, and wind speed in metric units (`°C`, `m/s`).
- **5-Day Multi-Card Forecast:** Uses the OpenWeather 5-day / 3-hour forecast endpoint filtered to daily midday snapshots in a responsive CSS Grid layout.
- **Instant Unit Conversion (`°C` / `°F`):** Toggles temperature units across both current conditions and the 5-day forecast instantaneously without making redundant API calls.
- **Coordinate-Based Search History (`localStorage`):** Saves the last 5 searched locations with city names, country codes, and exact geographic coordinates (`lat` / `lon`) to prevent ambiguity between cities sharing the same name across different countries.
- **GPS Location Detection:** Uses the browser's Geolocation API (`navigator.geolocation`) to fetch local weather conditions with one click.
- **Resilient Fetch with Retry Backoff:** Automatically retries transient network or server failures with increasing backoff delays while failing fast on invalid city queries (`404`) or authentication errors (`401`).
- **Responsive & Accessible UI:** Built with semantic HTML, ARIA live regions for screen readers, and flexible CSS layouts that adapt cleanly across desktop and narrow mobile viewports.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Flexbox & CSS Grid), Vanilla JavaScript (ES6+, `async/await`, Fetch API)
- **APIs:** OpenWeatherMap Current Weather API & 5-Day Forecast API, Browser Geolocation API & `localStorage`

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com
cd YOUR_REPO_NAME
```

### 2. Configure Your API Key
Get a free API key from [OpenWeatherMap](https://openweathermap.org), then create a `config.js` file in the root directory based on `config.example.js`:

```bash
cp config.example.js config.js
```

Open `config.js` and add your API key:
```javascript
const CONFIG = {
  API_KEY: 'YOUR_OPENWEATHER_API_KEY'
};
```
*(Note: `config.js` is listed in `.gitignore` so your personal API key stays private and is never committed to version control.)*

### 3. Run Locally
Open `index.html` using a local development server (such as the **Live Server** extension in VS Code) so browser Geolocation and ES scripts run properly.

## 📂 Project Structure

```text
├── index.html          # Semantic markup and ARIA regions
├── styles.css          # Responsive Flexbox & CSS Grid styling
├── app.js              # API fetching, retry logic, state, and DOM rendering
├── config.example.js   # Safe configuration template for GitHub
├── .gitignore          # Excludes config.js from Git tracking
└── README.md           # Project documentation
```
