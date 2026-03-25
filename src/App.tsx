import { useState, useEffect } from 'react'
import './App.css'

interface CityConfig {
  name: string;
  timezone: string;
  flag: string;
}

const CITIES: CityConfig[] = [
  { name: 'Israel', timezone: 'Asia/Jerusalem', flag: '🇮🇱' },
  { name: 'Washington D.C.', timezone: 'America/New_York', flag: '🇺🇸' },
  { name: 'Iran', timezone: 'Asia/Tehran', flag: '🇮🇷' },
  { name: 'Berlin', timezone: 'Europe/Berlin', flag: '🇩🇪' },
];

function ClockCard({ city, is24Hour, now }: { city: CityConfig, is24Hour: boolean, now: Date }) {
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
        <h2 className="city-name">{city.name}</h2>
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
        <h1>World Clock</h1>
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
