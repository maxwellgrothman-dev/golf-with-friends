
import { useState, useEffect, useRef } from "react";
import React from "react";

const COURSES = [
  "Sydney R. Marovitz (Waveland) — Lakefront",
  "Columbus Park Golf Course — West Side",
  "Jackson Park Golf Course — South Side",
  "Billy Caldwell Golf Course — Northwest Side",
  "Marquette Park Golf Course — South Side",
  "Weber Park Golf Course — Skokie",
  "Chick Evans Golf Course — Morton Grove",
  "Burnham Woods Golf Course — Burnham",
  "Harborside International — Port Course",
  "Harborside International — Starboard Course",
  "The Glen Club — Glenview",
  "Arlington Lakes Golf Club — Arlington Heights",
  "Preserve at Oak Meadows — Addison",
  "Bloomingdale Golf Club — Bloomingdale",
  "Indian Boundary Golf Course — Wheeling",
  "Chevy Chase Golf Club — Wheeling",
  "Bridges of Poplar Creek — Hoffman Estates",
  "Palos Country Club — Palos Park",
  "Broken Arrow Golf Club — Lockport",
  "Big Run Golf Club — Lockport",
  "Cantigny Golf — Woodside Nine, Wheaton",
  "Cantigny Golf — Lakeside Nine, Wheaton",
  "Cantigny Golf — Hillside Nine, Wheaton",
  "Cog Hill No. 1 — Lemont",
  "Cog Hill No. 2 — Lemont",
  "Cog Hill No. 4 (Dubsdread) — Lemont",
  "Bolingbrook Golf Club — Bolingbrook",
  "Pine Meadow Golf Club — Mundelein",
  "Orchard Valley Golf Club — Aurora",
  "Bowes Creek Country Club — Elgin",
  "Mistwood Golf Club — Romeoville",
  "Bittersweet Golf Club — Gurnee",
  "Bonnie Brook Golf Course — Waukegan",
  "Other (enter below)...",
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDay(year, month) { return new Date(year, month, 1).getDay(); }

const today = new Date();

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter a name"); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters"); return; }
    onLogin(trimmed);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", maxWidth: 480, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ fontSize: 64, marginBottom: 24 }}>⛳</div>
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Golf With Friends</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "#f0f0f0", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Welcome</div>
      <div style={{ fontSize: 14, color: "#555", marginBottom: 40, textAlign: "center", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>Enter your name so your crew knows who's posting tee times</div>

      <div style={{ width: "100%" }}>
        <input
          placeholder="Your name (e.g. Mike)"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          maxLength={24}
          style={{ width: "100%", background: "#111", border: `1px solid ${error ? "#c96a6a" : "#2a2a2a"}`, borderRadius: 12, padding: "16px", color: "#f0f0f0", fontSize: 16, outline: "none", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}
          autoFocus
        />
        {error && <div style={{ fontSize: 12, color: "#c96a6a", marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>{error}</div>}
        <button
          onClick={handleSubmit}
          style={{ width: "100%", background: "#89c96a", color: "#0a0a0a", border: "none", borderRadius: 12, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
          Let's Play →
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#333", marginTop: 32, textAlign: "center", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
        Your name is saved on this device only.<br/>No account or password needed.
      </div>
    </div>
  );
}

export default function GolfScheduler() {
  // ── Username / login ──────────────────────────────────────
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem("gwf_username") || null; } catch { return null; }
  });

  function handleLogin(name) {
    try { localStorage.setItem("gwf_username", name); } catch {}
    setUsername(name);
  }

  // ── Show login if no username ─────────────────────────────
  if (!username) return <LoginScreen onLogin={handleLogin} />;

  return <AppShell username={username} onLogout={() => { try { localStorage.removeItem("gwf_username"); } catch {} setUsername(null); }} />;
}

function AppShell({ username, onLogout }) {
  const [view, setView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [inbound, setInbound] = useState([]);
  const [form, setForm] = useState({
    mode: "specific",
    course: "",
    customCourse: "",
    time: "8:00 AM",
    timeWindow: "anytime",
    maxDistance: 25,
    playersNeeded: 1,
  });
  const [notification, setNotification] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [dbLoading, setDbLoading] = useState(true);

  // ── Supabase helpers ─────────────────────────────────────
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
  const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const VAPID_KEY    = process.env.REACT_APP_VAPID_PUBLIC_KEY;

  function sbFetch(path, opts = {}) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": opts.prefer || "",
        ...(opts.headers || {}),
      },
    });
  }

  const [rsvps, setRsvps] = useState({}); // { requestId: [{ username, status }] }

  // ── Load all requests on mount, then poll every 10s ──────
  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, [username]);

  async function loadRequests() {
    try {
      const [reqRes, rsvpRes] = await Promise.all([
        sbFetch("tee_requests?order=created_at.desc&limit=50"),
        sbFetch("rsvps?select=request_id,username,status&order=created_at.asc"),
      ]);
      if (!reqRes.ok) return;
      const rows = await reqRes.json();
      const rsvpRows = rsvpRes.ok ? await rsvpRes.json() : [];

      // Build rsvp map: { requestId: [{ username, status }] }
      const rsvpMap = {};
      rsvpRows.forEach(r => {
        if (!rsvpMap[r.request_id]) rsvpMap[r.request_id] = [];
        rsvpMap[r.request_id].push({ username: r.username, status: r.status });
      });
      setRsvps(rsvpMap);

      const mine = rows.filter(r => r.creator_name === username).map(dbRowToEvent);
      const others = rows.filter(r => r.creator_name !== username).map(dbRowToEvent);
      setEvents(mine);
      setInbound(prev => {
        return others.map(o => {
          const existing = prev.find(p => p.id === o.id);
          const myRsvp = rsvpMap[o.id]?.find(r => r.username === username);
          return {
            ...o,
            seen: existing?.seen || false,
            myStatus: myRsvp?.status || existing?.myStatus || null,
          };
        });
      });
    } catch (e) {
      console.error("loadRequests error", e);
    } finally {
      setDbLoading(false);
    }
  }

  function dbRowToEvent(row) {
    return {
      id: row.id,
      from: row.creator_name,
      mode: row.mode,
      course: row.course,
      time: row.tee_time ? row.tee_time.slice(0,5).replace(/^0/,"").replace(":",":")  : null,
      timeWindow: row.time_window,
      timeWindowLabel: row.time_window_label,
      date: new Date(row.tee_date + "T12:00:00"),
      maxDistance: row.max_distance_mi,
      playersNeeded: row.players_needed,
      seen: false,
    };
  }

  function formatTimeForDb(timeStr) {
    // "8:00 AM" -> "08:00:00"
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = match[2];
    const ap = match[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2,"0")}:${m}:00`;
  }

  // ── Push subscription helpers ────────────────────────────
  function urlBase64ToUint8Array(b64) {
    const pad = "=".repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + pad).replace(/-/g,"+").replace(/_/g,"/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function savePushSubscription(sub) {
    const json = sub.toJSON();
    await sbFetch("push_subscriptions", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: JSON.stringify({
        username,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      }),
    });
  }

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Push subscribe/resubscribe ──────────────────────────
  async function subscribePush() {
    if (!("serviceWorker" in navigator) || !VAPID_KEY) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // Not subscribed — subscribe fresh
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
      }
      // Always re-save to Supabase in case it changed or was lost
      await savePushSubscription(sub);
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
  }

  // On mount: if permission already granted, auto-resubscribe to refresh stale sub
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      subscribePush();
    }
  }, [username]);

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      showNotification("Notifications enabled! 🔔");
      await subscribePush();
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDay(currentYear, currentMonth);

  const isCurrentMonthView = currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const todayDow = today.getDay();
  const todayDate = today.getDate();
  const weekStartDate = todayDate - todayDow;
  const gridStartDay = isCurrentMonthView ? Math.max(1, weekStartDate) : 1;
  const gridStartOffset = isCurrentMonthView ? ((gridStartDay - 1 + firstDay) % 7) : firstDay;

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const getEventsForDay = (day) => events.filter(e => {
    const d = new Date(e.date);
    return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const hasInboundOnDay = (day) => inbound.some(inv => {
    const d = new Date(inv.date);
    return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const handleDayClick = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    setSelectedDate(d);
    setView("create");
    setForm(f => ({ ...f, mode: "specific", course: "", customCourse: "", time: "8:00 AM", timeWindow: "anytime", coursePreference: "any", maxDistance: 25, playersNeeded: 1 }));
  };

  const handleSendInvite = async () => {
    if (form.mode === "specific" && !form.course && !form.customCourse) {
      showNotification("Please select a course"); return;
    }
    const courseName = form.mode === "specific"
      ? (form.course === "Other (enter below)..." ? form.customCourse : form.course)
      : null;
    const TIME_WINDOW_LABELS = {
      morning: "Morning (before noon)",
      afternoon: "Afternoon (12–4 PM)",
      after2pm: "After 2 PM",
      after4pm: "After 4 PM",
      anytime: "Anytime",
    };
    const twLabel = form.mode === "open" ? TIME_WINDOW_LABELS[form.timeWindow] : null;

    // Format date as YYYY-MM-DD
    const d = selectedDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    const dbRow = {
      creator_name: username,
      mode: form.mode,
      course: courseName,
      tee_date: dateStr,
      tee_time: form.mode === "specific" ? formatTimeForDb(form.time) : null,
      time_window: form.mode === "open" ? form.timeWindow : null,
      time_window_label: twLabel,
      max_distance_mi: form.mode === "open" ? form.maxDistance : null,
      players_needed: form.playersNeeded,
    };

    try {
      // Save to Supabase
      const res = await sbFetch("tee_requests", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify(dbRow),
      });
      const saved = await res.json();
      const eventId = saved[0]?.id || Date.now();

      // Add to local state immediately
      const newEvent = {
        id: eventId,
        from: username,
        mode: form.mode,
        course: courseName,
        timeWindow: form.mode === "open" ? form.timeWindow : null,
        timeWindowLabel: twLabel,
        date: selectedDate,
        time: form.mode === "specific" ? form.time : null,
        maxDistance: form.maxDistance,
        playersNeeded: form.playersNeeded,
      };
      setEvents(ev => [newEvent, ...ev]);

      // Fire push notifications to all other users
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: newEvent, senderUsername: username }),
        });
      } catch (notifErr) {
        console.warn("Notify failed (non-fatal):", notifErr);
      }

      showNotification("All friends notified! ⛳");
      setView("calendar");
    } catch (err) {
      console.error("Save failed:", err);
      showNotification("Failed to save — check connection");
    }
  };

  const [cancelConfirm, setCancelConfirm] = useState(null); // id of event pending cancel

  async function handleCancelRequest(evId) {
    if (cancelConfirm !== evId) {
      // First tap: show confirm state
      setCancelConfirm(evId);
      setTimeout(() => setCancelConfirm(null), 3000); // auto-dismiss after 3s
      return;
    }
    // Second tap: actually cancel
    setCancelConfirm(null);
    setEvents(prev => prev.filter(e => e.id !== evId));
    try {
      await sbFetch(`tee_requests?id=eq.${evId}`, { method: "DELETE" });
      // Also delete associated rsvps (handled by DB cascade, but clean up local state)
      setRsvps(prev => { const n = { ...prev }; delete n[evId]; return n; });
      showNotification("Request cancelled.");
    } catch (err) {
      console.error("Cancel failed:", err);
      showNotification("Failed to cancel — try again");
    }
  }

  const newActivityCount = inbound.filter(i => !i.seen).length;

  async function handleRsvp(inv, status) {
    // Optimistic UI update
    setInbound(prev => prev.map(i => i.id === inv.id ? { ...i, myStatus: status, seen: true } : i));
    if (status === "yes") {
      setRsvps(prev => {
        const existing = prev[inv.id] || [];
        const without = existing.filter(r => r.username !== username);
        return { ...prev, [inv.id]: [...without, { username, status: "yes" }] };
      });
    }

    try {
      // Save RSVP to Supabase
      await sbFetch("rsvps", {
        method: "POST",
        prefer: "resolution=merge-duplicates",
        body: JSON.stringify({ request_id: inv.id, username, status }),
      });

      if (status === "yes") {
        // Calculate spots left after this RSVP
        const currentRsvps = (rsvps[inv.id] || []).filter(r => r.status === "yes");
        const spotsLeft = Math.max(0, inv.playersNeeded - currentRsvps.length - 1);
        const allPlayers = [inv.from, ...currentRsvps.map(r => r.username), username];

        // Fire notification to requester (and other players)
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "rsvp_yes",
            senderUsername: username,
            rsvp: {
              joinerUsername: username,
              requesterUsername: inv.from,
              spotsLeft,
              allPlayerUsernames: allPlayers,
              eventSummary: inv.mode === "specific" ? inv.course : inv.timeWindowLabel,
            },
          }),
        });
      }
    } catch (err) {
      console.error("RSVP save failed:", err);
    }
  }

  // ── Weather ───────────────────────────────────────────────
  const [weather, setWeather] = useState(null);
  const [dailyForecast, setDailyForecast] = useState({});

  useEffect(() => {
    // Helper: seeded fallback so UI always shows something
    function seededFallback() {
      const monthHighs = [34,38,48,60,70,80,84,82,74,62,49,37];
      const monthLows  = [20,23,32,42,52,62,67,65,57,46,35,24];
      const m = today.getMonth();
      function sr(seed) { let x = Math.sin(seed+1)*10000; return x-Math.floor(x); }
      const daily = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(today); d.setDate(today.getDate()+i);
        const seed = d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
        const high = Math.round(monthHighs[m]+(sr(seed)-0.5)*16);
        const wind = Math.round(5+sr(seed+13)*22);
        const precip = Math.round(sr(seed+19)*75);
        const code = precip>60?61:precip>40?80:precip>20?3:sr(seed+3)>0.5?1:0;
        const mm = String(d.getMonth()+1).padStart(2,"0");
        const dd = String(d.getDate()).padStart(2,"0");
        daily[`${d.getFullYear()}-${mm}-${dd}`] = { high, low: Math.round(monthLows[m]+(sr(seed+7)-0.5)*10), wind, code, precipChance: precip };
        if (i===0) setWeather({ temp: high, feelsLike: high-3, wind, windDir: Math.round(sr(seed+5)*360), precipChance: precip, code });
      }
      setDailyForecast(daily);
    }

    // Primary: Open-Meteo — 14-day forecast, CORS-open, no API key needed
    fetch("https://api.open-meteo.com/v1/forecast?latitude=41.8781&longitude=-87.6298" +
      "&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,precipitation_probability" +
      "&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,precipitation_probability_max" +
      "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=14")
      .then(r => { if (!r.ok) throw new Error("open-meteo failed"); return r.json(); })
      .then(data => {
        const c = data.current;
        setWeather({
          temp: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          wind: Math.round(c.windspeed_10m),
          windDir: Math.round(c.winddirection_10m),
          precipChance: c.precipitation_probability ?? 0,
          code: c.weathercode,
        });
        const daily = {};
        (data.daily?.time || []).forEach((dateStr, i) => {
          daily[dateStr] = {
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            wind: Math.round(data.daily.windspeed_10m_max[i]),
            code: data.daily.weathercode[i],
            precipChance: data.daily.precipitation_probability_max[i] ?? 0,
          };
        });
        setDailyForecast(daily);
      })
      .catch(() => {
        // Fallback: wttr.in (3 days real + 11 seeded)
        fetch("https://wttr.in/Chicago?format=j1")
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => {
            const cur = data.current_condition[0];
            const desc = cur.weatherDesc[0]?.value || "";
            const wmoCode = desc.toLowerCase().includes("thunder") ? 95
              : desc.toLowerCase().includes("snow") ? 71
              : desc.toLowerCase().includes("rain") || desc.toLowerCase().includes("drizzle") ? 61
              : desc.toLowerCase().includes("overcast") || desc.toLowerCase().includes("cloudy") ? 3
              : desc.toLowerCase().includes("partly") ? 2 : 0;
            setWeather({ temp: parseInt(cur.temp_F), feelsLike: parseInt(cur.FeelsLikeF), wind: parseInt(cur.windspeedMiles), windDir: parseInt(cur.winddirDegree), precipChance: parseInt(cur.humidity), code: wmoCode });
            // wttr only has 3 days — fill remaining 11 with seeded data
            const daily = {};
            const monthHighs = [34,38,48,60,70,80,84,82,74,62,49,37];
            const monthLows  = [20,23,32,42,52,62,67,65,57,46,35,24];
            const m = today.getMonth();
            function sr(seed) { let x = Math.sin(seed+1)*10000; return x-Math.floor(x); }
            // First fill seeded for all 14 days
            for (let i = 0; i < 14; i++) {
              const d = new Date(today); d.setDate(today.getDate()+i);
              const seed = d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
              const high = Math.round(monthHighs[m]+(sr(seed)-0.5)*16);
              const wind = Math.round(5+sr(seed+13)*22);
              const precip = Math.round(sr(seed+19)*75);
              const code = precip>60?61:precip>40?80:precip>20?3:sr(seed+3)>0.5?1:0;
              const mm = String(d.getMonth()+1).padStart(2,"0");
              const dd = String(d.getDate()).padStart(2,"0");
              daily[`${d.getFullYear()}-${mm}-${dd}`] = { high, low: Math.round(monthLows[m]+(sr(seed+7)-0.5)*10), wind, code, precipChance: precip };
            }
            // Then overwrite first 3 days with real wttr data
            (data.weather || []).forEach(day => {
              const hours = day.hourly || [];
              const avgWind = hours.length ? Math.round(hours.reduce((s,h) => s+parseInt(h.windspeedMiles),0)/hours.length) : 10;
              const maxPrecip = Math.max(...hours.map(h => parseInt(h.chanceofrain||0)));
              const dayDesc = day.hourly?.[4]?.weatherDesc?.[0]?.value || "";
              const dayCode = dayDesc.toLowerCase().includes("thunder") ? 95 : dayDesc.toLowerCase().includes("snow") ? 71 : dayDesc.toLowerCase().includes("rain") || dayDesc.toLowerCase().includes("drizzle") ? 61 : dayDesc.toLowerCase().includes("overcast") || dayDesc.toLowerCase().includes("cloudy") ? 3 : dayDesc.toLowerCase().includes("partly") ? 2 : 0;
              daily[day.date] = { high: parseInt(day.maxtempF), low: parseInt(day.mintempF), wind: avgWind, code: dayCode, precipChance: maxPrecip };
            });
            setDailyForecast(daily);
          })
          .catch(seededFallback);
      });
  }, []);

  const inputStyle = { width: "100%", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px", color: "#e8e8e8", fontSize: 14, outline: "none" };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input, select { font-family: 'DM Sans', sans-serif; }
        .day-cell:hover { background: #1a1a1a !important; }
        .btn-primary:hover { background: #7aba6a !important; transform: translateY(-1px); }
        .tab-btn:hover { color: #e8e8e8 !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .slide-up { animation: slideUp 0.3s ease forwards; }
        .fade-in { animation: fadeIn 0.25s ease forwards; }
        .notif { animation: slideUp 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Golf With Friends</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#f0f0f0", marginTop: 2 }}>
            {view === "calendar" ? `Hey, ${username} 👋` : view === "create" ? "New Round" : view === "activity" ? "Activity" : "My Requests"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view !== "calendar" && (
            <button onClick={() => setView("calendar")} style={{ background: "#1a1a1a", border: "none", color: "#aaa", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Back</button>
          )}
          {view === "calendar" && (
            <button onClick={onLogout} style={{ background: "none", border: "none", color: "#333", padding: "8px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>logout</button>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {notification && (
        <div className="notif" style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#89c96a", color: "#0a0a0a", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 999, whiteSpace: "nowrap" }}>
          {notification}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === "calendar" && (
        <div className="slide-up" style={{ padding: "16px 24px 100px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>‹</button>
            <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: 0.5 }}>{MONTHS[currentMonth]} {currentYear}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#444", fontFamily: "'DM Mono', monospace", letterSpacing: 1, padding: "4px 0" }}>{d}</div>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {Array.from({ length: gridStartOffset }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth - gridStartDay + 1 }).map((_, i) => {
              const day = gridStartDay + i;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const dayEvents = getEventsForDay(day);
              const hasInbound = hasInboundOnDay(day);
              const isThisWeekPast = isCurrentMonthView && day >= weekStartDate && day < todayDate;
              const isActuallyPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const mm = String(currentMonth+1).padStart(2,"0");
              const dd = String(day).padStart(2,"0");
              const forecast = dailyForecast[`${currentYear}-${mm}-${dd}`];
              return (
                <div key={day} className={!isActuallyPast ? "day-cell" : ""} onClick={() => !isActuallyPast && handleDayClick(day)}
                  style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 5, borderRadius: 8, background: isToday ? "#1c2e18" : isThisWeekPast ? "#0d0d0d" : "#111", border: isToday ? "1px solid #89c96a" : "1px solid transparent", cursor: isActuallyPast ? "default" : "pointer", position: "relative", opacity: isThisWeekPast ? 0.2 : isActuallyPast ? 0.35 : 1, overflow: "hidden" }}>
                  <span style={{ fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? "#89c96a" : "#bbb", lineHeight: 1 }}>{day}</span>
                  {forecast && !isActuallyPast && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: "#ddd", fontFamily: "'DM Mono', monospace", lineHeight: 1, fontWeight: 600 }}>{forecast.high}°</span>
                      <span style={{ fontSize: 7.5, color: forecast.precipChance >= 50 ? "#6a9cc9" : forecast.precipChance >= 25 ? "#7aaccc" : "#3a5a6a", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{forecast.precipChance}%</span>
                      <span style={{ fontSize: 7, color: forecast.wind >= 20 ? "#c96a6a" : forecast.wind >= 12 ? "#c9a96a" : "#3a5a3a", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{forecast.wind}mph</span>
                    </div>
                  )}
                  {(dayEvents.length > 0 || hasInbound) && (
                    <div style={{ display: "flex", gap: 2, position: "absolute", bottom: 3 }}>
                      {dayEvents.map((_, ei) => <div key={ei} style={{ width: 3, height: 3, borderRadius: "50%", background: "#89c96a" }} />)}
                      {hasInbound && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#6a9cc9" }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <WeatherWidget weather={weather} loading={!weather} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 12, paddingLeft: 2 }}>
            {[["#89c96a","Your rounds"],["#6a9cc9","Friends"],["#3a5a3a","calm wind"],["#c9a96a","breezy 12+"],["#c96a6a","windy 20+"],["#3a5a6a","low rain"],["#6a9cc9","rain 50%+"]].map(([color,label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />{label}
              </div>
            ))}
          </div>

          {events.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>Your Upcoming Rounds</div>
              {events.slice().reverse().map(ev => (
                <div key={ev.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.mode === "open" ? "🕐 Open Invite" : `⛳ ${ev.course}`}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>
                        {new Date(ev.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {ev.mode === "specific" ? ` · ${ev.time}` : ` · ${ev.timeWindowLabel}`}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>👥 +{ev.playersNeeded} needed</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", background: "#1c2e18", border: "1px solid #89c96a33", borderRadius: 6, padding: "3px 8px", color: "#89c96a" }}>sent</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 12, color: "#333", textAlign: "center" }}>Tap any upcoming date to schedule a round</div>
        </div>
      )}

      {/* ── CREATE VIEW ── */}
      {view === "create" && selectedDate && (
        <div className="slide-up" style={{ padding: "16px 24px 100px", overflowY: "auto" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>📅</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 1 }}>How do you want to play?</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
            {[{id:"specific",icon:"🎯",title:"Specific Round",sub:"Exact course, date & tee time"},{id:"open",icon:"🕐",title:"Open Invite",sub:"Flexible time, any course"}].map(opt => (
              <button key={opt.id} onClick={() => setForm(f => ({ ...f, mode: opt.id }))}
                style={{ background: form.mode === opt.id ? "#1c2e18" : "#111", border: `1px solid ${form.mode === opt.id ? "#89c96a" : "#1e1e1e"}`, borderRadius: 12, padding: "14px 10px", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 18, marginBottom: 5 }}>{opt.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: form.mode === opt.id ? "#89c96a" : "#bbb" }}>{opt.title}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3, lineHeight: 1.4 }}>{opt.sub}</div>
              </button>
            ))}
          </div>

          {form.mode === "specific" && (<>
            <Label>Course</Label>
            <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} style={selectStyle}>
              <option value="">Select a course...</option>
              {COURSES.slice(0, COURSES.length - 1).map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Other (enter below)...">Other (enter below)...</option>
            </select>
            {form.course === "Other (enter below)..." && (
              <input placeholder="Enter course name" value={form.customCourse} onChange={e => setForm(f => ({ ...f, customCourse: e.target.value }))} style={{ ...inputStyle, marginTop: 8 }} />
            )}
            <Label>Tee Time</Label>
            <TeePicker time={form.time} onChange={t => setForm(f => ({ ...f, time: t }))} />
          </>)}

          {form.mode === "open" && (<>
            <Label>Time Preference</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{id:"morning",label:"Morning",sub:"Before noon",icon:"🌅"},{id:"afternoon",label:"Afternoon",sub:"12 PM – 4 PM",icon:"☀️"},{id:"after2pm",label:"After 2 PM",sub:"2 PM or later",icon:"🕑"},{id:"after4pm",label:"After 4 PM",sub:"4 PM or later",icon:"🌇"},{id:"anytime",label:"Anytime",sub:"No preference",icon:"🔓"}].map(opt => (
                <button key={opt.id} onClick={() => setForm(f => ({ ...f, timeWindow: opt.id }))}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: form.timeWindow === opt.id ? "#1c2e18" : "#111", border: `1px solid ${form.timeWindow === opt.id ? "#89c96a" : "#1e1e1e"}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: form.timeWindow === opt.id ? "#89c96a" : "#ccc" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{opt.sub}</div>
                  </div>
                  {form.timeWindow === opt.id && <span style={{ marginLeft: "auto", color: "#89c96a", fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
            <Label>Max Distance from Home</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="range" min={5} max={100} step={5} value={form.maxDistance} onChange={e => setForm(f => ({ ...f, maxDistance: Number(e.target.value) }))} style={{ flex: 1, accentColor: "#89c96a" }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#89c96a", minWidth: 55, textAlign: "right" }}>{form.maxDistance} mi</div>
            </div>
          </>)}

          <Label>Players Needed</Label>
          <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>How many more do you need?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1,2,3].map(n => (
              <button key={n} onClick={() => setForm(f => ({ ...f, playersNeeded: n }))}
                style={{ flex: 1, background: form.playersNeeded === n ? "#1c2e18" : "#111", border: `1px solid ${form.playersNeeded === n ? "#89c96a" : "#1e1e1e"}`, color: form.playersNeeded === n ? "#89c96a" : "#777", padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                +{n}
              </button>
            ))}
          </div>

          <button className="btn-primary" onClick={handleSendInvite} style={{ width: "100%", marginTop: 24, background: "#89c96a", color: "#0a0a0a", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Notify All Friends ⛳
          </button>
        </div>
      )}

      {/* ── ACTIVITY VIEW ── */}
      {view === "activity" && (
        <div className="slide-up" style={{ padding: "16px 24px 100px" }}>

          {/* Notification permission banner */}
          {notifPermission !== "granted" && (
            <div style={{ background: "#111", border: "1px solid #89c96a33", borderRadius: 14, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", marginBottom: 6 }}>🔔 Enable Notifications</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 14, lineHeight: 1.5 }}>
                Get alerted on your lock screen when a friend posts a tee time. You must open this app from your Home Screen icon (not Safari) for this to work on iPhone.
              </div>
              {notifPermission === "denied" ? (
                <div style={{ fontSize: 12, color: "#c96a6a", lineHeight: 1.5 }}>
                  Notifications are blocked. To fix: go to your iPhone Settings → Safari → scroll to this site → allow Notifications.
                </div>
              ) : (
                <button onClick={requestNotifPermission}
                  style={{ background: "#89c96a", color: "#0a0a0a", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" }}>
                  Allow Notifications
                </button>
              )}
            </div>
          )}

          {notifPermission === "granted" && (
            <div style={{ background: "#111", border: "1px solid #1c3322", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div style={{ fontSize: 13, color: "#89c96a" }}>Notifications are enabled</div>
            </div>
          )}

          {/* Inbound requests section */}
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>Inbound Requests</div>

          {inbound.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, color: "#444" }}>No requests from friends yet</div>
              <div style={{ fontSize: 12, color: "#333", marginTop: 6, lineHeight: 1.5 }}>When a friend posts a tee time,{`\n`}it will appear here</div>
            </div>
          ) : (
            inbound.map(inv => {
              const dateStr = new Date(inv.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={inv.id} className="fade-in" style={{ background: "#111", border: `1px solid ${inv.myStatus === "yes" ? "#89c96a33" : "#1a2a30"}`, borderRadius: 14, padding: "16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1a2a30", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#6a9cc9", border: "1px solid #1e3040", flexShrink: 0 }}>
                      {inv.from[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f0f0" }}>{inv.from} wants to play</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{dateStr}{inv.mode === "specific" ? ` · ${inv.time}` : ` · ${inv.timeWindowLabel}`}</div>
                    </div>
                    {inv.myStatus && (
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: inv.myStatus === "yes" ? "#89c96a" : "#555", background: inv.myStatus === "yes" ? "#1c2e18" : "#151515", border: `1px solid ${inv.myStatus === "yes" ? "#89c96a33" : "#222"}`, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
                        {inv.myStatus === "yes" ? "You\'re in" : "Declined"}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {inv.mode === "specific" && <Stat icon="⛳" label="Course" value={inv.course} />}
                    {inv.mode === "open" && <Stat icon="📍" label="Max Dist" value={`${inv.maxDistance} mi`} />}
                    {(() => {
                      const yesRsvps = (rsvps[inv.id] || []).filter(r => r.status === "yes");
                      const spotsLeft = inv.playersNeeded - yesRsvps.length;
                      return <Stat icon="👥" label="Spots Left" value={spotsLeft > 0 ? `${spotsLeft} of ${inv.playersNeeded}` : "Full 🎉"} />;
                    })()}
                  </div>
                  {/* Roster */}
                  {(rsvps[inv.id] || []).filter(r => r.status === "yes").length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: "#444", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Who's in</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ background: "#1c2e18", border: "1px solid #89c96a33", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#89c96a" }}>{inv.from} (host)</div>
                        {(rsvps[inv.id] || []).filter(r => r.status === "yes").map(r => (
                          <div key={r.username} style={{ background: "#1a2a30", border: "1px solid #6a9cc933", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#6a9cc9" }}>{r.username}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!inv.myStatus && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button onClick={() => handleRsvp(inv, "yes")}
                        style={{ flex: 1, background: "#89c96a", color: "#0a0a0a", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                        I'm In 🙌
                      </button>
                      <button onClick={() => handleRsvp(inv, "no")}
                        style={{ flex: 1, background: "#151515", color: "#666", border: "1px solid #222", borderRadius: 10, padding: "12px", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                        Can't Make It
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── REQUESTS VIEW ── */}
      {view === "requests" && (
        <div className="slide-up" style={{ padding: "16px 24px 100px" }}>
          {events.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, color: "#444" }}>No requests sent yet</div>
              <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Tap a date on the calendar to schedule a round</div>
            </div>
          ) : (
            events.slice().reverse().map(ev => {
              const dateStr = new Date(ev.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              const isSpecific = ev.mode === "specific";
              return (
                <div key={ev.id} className="fade-in" style={{ background: "#111", border: "1px solid #1e3322", borderRadius: 14, padding: "16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1c2e18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: "1px solid #89c96a33", flexShrink: 0 }}>
                        {isSpecific ? "⛳" : "🕐"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f0f0" }}>{isSpecific ? ev.course : "Open Invite"}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{dateStr}{isSpecific ? ` · ${ev.time}` : ` · ${ev.timeWindowLabel}`}</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", background: "#1c2e18", border: "1px solid #89c96a33", borderRadius: 6, padding: "3px 8px", color: "#89c96a" }}>sent</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {isSpecific && <Stat icon="🕐" label="Tee Time" value={ev.time} />}
                    {!isSpecific && <Stat icon="📍" label="Max Dist" value={`${ev.maxDistance} mi`} />}
                    {(() => {
                      const yesRsvps = (rsvps[ev.id] || []).filter(r => r.status === "yes");
                      const spotsLeft = ev.playersNeeded - yesRsvps.length;
                      return <Stat icon="👥" label="Spots Left" value={spotsLeft > 0 ? `${spotsLeft} of ${ev.playersNeeded}` : "Full 🎉"} />;
                    })()}
                    <Stat icon="📅" label="Date" value={dateStr} />
                  </div>
                  {/* Roster */}
                  {(rsvps[ev.id] || []).filter(r => r.status === "yes").length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: "#444", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Who's in</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ background: "#1c2e18", border: "1px solid #89c96a33", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#89c96a" }}>You (host)</div>
                        {(rsvps[ev.id] || []).filter(r => r.status === "yes").map(r => (
                          <div key={r.username} style={{ background: "#1a2a30", border: "1px solid #6a9cc933", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#6a9cc9" }}>{r.username}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Cancel button */}
                  <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button
                      onClick={() => handleCancelRequest(ev.id)}
                      style={{ background: "none", border: `1px solid ${cancelConfirm === ev.id ? "#c96a6a" : "#2a2a2a"}`, borderRadius: 8, color: cancelConfirm === ev.id ? "#c96a6a" : "#444", fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.15s" }}>
                      {cancelConfirm === ev.id ? "Tap again to confirm" : "Cancel request"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d0d0d", borderTop: "1px solid #1a1a1a", display: "flex", padding: "10px 0 20px" }}>
        {[
          { id: "calendar", icon: "📆", label: "Calendar" },
          { id: "activity", icon: "🔔", label: "Activity", badge: newActivityCount },
          { id: "requests", icon: "📤", label: "Requests", badge: events.length },
        ].map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => { setView(tab.id); if (tab.id === "activity") setInbound(prev => prev.map(i => ({ ...i, seen: true }))); }}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: view === tab.id ? "#89c96a" : "#444", fontSize: 11, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", transition: "color 0.15s" }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ letterSpacing: 0.5 }}>{tab.label}</span>
            {tab.badge > 0 && (
              <div style={{ position: "absolute", top: 6, right: "calc(50% - 16px)", background: "#89c96a", color: "#0a0a0a", borderRadius: "50%", fontSize: 9, fontWeight: 700, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{tab.badge}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

function getWeatherDesc(code) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly Cloudy";
  if (code <= 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function windDirLabel(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function golfRating(weather) {
  if (!weather) return null;
  let score = 100;
  if (weather.temp < 45) score -= 30;
  else if (weather.temp < 55) score -= 15;
  if (weather.wind > 20) score -= 25;
  else if (weather.wind > 12) score -= 10;
  if (weather.precipChance > 60) score -= 30;
  else if (weather.precipChance > 30) score -= 15;
  if ([51,53,55,61,63,65,80,81,82,95,96,99].includes(weather.code)) score -= 20;
  score = Math.max(0, Math.min(100, score));
  if (score >= 75) return { label: "Great day to play", color: "#89c96a" };
  if (score >= 45) return { label: "Playable conditions", color: "#c9a96a" };
  return { label: "Tough conditions", color: "#c96a6a" };
}

function WeatherWidget({ weather, loading }) {
  const rating = golfRating(weather);
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "16px", marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Chicago Weather</div>
        {rating && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: rating.color, background: rating.color + "18", border: `1px solid ${rating.color}33`, borderRadius: 6, padding: "2px 8px" }}>{rating.label}</div>}
      </div>

      {loading ? (
        <div style={{ color: "#333", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Loading...</div>
      ) : !weather ? (
        <div style={{ color: "#333", fontSize: 12, textAlign: "center", padding: "8px 0" }}>Weather unavailable</div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 40 }}>{getWeatherIcon(weather.code)}</div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 300, color: "#f0f0f0", lineHeight: 1 }}>{weather.temp}°</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>Feels like {weather.feelsLike}° · {getWeatherDesc(weather.code)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#0d0d0d", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>💨 Wind</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#e0e0e0" }}>{weather.wind} <span style={{ fontSize: 11, color: "#666" }}>mph</span></div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{windDirLabel(weather.windDir)} · {weather.windDir}°</div>
            </div>
            <div style={{ background: "#0d0d0d", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>🌧️ Rain Chance</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#e0e0e0" }}>{weather.precipChance}<span style={{ fontSize: 11, color: "#666" }}>%</span></div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>today</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeePicker({ time, onChange }) {
  const HOURS = ["5","6","7","8","9","10","11","12","1","2","3","4","5","6"];
  const HOUR_VALS = [5,6,7,8,9,10,11,12,13,14,15,16,17,18];
  const MINUTES = ["00","05","10","15","20","25","30","35","40","45","50","55"];
  const AMPM = ["AM","PM"];

  // Parse current time string into parts
  function parseTime(t) {
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return { h: 8, m: 0, ampm: "AM" };
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ap = match[3].toUpperCase();
    return { h, m, ampm: ap };
  }

  function formatTime(h, m, ampm) {
    return `${h}:${String(m).padStart(2,"0")} ${ampm}`;
  }

  const parsed = parseTime(time);

  // Find index of current hour in the display list
  const hourIdx = HOUR_VALS.findIndex(v => {
    if (parsed.ampm === "AM") return v === parsed.h;
    if (parsed.ampm === "PM") return parsed.h === 12 ? v === 12 : v === parsed.h + 12;
    return false;
  });
  const minIdx = Math.round(parsed.m / 5);
  const ampmIdx = parsed.ampm === "AM" ? 0 : 1;

  function setHour(idx) {
    const hv = HOUR_VALS[idx];
    let displayH = hv > 12 ? hv - 12 : hv;
    const ap = hv < 12 ? "AM" : hv === 12 ? "PM" : "PM";
    onChange(formatTime(displayH, parsed.m, ap));
  }
  function setMin(idx) {
    onChange(formatTime(parsed.h, idx * 5, parsed.ampm));
  }
  function setAmPm(idx) {
    onChange(formatTime(parsed.h, parsed.m, AMPM[idx]));
  }

  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden", marginTop: 4 }}>
      {/* Selected time display */}
      <div style={{ textAlign: "center", padding: "12px 0 8px", fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: "#89c96a", letterSpacing: 2 }}>
        {time}
      </div>
      {/* Drum columns */}
      <div style={{ display: "flex", alignItems: "stretch", borderTop: "1px solid #1a1a1a" }}>
        {/* Hour column */}
        <DrumColumn items={HOURS} selectedIdx={hourIdx === -1 ? 3 : hourIdx} onSelect={setHour} label="HR" />
        <div style={{ width: 1, background: "#1a1a1a" }} />
        {/* Minute column */}
        <DrumColumn items={MINUTES} selectedIdx={minIdx} onSelect={setMin} label="MIN" />
        <div style={{ width: 1, background: "#1a1a1a" }} />
        {/* AM/PM column */}
        <DrumColumn items={AMPM} selectedIdx={ampmIdx} onSelect={setAmPm} label="AM/PM" narrow />
      </div>
    </div>
  );
}

function DrumColumn({ items, selectedIdx, onSelect, label, narrow }) {
  const ITEM_H = 40;
  const VISIBLE = 5;
  const containerRef = React.useRef(null);
  const [dragStart, setDragStart] = React.useState(null);
  const [dragIdx, setDragIdx] = React.useState(selectedIdx);

  React.useEffect(() => { setDragIdx(selectedIdx); }, [selectedIdx]);

  function clamp(v) { return Math.max(0, Math.min(items.length - 1, v)); }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({ y: e.clientY, idx: dragIdx });
  }
  function handlePointerMove(e) {
    if (!dragStart) return;
    const delta = Math.round((dragStart.y - e.clientY) / ITEM_H);
    setDragIdx(clamp(dragStart.idx + delta));
  }
  function handlePointerUp() {
    onSelect(dragIdx);
    setDragStart(null);
  }

  const offset = (VISIBLE - 1) / 2; // center item index in visible window

  return (
    <div style={{ flex: narrow ? "0 0 72px" : 1, display: "flex", flexDirection: "column", alignItems: "center", userSelect: "none" }}>
      <div style={{ fontSize: 8, letterSpacing: 2, color: "#333", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", padding: "6px 0 4px" }}>{label}</div>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ height: ITEM_H * VISIBLE, overflow: "hidden", width: "100%", cursor: "ns-resize", position: "relative" }}
      >
        {/* Selection highlight band */}
        <div style={{ position: "absolute", top: ITEM_H * offset, left: 0, right: 0, height: ITEM_H, background: "#1c2e18", borderTop: "1px solid #89c96a33", borderBottom: "1px solid #89c96a33", pointerEvents: "none" }} />
        {/* Items */}
        <div style={{ transform: `translateY(${(offset - dragIdx) * ITEM_H}px)`, transition: dragStart ? "none" : "transform 0.15s ease" }}>
          {items.map((item, i) => (
            <div key={i} onClick={() => { setDragIdx(i); onSelect(i); }}
              style={{ height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: i === dragIdx ? 18 : 14, fontWeight: i === dragIdx ? 600 : 400, color: i === dragIdx ? "#89c96a" : Math.abs(i - dragIdx) === 1 ? "#666" : "#2a2a2a", cursor: "pointer", transition: "all 0.1s" }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginTop: 20, marginBottom: 8 }}>{children}</div>;
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ background: "#0d0d0d", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#ccc" }}>{value}</div>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10,
  padding: "12px 14px", color: "#e8e8e8", fontSize: 14, outline: "none",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none", cursor: "pointer",
};
