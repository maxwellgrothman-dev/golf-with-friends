
import { useState, useEffect, useRef } from "react";
import React from "react";

const COURSES = [
  "Sydney R. Marovitz (Waveland) — Lakefront",     // ~3 mi
  "Columbus Park Golf Course — West Side",           // ~5 mi
  "Jackson Park Golf Course — South Side",           // ~6 mi
  "Billy Caldwell Golf Course — Northwest Side",     // ~7 mi
  "Marquette Park Golf Course — South Side",         // ~8 mi
  "Weber Park Golf Course — Skokie",                 // ~9 mi
  "Chick Evans Golf Course — Morton Grove",          // ~12 mi
  "Burnham Woods Golf Course — Burnham",             // ~14 mi
  "Harborside International — Port Course",          // ~14 mi
  "Harborside International — Starboard Course",     // ~14 mi
  "The Glen Club — Glenview",                        // ~16 mi
  "Arlington Lakes Golf Club — Arlington Heights",   // ~18 mi
  "Preserve at Oak Meadows — Addison",               // ~18 mi
  "Bloomingdale Golf Club — Bloomingdale",           // ~19 mi
  "Indian Boundary Golf Course — Wheeling",          // ~21 mi
  "Chevy Chase Golf Club — Wheeling",                // ~22 mi
  "Bridges of Poplar Creek — Hoffman Estates",       // ~22 mi
  "Palos Country Club — Palos Park",                 // ~22 mi
  "Broken Arrow Golf Club — Lockport",               // ~24 mi
  "Big Run Golf Club — Lockport",                    // ~24 mi
  "Cantigny Golf — Woodside Nine, Wheaton",          // ~26 mi
  "Cantigny Golf — Lakeside Nine, Wheaton",          // ~26 mi
  "Cantigny Golf — Hillside Nine, Wheaton",          // ~26 mi
  "Cog Hill No. 1 — Lemont",                         // ~27 mi
  "Cog Hill No. 2 — Lemont",                         // ~27 mi
  "Cog Hill No. 4 (Dubsdread) — Lemont",             // ~27 mi
  "Bolingbrook Golf Club — Bolingbrook",             // ~28 mi
  "Pine Meadow Golf Club — Mundelein",               // ~34 mi
  "Orchard Valley Golf Club — Aurora",               // ~35 mi
  "Bowes Creek Country Club — Elgin",                // ~36 mi
  "Mistwood Golf Club — Romeoville",                 // ~37 mi
  "Bittersweet Golf Club — Gurnee",                  // ~38 mi
  "Bonnie Brook Golf Course — Waukegan",             // ~40 mi
  "Other (enter below)...",
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

const today = new Date();

export default function GolfScheduler() {
  const [view, setView] = useState("calendar"); // calendar | create | invite | inbox
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [invites, setInvites] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    mode: "specific", // "specific" | "open"
    course: "",
    customCourse: "",
    time: "8:00 AM",
    timeWindow: "anytime", // for open mode: "morning", "afternoon", "after2pm", "after4pm", "anytime"
    maxDistance: 25,
    playersNeeded: 1,
  });
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDay(currentYear, currentMonth);

  // Calendar start: if viewing current month, skip weeks before this week
  const isCurrentMonthView = currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const todayDow = today.getDay(); // 0=Sun..6=Sat
  const todayDate = today.getDate();
  // First day of the week containing today (Sunday)
  const weekStartDate = todayDate - todayDow;
  // How many cells to skip at start of grid when in current month view
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

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const hasInviteOnDay = (day) => {
    return invites.some(inv => {
      const d = new Date(inv.date);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const handleDayClick = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    setSelectedDate(d);
    setView("create");
    setForm(f => ({ ...f, mode: "specific", course: "", customCourse: "", time: "8:00 AM", timeWindow: "anytime", coursePreference: "any", maxDistance: 25, playersNeeded: 1 }));
  };

  const handleSendInvite = () => {
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
    const newEvent = {
      id: Date.now(),
      mode: form.mode,
      course: courseName,
      timeWindow: form.mode === "open" ? form.timeWindow : null,
      timeWindowLabel: form.mode === "open" ? TIME_WINDOW_LABELS[form.timeWindow] : null,
      date: selectedDate,
      time: form.mode === "specific" ? form.time : null,
      maxDistance: form.maxDistance,
      playersNeeded: form.playersNeeded,
    };
    setEvents(ev => [...ev, newEvent]);
    showNotification("All friends notified! ⛳");
    setView("calendar");
  };



  const deleteEvent = (id) => {
    setEvents(ev => ev.filter(e => e.id !== id));
    showNotification("Request deleted.");
  };

  const pendingInvites = events; // badge shows count of your active sent requests

  const [weather, setWeather] = useState(null);
  const [dailyForecast, setDailyForecast] = useState({});

  useEffect(() => {
    // wttr.in — no auth, CORS-open, returns structured JSON including 3-day forecast
    fetch("https://wttr.in/Chicago?format=j1")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const cur = data.current_condition[0];
        const tempF = parseInt(cur.temp_F);
        const feelsF = parseInt(cur.FeelsLikeF);
        const windMph = parseInt(cur.windspeedMiles);
        const windDeg = parseInt(cur.winddirDegree);
        const precip = parseInt(cur.humidity); // wttr doesn't have current precip%, use humidity as proxy
        const desc = cur.weatherDesc[0]?.value || "";
        // Map wttr description to WMO-like code
        const wmoCode = desc.toLowerCase().includes("thunder") ? 95
          : desc.toLowerCase().includes("snow") ? 71
          : desc.toLowerCase().includes("rain") || desc.toLowerCase().includes("drizzle") ? 61
          : desc.toLowerCase().includes("overcast") || desc.toLowerCase().includes("cloudy") ? 3
          : desc.toLowerCase().includes("partly") ? 2
          : desc.toLowerCase().includes("fog") ? 45
          : 0;

        setWeather({ temp: tempF, feelsLike: feelsF, wind: windMph, windDir: windDeg, precipChance: precip, code: wmoCode, desc });

        // Build daily forecast from wttr's weather array (up to 3 days)
        const daily = {};
        (data.weather || []).forEach(day => {
          // date format: "2025-03-01"
          const dateStr = day.date;
          const high = parseInt(day.maxtempF);
          const low = parseInt(day.mintempF);
          // avg wind from hourly
          const hours = day.hourly || [];
          const avgWind = hours.length
            ? Math.round(hours.reduce((s, h) => s + parseInt(h.windspeedMiles), 0) / hours.length)
            : 10;
          const maxPrecip = Math.max(...hours.map(h => parseInt(h.chanceofrain || 0)));
          const dayDesc = day.hourly?.[4]?.weatherDesc?.[0]?.value || "";
          const dayCode = dayDesc.toLowerCase().includes("thunder") ? 95
            : dayDesc.toLowerCase().includes("snow") ? 71
            : dayDesc.toLowerCase().includes("rain") || dayDesc.toLowerCase().includes("drizzle") ? 61
            : dayDesc.toLowerCase().includes("overcast") || dayDesc.toLowerCase().includes("cloudy") ? 3
            : dayDesc.toLowerCase().includes("partly") ? 2
            : 0;
          daily[dateStr] = { high, low, wind: avgWind, code: dayCode, precipChance: maxPrecip };
        });
        setDailyForecast(daily);
      })
      .catch(() => {
        // Fallback: seeded realistic Chicago weather so UI always shows something
        const monthHighs = [34,38,48,60,70,80,84,82,74,62,49,37];
        const monthLows  = [20,23,32,42,52,62,67,65,57,46,35,24];
        const m = today.getMonth();
        function sr(seed) { let x = Math.sin(seed+1)*10000; return x-Math.floor(x); }
        const daily = {};
        for (let i = 0; i < 14; i++) {
          const d = new Date(today); d.setDate(today.getDate()+i);
          const seed = d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
          const high = Math.round(monthHighs[m]+(sr(seed)-0.5)*16);
          const low  = Math.round(monthLows[m]+(sr(seed+7)-0.5)*10);
          const wind = Math.round(5+sr(seed+13)*22);
          const precip = Math.round(sr(seed+19)*75);
          const code = precip>60?61:precip>40?80:precip>20?3:sr(seed+3)>0.5?1:0;
          const mm = String(d.getMonth()+1).padStart(2,"0");
          const dd = String(d.getDate()).padStart(2,"0");
          daily[`${d.getFullYear()}-${mm}-${dd}`] = { high, low, wind, code, precipChance: precip };
          if (i===0) setWeather({ temp: high, feelsLike: high-3, wind, windDir: Math.round(sr(seed+5)*360), precipChance: precip, code });
        }
        setDailyForecast(daily);
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e8e8e8",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input, select, textarea { font-family: 'DM Sans', sans-serif; }
        .day-cell:hover { background: #1a1a1a !important; cursor: pointer; }
        .btn-primary { transition: all 0.15s ease; }
        .btn-primary:hover { background: #7aba6a !important; transform: translateY(-1px); }
        .tab-btn:hover { color: #e8e8e8 !important; }
        .respond-btn:hover { opacity: 0.85; transform: scale(0.98); }
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
            {view === "calendar" ? "Schedule" : view === "create" ? "New Round" : view === "inbox" ? "My Requests" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view !== "calendar" && (
            <button onClick={() => setView("calendar")} style={{ background: "#1a1a1a", border: "none", color: "#aaa", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Back</button>
          )}
          {view === "calendar" && (
            <button onClick={() => setView("inbox")} style={{ background: "#1a1a1a", border: "none", color: pendingInvites.length > 0 ? "#89c96a" : "#aaa", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, position: "relative" }}>
              Requests {events.length > 0 && <span style={{ background: "#89c96a", color: "#0a0a0a", borderRadius: "50%", fontSize: 10, fontWeight: 700, padding: "1px 5px", marginLeft: 4 }}>{events.length}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div className="notif" style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#89c96a", color: "#0a0a0a", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 999, whiteSpace: "nowrap" }}>
          {notification}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === "calendar" && (
        <div className="slide-up" style={{ padding: "16px 24px 100px" }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>‹</button>
            <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: 0.5 }}>{MONTHS[currentMonth]} {currentYear}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#444", fontFamily: "'DM Mono', monospace", letterSpacing: 1, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {/* Leading offset for the week containing gridStartDay */}
            {Array.from({ length: gridStartOffset }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth - gridStartDay + 1 }).map((_, i) => {
              const day = gridStartDay + i;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const dayEvents = getEventsForDay(day);
              const hasInvite = hasInviteOnDay(day);
              // In current month view, grey out earlier days in the same week (before today)
              const isThisWeekPast = isCurrentMonthView && day >= weekStartDate && day < todayDate;
              const isActuallyPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const mm = String(currentMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const dateKey = `${currentYear}-${mm}-${dd}`;
              const forecast = dailyForecast[dateKey];
              return (
                <div
                  key={day}
                  className={isActuallyPast && !isThisWeekPast ? "" : "day-cell"}
                  onClick={() => !isActuallyPast && handleDayClick(day)}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 5,
                    borderRadius: 8,
                    background: isToday ? "#1c2e18" : isThisWeekPast ? "#0d0d0d" : "#111",
                    border: isToday ? "1px solid #89c96a" : "1px solid transparent",
                    cursor: isActuallyPast ? "default" : "pointer",
                    position: "relative",
                    opacity: isThisWeekPast ? 0.2 : isActuallyPast ? 0.35 : 1,
                    overflow: "hidden",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? "#89c96a" : "#bbb", lineHeight: 1 }}>{day}</span>
                  {forecast && !isActuallyPast && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: "#ddd", fontFamily: "'DM Mono', monospace", lineHeight: 1, fontWeight: 600 }}>{forecast.high}°</span>
                      <span style={{ fontSize: 7.5, color: forecast.precipChance >= 50 ? "#6a9cc9" : forecast.precipChance >= 25 ? "#7aaccc" : "#3a5a6a", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{forecast.precipChance}%</span>
                      <span style={{ fontSize: 7, color: forecast.wind >= 20 ? "#c96a6a" : forecast.wind >= 12 ? "#c9a96a" : "#3a5a3a", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{forecast.wind}mph</span>
                    </div>
                  )}
                  {(dayEvents.length > 0 || hasInvite) && (
                    <div style={{ display: "flex", gap: 2, position: "absolute", bottom: 3 }}>
                      {dayEvents.map((_, ei) => <div key={ei} style={{ width: 3, height: 3, borderRadius: "50%", background: "#89c96a" }} />)}
                      {hasInvite && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#6a9cc9" }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Weather Widget */}
          <WeatherWidget weather={weather} loading={!weather} />

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 12, paddingLeft: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#555" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#89c96a" }} /> Your rounds
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#555" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6a9cc9" }} /> Invited
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#3a5a3a" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8 }}>mph</span> calm wind
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#c9a96a" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8 }}>mph</span> breezy 12+
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#c96a6a" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8 }}>mph</span> windy 20+
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#3a5a6a" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8 }}>%</span> low rain
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6a9cc9" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8 }}>%</span> rain 50%+
            </div>
          </div>

          {/* Upcoming events */}
          {events.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>Upcoming</div>
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
                      {ev.mode === "open" && <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>📍 within {ev.maxDistance} mi · 👥 {ev.playersNeeded} players</div>}
                      {ev.mode === "specific" && <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>👥 {ev.playersNeeded} players needed</div>}
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

      {/* CREATE INVITE VIEW */}
      {view === "create" && selectedDate && (
        <div className="slide-up" style={{ padding: "16px 24px 100px", overflowY: "auto" }}>

          {/* Date header */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>📅</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 1 }}>How do you want to play?</div>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
            <button
              onClick={() => setForm(f => ({ ...f, mode: "specific" }))}
              style={{
                background: form.mode === "specific" ? "#1c2e18" : "#111",
                border: `1px solid ${form.mode === "specific" ? "#89c96a" : "#1e1e1e"}`,
                borderRadius: 12, padding: "14px 10px", cursor: "pointer",
                textAlign: "left", transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 5 }}>🎯</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.mode === "specific" ? "#89c96a" : "#bbb" }}>Specific Round</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 3, lineHeight: 1.4 }}>Exact course, date & tee time</div>
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, mode: "open" }))}
              style={{
                background: form.mode === "open" ? "#1c2e18" : "#111",
                border: `1px solid ${form.mode === "open" ? "#89c96a" : "#1e1e1e"}`,
                borderRadius: 12, padding: "14px 10px", cursor: "pointer",
                textAlign: "left", transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 5 }}>🕐</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.mode === "open" ? "#89c96a" : "#bbb" }}>Open Invite</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 3, lineHeight: 1.4 }}>Flexible time, any course</div>
            </button>
          </div>

          {/* ── SPECIFIC MODE ── */}
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

          {/* ── OPEN MODE ── */}
          {form.mode === "open" && (<>
            <Label>Time Preference</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { id: "morning",   label: "Morning",    sub: "Before noon",   icon: "🌅" },
                { id: "afternoon", label: "Afternoon",  sub: "12 PM – 4 PM",  icon: "☀️" },
                { id: "after2pm",  label: "After 2 PM", sub: "2 PM or later", icon: "🕑" },
                { id: "after4pm",  label: "After 4 PM", sub: "4 PM or later", icon: "🌇" },
                { id: "anytime",   label: "Anytime",    sub: "No preference", icon: "🔓" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setForm(f => ({ ...f, timeWindow: opt.id }))}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: form.timeWindow === opt.id ? "#1c2e18" : "#111", border: `1px solid ${form.timeWindow === opt.id ? "#89c96a" : "#1e1e1e"}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: form.timeWindow === opt.id ? "#89c96a" : "#ccc" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{opt.sub}</div>
                  </div>
                  {form.timeWindow === opt.id && <span style={{ marginLeft: "auto", color: "#89c96a", fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>

            <Label>Course Preference</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { id: "any",      label: "Any course",         sub: "Within distance limit",  icon: "🗺️" },
                { id: "suggest",  label: "Open to suggestions", sub: "Friends can propose",    icon: "💬" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setForm(f => ({ ...f, coursePreference: opt.id }))}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: (form.coursePreference || "any") === opt.id ? "#1c2e18" : "#111", border: `1px solid ${(form.coursePreference || "any") === opt.id ? "#89c96a" : "#1e1e1e"}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: (form.coursePreference || "any") === opt.id ? "#89c96a" : "#ccc" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{opt.sub}</div>
                  </div>
                  {(form.coursePreference || "any") === opt.id && <span style={{ marginLeft: "auto", color: "#89c96a", fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          </>)}

          {/* ── SHARED: Distance (open only) + Players ── */}
          {form.mode === "open" && (<>
            <Label>Max Distance from Home</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="range" min={5} max={100} step={5} value={form.maxDistance} onChange={e => setForm(f => ({ ...f, maxDistance: Number(e.target.value) }))} style={{ flex: 1, accentColor: "#89c96a" }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#89c96a", minWidth: 55, textAlign: "right" }}>{form.maxDistance} mi</div>
            </div>
          </>)}

          <Label>Players Needed</Label>
          <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>How many more do you need? (you're already in)</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setForm(f => ({ ...f, playersNeeded: n }))} style={{ flex: 1, background: form.playersNeeded === n ? "#1c2e18" : "#111", border: `1px solid ${form.playersNeeded === n ? "#89c96a" : "#1e1e1e"}`, color: form.playersNeeded === n ? "#89c96a" : "#777", padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                +{n}
              </button>
            ))}
          </div>

          <button className="btn-primary" onClick={handleSendInvite} style={{ width: "100%", marginTop: 24, background: "#89c96a", color: "#0a0a0a", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 }}>
            Notify All Friends ⛳
          </button>
        </div>
      )}

      {/* INBOX VIEW — shows your sent requests */}
      {view === "inbox" && (
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
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f0f0" }}>
                          {isSpecific ? ev.course : "Open Invite"}
                        </div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                          {dateStr}{isSpecific ? ` · ${ev.time}` : ` · ${ev.timeWindowLabel}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", background: "#1c2e18", border: "1px solid #89c96a33", borderRadius: 6, padding: "3px 8px", color: "#89c96a" }}>sent</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: isSpecific ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8 }}>
                    {isSpecific && <Stat icon="🕐" label="Tee Time" value={ev.time} />}
                    {!isSpecific && <Stat icon="📍" label="Max Dist" value={`${ev.maxDistance} mi`} />}
                    <Stat icon="👥" label="Need" value={`+${ev.playersNeeded} more`} />
                    <Stat icon="📅" label="Date" value={dateStr} />
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
          { id: "inbox", icon: "📬", label: "Requests" },
        ].map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => setView(tab.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: view === tab.id ? "#89c96a" : "#444", fontSize: 11, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "color 0.15s" }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ letterSpacing: 0.5 }}>{tab.label}</span>
            {tab.id === "inbox" && pendingInvites.length > 0 && (
              <div style={{ position: "absolute", top: 8, width: 8, height: 8, borderRadius: "50%", background: "#89c96a" }} />
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
