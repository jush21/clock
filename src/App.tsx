import { useState, useEffect, useMemo } from 'react'
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css'

interface CityConfig {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezoneName?: string;
  nickname?: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  timezoneOffset: number;
  sunrise: number;
  sunset: number;
}

const DEFAULT_CITIES: CityConfig[] = [
  { id: 'jerusalem-31-76-35-21', name: 'Jerusalem', country: 'IL', lat: 31.76, lon: 35.21, timezoneName: 'Asia/Jerusalem' },
  { id: 'dc-38-89-neg77-03', name: 'Washington D.C.', country: 'US', lat: 38.89, lon: -77.03, timezoneName: 'America/New_York' },
  { id: 'tehran-35-68-51-38', name: 'Tehran', country: 'IR', lat: 35.68, lon: 51.38, timezoneName: 'Asia/Tehran' },
  { id: 'berlin-52-52-13-40', name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.40, timezoneName: 'Europe/Berlin' },
];

const API_KEY = '8451500d1564c7206559ef3c63548658';

const CURRENCY_MAP: Record<string, string> = {
  'IL': 'ILS', 'US': 'USD', 'IR': 'IRR', 'DE': 'EUR', 'GB': 'GBP', 'JP': 'JPY', 'CN': 'CNY', 'CA': 'CAD', 'FR': 'EUR', 'IT': 'EUR', 'AU': 'AUD'
};

function AnalogClock({ date }: { date: Date }) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();

  const secDeg = (seconds / 60) * 360;
  const minDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = ((hours % 12 + minutes / 60) / 12) * 360;

  return (
    <div className="analog-clock">
      <div className="hand hour-hand" style={{ transform: `rotate(${hourDeg}deg)` }} />
      <div className="hand minute-hand" style={{ transform: `rotate(${minDeg}deg)` }} />
      <div className="hand second-hand" style={{ transform: `rotate(${secDeg}deg)` }} />
      <div className="center-dot" />
    </div>
  );
}

