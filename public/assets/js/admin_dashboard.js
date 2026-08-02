// ---------- Sidebar toggle (mobile) ----------
const sidebar = document.getElementById("adminSidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarClose = document.getElementById("sidebarClose");

function openSidebar() {
  sidebar.classList.add("open");
  backdrop.classList.add("show");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("show");
}
sidebarToggle && sidebarToggle.addEventListener("click", openSidebar);
sidebarClose && sidebarClose.addEventListener("click", closeSidebar);
backdrop && backdrop.addEventListener("click", closeSidebar);

// ---------- Charts (only run if the canvas exists on this page) ----------
const orange = "#ff9e2c";
const ink = "#171310";
const muted = "#726a5c";
const gridColor = "rgba(23,19,16,0.08)";

function initCharts() {
  if (typeof Chart === "undefined") return; // Chart.js only loaded on dashboard.html / reports.html

  Chart.defaults.font.family = "Poppins, sans-serif";
  Chart.defaults.color = muted;

  const revenueCtx = document.getElementById("revenueChart");
  if (revenueCtx) {
    new Chart(revenueCtx, {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Bookings",
            data: [180, 220, 190, 260, 300, 340, 290],
            backgroundColor: orange,
            borderRadius: 6,
            order: 2,
          },
          {
            label: "Revenue (₹k)",
            data: [120, 150, 140, 190, 210, 260, 230],
            type: "line",
            borderColor: ink,
            backgroundColor: ink,
            tension: 0.35,
            order: 1,
            yAxisID: "y1",
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, usePointStyle: true },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, beginAtZero: true },
          y1: {
            position: "right",
            grid: { display: false },
            beginAtZero: true,
          },
        },
      },
    });
  }

  const occCtx = document.getElementById("occupancyChart");
  if (occCtx) {
    new Chart(occCtx, {
      type: "doughnut",
      data: {
        labels: ["Kolkata–Digha", "Kolkata–Puri", "B'lore–Hyd", "Others"],
        datasets: [
          {
            data: [34, 28, 22, 16],
            backgroundColor: [orange, "#e8850d", ink, "#c9c1ae"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 11 } },
          },
        },
        cutout: "65%",
      },
    });
  }

  const repRevCtx = document.getElementById("reportRevenueChart");
  if (repRevCtx) {
    new Chart(repRevCtx, {
      type: "line",
      data: {
        labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        datasets: [
          {
            label: "Revenue (₹L)",
            data: [9.2, 10.4, 11.1, 13.6, 15.2, 18.6],
            borderColor: orange,
            backgroundColor: "rgba(255,158,44,0.15)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, beginAtZero: true },
        },
      },
    });
  }

  const repRouteCtx = document.getElementById("reportRouteChart");
  if (repRouteCtx) {
    new Chart(repRouteCtx, {
      type: "bar",
      data: {
        labels: [
          "Kolkata–Digha",
          "Kolkata–Puri",
          "B'lore–Hyd",
          "Kolkata–Siliguri",
        ],
        datasets: [
          {
            data: [420, 360, 280, 190],
            backgroundColor: [orange, "#e8850d", ink, "#c9c1ae"],
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, beginAtZero: true },
          y: { grid: { display: false } },
        },
      },
    });
  }
}

// driver image preview on file select (only present on drivers.html)
function previewDriverImage(event) {
  const input = event.target;
  const previewImg = document.getElementById("driverAvatarPreview");
  const placeholder = document.getElementById("avatarPlaceholder");

  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewImg.classList.remove("d-none"); // Show uploaded image
      placeholder.classList.add("d-none"); // Hide default icon/placeholder
    };

    reader.readAsDataURL(input.files[0]);
  }
}

