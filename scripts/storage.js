const STORAGE_KEY = 'weatherHistory';

export function getSearchHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

export function addCityToHistory(data) {
    const country = data.sys?.country;
    const label = country ? `${data.name}, ${country}` : data.name;
    const { lat, lon } = data.coord;

    let history = getSearchHistory().filter(
        (item) =>
            item.label?.toLowerCase() !== label.toLowerCase() &&
            !(item.lat === lat && item.lon === lon)
    );

    history.unshift({ label, lat, lon });
    history = history.slice(0, 5);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history;
}