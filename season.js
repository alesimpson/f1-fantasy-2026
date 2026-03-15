// UPDATE this URL after deploying your backend to Render (or wherever)
const backendUrl = "https://f1-fantasy-2026-backend.onrender.com";

// ---------------------------------------------------------------------------
// 2026 race calendar
// ---------------------------------------------------------------------------
const RACE_LIST = [
  "Australia", "China",    "Japan",       "Bahrain",   "Saudi Arabia", "Miami",
  "Canada",    "Monaco",   "Barcelona",   "Austria",   "UK",           "Belgium",
  "Hungary",   "Netherlands", "Monza",    "Madrid",    "Azerbaijan",   "Singapore",
  "Texas",     "Mexico",   "Brazil",      "Vegas",     "Qatar",        "Abu Dhabi",
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentSeasonId = null;
let seasonData      = {};  // { teams, points, race_points, trade_history, free_agents, processed_races }

const COLOR_ARRAY = ["#2ecc71", "#3498db", "#f1c40f", "#e67e22", "#9b59b6"];
let colorMap = {};  // team_name → color

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  currentSeasonId = params.get("season_id");
  if (!currentSeasonId) {
    document.body.innerHTML = "<h2 style='color:red'>No season_id in URL.</h2>";
    return;
  }
  populateRaceDropdown();
  loadData();
});

