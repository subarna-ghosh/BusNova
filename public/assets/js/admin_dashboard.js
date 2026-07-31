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
function buildSeatEditor() {
  const grid = document.getElementById("seatEditorGrid");
  if (!grid) return;
  const layout = ["A", "B", "", "C", "D"];
  const premiumSeats = new Set(["1A", "1B", "1C", "1D"]);
  for (let r = 1; r <= 5; r++) {
    layout.forEach((col) => {
      const cell = document.createElement("div");
      if (col === "") {
        cell.className = "seat-cell gap";
        grid.appendChild(cell);
        return;
      }
      const id = `${r}${col}`;
      cell.className = "seat-cell" + (premiumSeats.has(id) ? " premium" : "");
      cell.textContent = id;
      cell.addEventListener("click", () => cell.classList.toggle("premium"));
      grid.appendChild(cell);
    });
  }
}

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