// ---------- Seat layout editor (only present on seats.html) ----------
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("seatEditorGrid");
  const rowInput = document.getElementById("rowCountInput");
  const layoutSelect = document.getElementById("layoutTypeSelect");
  const form = document.getElementById("seatLayoutForm");
  const seatsDataInput = document.getElementById("seatsDataInput");

  // In-memory array of seat objects generated for the grid
  let seatMap = [];

  // Map layout configs to column patterns
  // '2x2' = [A, B, AISLE, C, D] (5 total columns)
  // '2x1' = [A, B, AISLE, C]    (4 total columns)
  const layoutConfigs = {
    "2x2": ["A", "B", "", "C", "D"],
    "2x1": ["A", "B", "", "C"],
    sleeper: ["L1", "L2", "", "U1"],
  };

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = "";
    seatMap = [];

    const rows = parseInt(rowInput.value) || 5;
    const selectedLayout = layoutSelect.value;
    const columnsPattern =
      layoutConfigs[selectedLayout] || layoutConfigs["2x2"];

    // Set CSS grid template columns dynamically
    grid.style.gridTemplateColumns = `repeat(${columnsPattern.length}, minmax(40px, 1fr))`;

    for (let r = 1; r <= rows; r++) {
      columnsPattern.forEach((colCode, colIdx) => {
        const cell = document.createElement("div");

        // If pattern indicates an aisle gap
        if (colCode === "") {
          cell.className = "seat-cell gap";
          grid.appendChild(cell);
          // Store aisle representation for schema logic
          seatMap.push({
            seatNumber: `GAP_${r}_${colIdx + 1}`,
            row: r,
            column: colIdx + 1,
            deck: "lower",
            seatType: selectedLayout === "sleeper" ? "sleeper" : "seater",
            isPremium: false,
            isAisle: true,
          });
          return;
        }

        const seatId = `${r}${colCode}`;
        cell.className = "seat-cell";
        cell.textContent = seatId;

        const seatObj = {
          seatNumber: seatId,
          row: r,
          column: colIdx + 1,
          deck: selectedLayout === "sleeper" ? "lower" : "lower",
          seatType: selectedLayout === "sleeper" ? "sleeper" : "seater",
          isPremium: false,
          isAisle: false,
        };

        // Interactive State Handler: Regular -> Premium -> Aisle -> Regular
        cell.addEventListener("click", () => {
          if (!seatObj.isPremium && !seatObj.isAisle) {
            // --- STATE 1: Make Premium ---
            seatObj.isPremium = true;
            seatObj.isAisle = false;
            cell.classList.remove("gap");
            cell.classList.add("premium");
            cell.textContent = seatId;
          } else if (seatObj.isPremium) {
            // --- STATE 2: Make Aisle / Empty Gap ---
            seatObj.isPremium = false;
            seatObj.isAisle = true;
            cell.classList.remove("premium");
            cell.classList.add("gap");
            cell.textContent = ""; // Hide label for empty aisle
          } else {
            // --- STATE 3: Reset Back to Regular Seat ---
            seatObj.isPremium = false;
            seatObj.isAisle = false;
            cell.classList.remove("premium", "gap"); // <-- REMOVE BOTH CLASSES!
            cell.textContent = seatId; // Restore seat number label
          }
        });

        seatMap.push(seatObj);
        grid.appendChild(cell);
      });
    }
  }

  // Re-render when layout parameters are modified
  rowInput.addEventListener("input", renderGrid);
  layoutSelect.addEventListener("change", renderGrid);

  // Serialize grid state to JSON for Mongoose backend ingestion
  form.addEventListener("submit", (e) => {
    const layout = layoutSelect.value;
    const pattern = layoutConfigs[layout];

    // Filter out non-essential gap objects if you only want active seats in the seats array
    const activeSeats = seatMap.filter((s) => !s.seatNumber.startsWith("GAP_"));

    seatsDataInput.value = JSON.stringify(activeSeats);
  });

  // Initial Boot Render
  renderGrid();
});

// ---------- Example: load Bus Management table data (only on buses.html) ----------
// Replace the mock array + setTimeout below with a real fetch() call to your
// backend, e.g.:
//   const res = await fetch('/api/buses');
//   const buses = await res.json();
async function loadBuses() {
  const tbody = document.getElementById("busesTableBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-3">Loading buses…</td></tr>`;

  const buses = await new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          {
            number: "BN-04 NV",
            type: "Sleeper A/C",
            capacity: 32,
            wifi: true,
            charging: true,
            status: "Active",
          },
          {
            number: "BN-11 NV",
            type: "2×2 Push-back",
            capacity: 44,
            wifi: true,
            charging: false,
            status: "Active",
          },
          {
            number: "BN-22 NV",
            type: "Sleeper A/C",
            capacity: 30,
            wifi: true,
            charging: true,
            status: "Maintenance",
          },
          {
            number: "BN-07 NV",
            type: "2×1 Semi-sleeper",
            capacity: 36,
            wifi: false,
            charging: true,
            status: "Inactive",
          },
        ]),
      300,
    ),
  );

  const statusBadge = (s) =>
    ({
      Active: "badge-success",
      Maintenance: "badge-warning",
      Inactive: "badge-muted",
    })[s] || "badge-muted";

  tbody.innerHTML = buses
    .map(
      (bus) => `
    <tr>
      <td class="mono">${bus.number}</td>
      <td>${bus.type}</td>
      <td>${bus.capacity}</td>
      <td>${bus.wifi ? '<i class="bi bi-wifi me-1"></i>' : ""}${bus.charging ? '<i class="bi bi-plug"></i>' : ""}</td>
      <td><span class="badge ${statusBadge(bus.status)}">${bus.status}</span></td>
      <td><button class="icon-btn-sm"><i class="bi bi-pencil"></i></button></td>
    </tr>
  `,
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  buildSeatEditor();
  loadBuses();
});
