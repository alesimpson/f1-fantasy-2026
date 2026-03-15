// UPDATE this URL after deploying your backend to Render (or wherever)
const backendUrl = "https://f1-fantasy-2026-backend.onrender.com";

// ---------------------------------------------------------------------------
// 1. Register a Team
// ---------------------------------------------------------------------------
function registerTeam() {
  const teamName = document.getElementById("teamNameInput").value.trim();
  if (!teamName) { alert("Please enter a team name."); return; }
  fetch(`${backendUrl}/register_team?team_name=${encodeURIComponent(teamName)}`)
    .then(r => r.json())
    .then(data => {
      if (data.error) alert(data.error);
      else alert(data.message);
      refresh();
    })
    .catch(err => console.error("registerTeam:", err));
}

// ---------------------------------------------------------------------------
// 2. Update Constructors Table
// ---------------------------------------------------------------------------
function updateTeams() {
  fetch(`${backendUrl}/get_registered_teams`)
    .then(r => r.json())
    .then(data => {
      const table = document.getElementById("teamTable");
      table.innerHTML = `<tr><th>Team Name</th><th>Drafted Drivers (${7} max)</th></tr>`;

      let totalTeams = 0;
      let fullTeamsCount = 0;

      for (const [team, drivers] of Object.entries(data.teams)) {
        totalTeams++;
        if (drivers.length === 7) fullTeamsCount++;

        let driverHtml = "<ol style='text-align:left;margin:0;padding-left:20px;'>";
        drivers.forEach(d => {
          driverHtml += `<li>${d} <button onclick="undoDraft('${team}','${d}')">Undo</button></li>`;
        });
        driverHtml += "</ol>";
        if (!drivers.length) driverHtml = "None";

        table.innerHTML += `<tr><td>${team}</td><td>${driverHtml}</td></tr>`;
      }

      // Show lock button only when 3 teams each have exactly 7 drivers
      const lockBtn = document.getElementById("lockButton");
      if (lockBtn) {
        lockBtn.style.display = (totalTeams === 3 && fullTeamsCount === 3)
          ? "inline-block" : "none";
      }
    })
    .catch(err => console.error("updateTeams:", err));
}

// ---------------------------------------------------------------------------
// 3. Update Available Drivers Table
// ---------------------------------------------------------------------------
function updateDrivers() {
  fetch(`${backendUrl}/get_available_drivers`)
    .then(r => r.json())
    .then(data => {
      const table = document.getElementById("driverTable");
      table.innerHTML = `<tr><th>Driver</th><th>Draft By</th></tr>`;
      data.drivers.forEach(driver => {
        table.innerHTML += `
          <tr>
            <td>${driver}</td>
            <td>
              <select onchange="draftDriver('${driver}', this.value)">
                <option value="">Select Team...</option>
              </select>
            </td>
          </tr>`;
      });
      populateTeamDropdowns();
    })
    .catch(err => console.error("updateDrivers:", err));
}

// ---------------------------------------------------------------------------
// 4. Populate team dropdowns in driver table
// ---------------------------------------------------------------------------
function populateTeamDropdowns() {
  fetch(`${backendUrl}/get_registered_teams`)
    .then(r => r.json())
    .then(data => {
      const teams = Object.keys(data.teams);
      document.querySelectorAll("#driverTable select").forEach(sel => {
        sel.innerHTML = `<option value="">Select Team...</option>`;
        teams.forEach(t => {
          sel.innerHTML += `<option value="${t}">${t}</option>`;
        });
      });
    })
    .catch(err => console.error("populateTeamDropdowns:", err));
}

// ---------------------------------------------------------------------------
// 5. Draft a driver
// ---------------------------------------------------------------------------
function draftDriver(driverName, teamName) {
  if (!teamName) return;
  fetch(`${backendUrl}/draft_driver?team_name=${encodeURIComponent(teamName)}&driver_name=${encodeURIComponent(driverName)}`, {
    method: "POST"
  })
    .then(r => r.json())
    .then(data => {
      if (data.detail) alert(data.detail);
      else if (data.error) alert(data.error);
      else alert(data.message);
      refresh();
    })
    .catch(err => console.error("draftDriver:", err));
}

// ---------------------------------------------------------------------------
// 6. Undo a draft pick
// ---------------------------------------------------------------------------
function undoDraft(teamName, driverName) {
  fetch(`${backendUrl}/undo_draft?team_name=${encodeURIComponent(teamName)}&driver_name=${encodeURIComponent(driverName)}`, {
    method: "POST"
  })
    .then(r => r.json())
    .then(data => {
      if (data.detail) alert(data.detail);
      else if (data.error) alert(data.error);
      else alert(data.message);
      refresh();
    })
    .catch(err => console.error("undoDraft:", err));
}

// ---------------------------------------------------------------------------
// 7. Reset all teams
// ---------------------------------------------------------------------------
function resetTeams() {
  if (!confirm("Reset all teams? This cannot be undone.")) return;
  fetch(`${backendUrl}/reset_teams`, { method: "POST" })
    .then(r => r.json())
    .then(data => { alert(data.message); refresh(); })
    .catch(err => console.error("resetTeams:", err));
}

// ---------------------------------------------------------------------------
// 8. Lock teams and start season
// ---------------------------------------------------------------------------
function lockTeams() {
  fetch(`${backendUrl}/lock_teams`, { method: "POST" })
    .then(r => r.json())
    .then(data => {
      if (data.detail) alert(data.detail);
      else if (data.error) alert(data.error);
      else {
        alert(data.message);
        if (data.season_id) {
          window.location.href = `season.html?season_id=${data.season_id}`;
        }
      }
    })
    .catch(err => console.error("lockTeams:", err));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function refresh() {
  updateTeams();
  updateDrivers();
}

// Initial load
refresh();
