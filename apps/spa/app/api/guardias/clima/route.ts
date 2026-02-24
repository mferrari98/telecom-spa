type ClimaApiEntry = {
  emoji: string;
  temp_max: number | null;
  temp_min: number | null;
};

type ClimaCachePayload = {
  data: Record<string, ClimaApiEntry>;
  timestamp: number;
};

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
let climaCache: ClimaCachePayload | null = null;

const WEATHER_EMOJI: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌦️",
  56: "🌨️",
  57: "🌨️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌨️",
  67: "🌨️",
  71: "🌨️",
  73: "🌨️",
  75: "❄️",
  80: "⛈️",
  81: "⛈️",
  82: "⛈️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️"
};

function toDateKey(dateString: string): string {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readCache(): Record<string, ClimaApiEntry> | null {
  if (!climaCache) return null;
  if (Date.now() - climaCache.timestamp >= CACHE_DURATION_MS) return null;
  return climaCache.data;
}

function buildFallbackClima(days: number): Record<string, ClimaApiEntry> {
  const fallback: Record<string, ClimaApiEntry> = {};
  const emojiCycle = ["☀️", "🌤️", "⛅", "☁️"];
  const tempMaxCycle = [28, 27, 26, 25, 24, 26, 27];
  const tempMinCycle = [17, 16, 15, 14, 13, 14, 15];
  const today = new Date();

  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

    fallback[key] = {
      emoji: emojiCycle[index % emojiCycle.length],
      temp_max: tempMaxCycle[index % tempMaxCycle.length],
      temp_min: tempMinCycle[index % tempMinCycle.length]
    };
  }

  return fallback;
}

export async function GET() {
  const cached = readCache();
  if (cached) {
    return Response.json({ success: true, clima: cached });
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", "-42.7692");
    url.searchParams.set("longitude", "-65.0386");
    url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("timezone", "America/Argentina/Buenos_Aires");
    url.searchParams.set("forecast_days", "7");

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`open-meteo status ${response.status}`);
    }

    const payload = await response.json();
    const times: string[] = payload?.daily?.time || [];
    const codes: number[] = payload?.daily?.weathercode || [];
    const tempMax: Array<number | null> = payload?.daily?.temperature_2m_max || [];
    const tempMin: Array<number | null> = payload?.daily?.temperature_2m_min || [];

    const clima: Record<string, ClimaApiEntry> = {};
    for (let i = 0; i < times.length; i += 1) {
      const key = toDateKey(times[i]);
      const code = Number(codes[i]);
      clima[key] = {
        emoji: WEATHER_EMOJI[code] || "☀️",
        temp_max: Number.isFinite(Number(tempMax[i])) ? Number(tempMax[i]) : null,
        temp_min: Number.isFinite(Number(tempMin[i])) ? Number(tempMin[i]) : null
      };
    }

    if (Object.keys(clima).length === 0) {
      throw new Error("empty clima payload");
    }

    climaCache = { data: clima, timestamp: Date.now() };
    return Response.json({ success: true, clima });
  } catch {
    const fallback = climaCache?.data;
    if (fallback && Object.keys(fallback).length > 0) {
      return Response.json({ success: true, clima: fallback });
    }

    return Response.json({
      success: true,
      clima: buildFallbackClima(7),
      fallback: true,
      warning: "No se pudo cargar el pronostico en vivo"
    });
  }
}