// ---------------------------------------------------------------------------
// Load all season data and re-render
// ---------------------------------------------------------------------------
function loadData() {
  fetch(`${backendUrl}/get_season?season_id=${encodeURIComponent(currentSeasonId)}`)
    .then(r => r.json())
    .then(data => {
      seasonData = data;

      // Assign colors to teams (stable order)
      const teamNames = Object.keys(data.teams);
      teamNames.forEach((t, i) => {
        if (!colorMap[t]) colorMap[t] = COLOR_ARRAY[i % COLOR_ARRAY.length];
      });

      renderLeaderboard(data.teams, data.points);
      renderLineups(data.teams);
      renderRaceTable(data.teams, data.race_points, data.processed_races);
      renderTradeHistory(data.trade_history);
      renderFreeAgents(data.free_agents);
      populateTradeDropdowns(data.teams);
    })
    .catch(err => console.error("loadData:", err));
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
function renderLeaderboard(teams, points) {
  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
  const table = document.getElementById("leaderboardTable");
  table.innerHTML = `<tr><th>Fantasy Team</th><th>Total Points</th></tr>`;
  sorted.forEach(([team, pts]) => {
    const color = colorMap[team] || "white";
    table.innerHTML += `
      <tr>
        <td style="color:${color};font-weight:bold">${team}</td>
        <td>${pts}</td>
      </tr>`;
  });
}

// ---------------------------------------------------------------------------
// Lineups
// ---------------------------------------------------------------------------
function renderLineups(teams) {
  const container = document.getElementById("lineupContainer");
  container.innerHTML = "";
  for (const [team, drivers] of Object.entries(teams)) {
    const color = colorMap[team] || "white";
    let html = `<h3 style="color:${color}">${team}</h3>`;
    html += `<table style="width:40%;margin:0 auto 20px;"><tr><th>Driver</th></tr>`;
    drivers.forEach(d => {
      html += `<tr><td>${d}</td></tr>`;
    });
    html += "</table>";
    container.innerHTML += html;
  }
}

// ---------------------------------------------------------------------------
// Race-by-Race Table  (rows = drivers, cols = races)
// ---------------------------------------------------------------------------
function renderRaceTable(teams, racePoints, processedRaces) {
  const table = document.getElementById("raceTable");

  // Build driver → team map
  const driverTeam = {};
  for (const [team, drivers] of Object.entries(teams)) {
    drivers.forEach(d => { driverTeam[d] = team; });
  }

  // Header row
  let header = "<tr><th>Driver</th>";
  processedRaces.forEach(r => { header += `<th>${r}</th>`; });
  header += "<th>Total</th></tr>";

  // Driver rows
  let rows = "";
  const allDrivers = Object.keys(driverTeam);
  allDrivers.sort();

  allDrivers.forEach(driver => {
    const team = driverTeam[driver];
    const bgColor = colorMap[team] || "transparent";
    let total = 0;
    let row = `<tr><td style="background:${bgColor};color:#000;font-weight:bold">${driver}</td>`;
    processedRaces.forEach(race => {
      const pts = (racePoints[race] || {})[driver] || 0;
      total += pts;
      row += `<td style="background:${bgColor};color:#000">${pts || ""}</td>`;
    });
    row += `<td style="background:${bgColor};color:#000;font-weight:bold">${total}</td>`;
    row += "</tr>";
    rows += row;
  });

  table.innerHTML = header + rows;
}

// ---------------------------------------------------------------------------
// Trade History
// ---------------------------------------------------------------------------
function renderTradeHistory(history) {
  const container = document.getElementById("tradeHistoryContainer");
  const trades = history.filter(h => h.type === "trade");
  if (!trades.length) {
    container.innerHTML = "<p>No trades yet.</p>";
    return;
  }
  let html = `<table style="width:80%">
    <tr><th>From</th><th>Gave Up</th><th>To</th><th>Got</th><th>Sweetener</th></tr>`;
  trades.forEach(t => {
    const sw = [];
    if (t.sweetener_from) sw.push(`${t.from_team} → ${t.to_team}: ${t.sweetener_from} pts`);
    if (t.sweetener_to)   sw.push(`${t.to_team} → ${t.from_team}: ${t.sweetener_to} pts`);
    html += `
      <tr>
        <td>${t.from_team}</td>
        <td>${t.from_drivers.join(", ")}</td>
        <td>${t.to_team}</td>
        <td>${t.to_drivers.join(", ")}</td>
        <td>${sw.join(" | ") || "—"}</td>
      </tr>`;
  });
  html += "</table>";
  container.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Free Agents
// ---------------------------------------------------------------------------
function renderFreeAgents(freeAgents) {
  const table = document.getElementById("freeAgentsTable");
  table.innerHTML = `<tr><th>Driver</th></tr>`;
  if (!freeAgents.length) {
    table.innerHTML += `<tr><td>None</td></tr>`;
    return;
  }
  freeAgents.forEach(d => {
    table.innerHTML += `<tr><td>${d}</td></tr>`;
  });
}

// ---------------------------------------------------------------------------
// Race dropdown (refresh points)
// ---------------------------------------------------------------------------
function populateRaceDropdown() {
  const sel = document.getElementById("raceSelect");
  sel.innerHTML = `<option value="">Select Race…</option>`;
  RACE_LIST.forEach(r => {
    sel.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

function refreshRacePoints() {
  const race = document.getElementById("raceSelect").value;
  if (!race) { alert("Select a race first."); return; }
  fetch(`${backendUrl}/refresh_race_points?season_id=${encodeURIComponent(currentSeasonId)}&race_name=${encodeURIComponent(race)}`, {
    method: "POST"
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) alert(data.error);
      else alert(data.message);
      loadData();
    })
    .catch(err => console.error("refreshRacePoints:", err));
}

// ---------------------------------------------------------------------------
// Trade UI
// ---------------------------------------------------------------------------
function populateTradeDropdowns(teams) {
  const fromSel = document.getElementById("fromTeamSelect");
  const toSel   = document.getElementById("toTeamSelect");

  const opts = `<option value="">Select Team…</option>` +
    Object.keys(teams).map(t => `<option value="${t}">${t}</option>`).join("");

  fromSel.innerHTML = opts;
  toSel.innerHTML   = opts;
}

function populateFromDrivers() {
  const team = document.getElementById("fromTeamSelect").value;
  const sel  = document.getElementById("fromDriversSelect");
  sel.innerHTML = "";
  if (!team || !seasonData.teams) return;
  (seasonData.teams[team] || []).forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

function populateToDrivers() {
  const team = document.getElementById("toTeamSelect").value;
  const sel  = document.getElementById("toDriversSelect");
  sel.innerHTML = "";
  if (!team || !seasonData.teams) return;
  (seasonData.teams[team] || []).forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

function submitTrade() {
  const fromTeam = document.getElementById("fromTeamSelect").value;
  const toTeam   = document.getElementById("toTeamSelect").value;
  const fromDrivers = Array.from(
    document.getElementById("fromDriversSelect").selectedOptions
  ).map(o => o.value);
  const toDrivers = Array.from(
    document.getElementById("toDriversSelect").selectedOptions
  ).map(o => o.value);
  const sweetenerFrom = parseInt(document.getElementById("sweetenerFrom").value) || 0;
  const sweetenerTo   = parseInt(document.getElementById("sweetenerTo").value)   || 0;

  if (!fromTeam || !toTeam)   { alert("Select both teams.");  return; }
  if (fromTeam === toTeam)    { alert("Can't trade with yourself."); return; }
  if (!fromDrivers.length && !toDrivers.length && !sweetenerFrom && !sweetenerTo) {
    alert("Select at least one driver or sweetener to trade."); return;
  }

  const params = new URLSearchParams({
    season_id:      currentSeasonId,
    from_team:      fromTeam,
    to_team:        toTeam,
    sweetener_from: sweetenerFrom,
    sweetener_to:   sweetenerTo,
  });
  fromDrivers.forEach(d => params.append("from_drivers", d));
  toDrivers.forEach(d   => params.append("to_drivers",   d));

  fetch(`${backendUrl}/propose_trade?${params.toString()}`, { method: "POST" })
    .then(r => r.json())
    .then(data => {
      if (data.error) alert(data.error);
      else alert(data.message);
      loadData();
    })
    .catch(err => console.error("submitTrade:", err));
}