function SortableClockCard(props: { 
  city: CityConfig, 
  is24Hour: boolean, 
  isAnalog: boolean,
  globalNow: Date, 
  onRemove: () => void,
  onRename: (newName: string) => void,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.city.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(props.city.nickname || props.city.name);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${props.city.lat}&lon=${props.city.lon}&appid=${API_KEY}&units=metric`
        );
        if (!response.ok) return;
        const data = await response.json();
        setWeather({
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          timezoneOffset: data.timezone,
          sunrise: data.sys.sunrise,
          sunset: data.sys.sunset,
        });
      } catch (error) {
        console.error(`Weather fetch error for ${props.city.name}:`, error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [props.city]);

  const localTime = useMemo(() => {
    const utcTime = props.globalNow.getTime() + (props.globalNow.getTimezoneOffset() * 60000);
    const offset = weather?.timezoneOffset ?? 0;
    return new Date(utcTime + (offset * 1000));
  }, [props.globalNow, weather]);

  const isDay = useMemo(() => {
    if (!weather) return true;
    const nowSecs = localTime.getTime() / 1000;
    return nowSecs >= weather.sunrise && nowSecs <= weather.sunset;
  }, [localTime, weather]);

  const timeString = localTime.toLocaleTimeString('en-US', {
    hour12: !props.is24Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = localTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formatSolarTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`clock-card ${isDay ? 'day-theme' : 'night-theme'}`}
    >
      <div className="card-top">
        <div className="drag-handle" {...attributes} {...listeners}>
          ⠿
        </div>
        <button className="remove-btn" onClick={props.onRemove}>×</button>
      </div>

      <div className="card-header">
        <div className="city-info">
          {isEditingName ? (
            <input 
              className="name-edit"
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => { props.onRename(tempName); setIsEditingName(false); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as any).blur()}
            />
          ) : (
            <h2 className="city-name" onClick={() => setIsEditingName(true)}>
              {props.city.nickname || props.city.name} <span className="country-tag">{props.city.country}</span>
              <span className="currency-tag">{CURRENCY_MAP[props.city.country] || ''}</span>
            </h2>
          )}
          
          {weather && (
            <div className="weather-grid">
              <div className="weather-badge main">
                <span className="temp">{weather.temp}°C</span>
                <span className="weather-desc">{isDay ? '☀️' : '🌙'} {weather.description}</span>
              </div>
              <div className="weather-details">
                <span>Feels: {weather.feelsLike}°C</span>
                <span>Hum: {weather.humidity}%</span>
                <span>Wind: {weather.windSpeed}m/s</span>
              </div>
              <div className="solar-times">
                <span>🌅 {formatSolarTime(weather.sunrise)}</span>
                <span>🌇 {formatSolarTime(weather.sunset)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="clock-visual">
        {props.isAnalog ? <AnalogClock date={localTime} /> : <div className="time-display">{timeString}</div>}
      </div>
      <div className="date-display">{dateString}</div>
    </div>
  );
}

function App() {
  const [realTime, setRealTime] = useState(new Date());
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [is24Hour, setIs24Hour] = useState(false);
  const [isAnalog, setIsAnalog] = useState(false);
  const [watchlist, setWatchlist] = useState<CityConfig[]>(() => {
    try {
      const saved = localStorage.getItem('world-clock-watchlist-v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load watchlist from localStorage', e);
    }
    return DEFAULT_CITIES;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityConfig[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const timer = setInterval(() => setRealTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('world-clock-watchlist-v2', JSON.stringify(watchlist));
  }, [watchlist]);

  const globalNow = useMemo(() => {
    const d = new Date(realTime);
    const validOffset = isNaN(offsetMinutes) ? 0 : offsetMinutes;
    d.setMinutes(d.getMinutes() + validOffset);
    return d;
  }, [realTime, offsetMinutes]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchQuery}&limit=5&appid=${API_KEY}`);
      const data = await response.json();
      setSearchResults(data.map((item: any) => ({
        id: `${item.lat}-${item.lon}-${Date.now()}`,
        name: item.name,
        country: item.country,
        lat: item.lat,
        lon: item.lon,
      })));
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWatchlist((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const updateNickname = (id: string, nickname: string) => {
    setWatchlist(watchlist.map(c => c.id === id ? { ...c, nickname } : c));
  };

  return (
    <main className="app-container">
      <header className="app-header">
        <div className="header-glass">
          <div className="header-top">
            <div className="brand-modern">
              <h1>World <span>Clock</span></h1>
              <div className="toggles-modern">
                <button 
                  className={`toggle-modern-btn ${is24Hour ? 'active' : ''}`} 
                  onClick={() => setIs24Hour(!is24Hour)}
                >
                  24h
                </button>
                <button 
                  className={`toggle-modern-btn ${isAnalog ? 'active' : ''}`} 
                  onClick={() => setIsAnalog(!isAnalog)}
                >
                  Analog
                </button>
              </div>
            </div>
            
            <form className="search-modern" onSubmit={handleSearch}>
              <div className="search-input-wrapper">
                <input 
                  type="text" 
                  placeholder="Add a city..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <button type="submit" className="search-submit">
                  {isSearching ? '...' : '🔍'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="search-results-modern">
                  {searchResults.map(r => (
                    <div 
                      key={r.id} 
                      className="search-result-item" 
                      onClick={() => { setWatchlist([...watchlist, r]); setSearchResults([]); setSearchQuery(''); }}
                    >
                      <span>{r.name}, {r.country}</span>
                      <span className="add-plus">+</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>

          <div className="scrubber-modern">
            <div className="scrubber-info">
              <span className="scrubber-label">Meeting Planner</span>
              <span className="scrubber-value">
                {offsetMinutes === 0 ? 'Live Time' : `${offsetMinutes > 0 ? '+' : ''}${Math.round(offsetMinutes/60)}h ${Math.abs(offsetMinutes%60)}m`}
              </span>
            </div>
            <div className="scrubber-controls">
              <input 
                type="range" min="-1440" max="1440" step="15" 
                className="modern-range"
                value={offsetMinutes} onChange={(e) => setOffsetMinutes(parseInt(e.target.value) || 0)} 
              />
              <button className="modern-reset" onClick={() => setOffsetMinutes(0)}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {watchlist && watchlist.length > 0 ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="clock-grid">
            <SortableContext 
              items={watchlist.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {watchlist.map((city) => (
                <SortableClockCard 
                  key={city.id} 
                  city={city} 
                  is24Hour={is24Hour} 
                  isAnalog={isAnalog}
                  globalNow={globalNow} 
                  onRemove={() => setWatchlist(watchlist.filter(c => c.id !== city.id))}
                  onRename={(n) => updateNickname(city.id, n)}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
          Your watchlist is empty. Search for a city to get started!
        </div>
      )}
    </main>
  );
}

export default App
