import { useState, useEffect } from 'react'
import './App.css'

interface CityConfig {
  name: string;
  timezone: string;
  flag: string;
  lat: number;
  lon: number;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

const CITIES: CityConfig[] = [
  { name: 'Jerusalem', timezone: 'Asia/Jerusalem', flag: '🇮🇱', lat: 31.76, lon: 35.21 },
  { name: 'Washington D.C.', timezone: 'America/New_York', flag: '🇺🇸', lat: 38.89, lon: -77.03 },
  { name: 'Tehran', timezone: 'Asia/Tehran', flag: '🇮🇷', lat: 35.68, lon: 51.38 },
  { name: 'Berlin', timezone: 'Europe/Berlin', flag: '🇩🇪', lat: 52.52, lon: 13.40 },
];

// NOTE: Replace this with your actual API key from OpenWeatherMap
const API_KEY = '8451500d1564c7206559ef3c63548658';

function ClockCard({ city, is24Hour, now }: { city: CityConfig, is24Hour: boolean, now: Date }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      console.log(`Fetching weather for ${city.name}...`);
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`
        );
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Weather API Error (${city.name}):`, errorData);
          return;
        }
        const data = await response.json();
        console.log(`Weather data received for ${city.name}:`, data);
        setWeather({
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
        });
      } catch (error) {
        console.error(`Network Error fetching weather for ${city.name}:`, error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Update weather every 10 mins
    return () => clearInterval(interval);
  }, [city]);

  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: city.timezone,
    hour12: !is24Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = now.toLocaleDateString('en-US', {
    timeZone: city.timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="clock-card">
      <div className="card-header">
        <span className="flag">{city.flag}</span>
        <div className="city-info">
          <h2 className="city-name">{city.name}</h2>
          {weather && (
            <div className="weather-badge">
              <span className="temp">{weather.temp}°C</span>
              <span className="weather-desc">{weather.description}</span>
            </div>
          )}
        </div>
      </div>
      <div className="time-display">{timeString}</div>
      <div className="date-display">{dateString}</div>
    </div>
  );
}

function App() {
  const [now, setNow] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>World Clock & Weather</h1>
        <button 
          className="toggle-btn" 
          onClick={() => setIs24Hour(!is24Hour)}
        >
          {is24Hour ? '12-Hour' : '24-Hour'}
        </button>
      </header>
      
      <div className="clock-grid">
        {CITIES.map(city => (
          <ClockCard key={city.name} city={city} is24Hour={is24Hour} now={now} />
        ))}
      </div>
    </main>
  );
}

export default App
