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
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family = "Poppins, sans-serif";
  Chart.defaults.color = muted;

  // =========================================
  // REVENUE / BOOKINGS CHART
  // =========================================

  const revenueChartElement = document.getElementById("revenueChart");
  const revenueDataElement = document.getElementById("revenueChartData");

  if (revenueChartElement && revenueDataElement) {
    let revenueChartData = [];

    // -----------------------------------------
    // Get data sent from EJS
    // -----------------------------------------

    try {
      revenueChartData = JSON.parse(revenueDataElement.dataset.revenue || "[]");
    } catch (error) {
      console.error("Error parsing revenue chart data:", error);
    }

    // -----------------------------------------
    // Prepare chart data
    // -----------------------------------------

    const labels = revenueChartData.map((item) => {
      const date = new Date(item._id);

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    });

    const bookings = revenueChartData.map((item) => item.bookings || 0);

    const capturedAmount = revenueChartData.map(
      (item) => item.capturedAmount || 0,
    );

    const refundedAmount = revenueChartData.map(
      (item) => item.refundedAmount || 0,
    );
    const netRevenue = revenueChartData.map((item) => item.netRevenue || 0);

    // -----------------------------------------
    // Create Chart
    // -----------------------------------------

    new Chart(revenueChartElement, {
      data: {
        labels: labels,
        datasets: [
          // Bookings
          {
            type: "bar",
            label: "Bookings",
            data: bookings,
            backgroundColor: orange,
            borderRadius: 6,
            yAxisID: "y",
            order: 2,
          },

          // Net Revenue
          {
            type: "line",
            label: "Net Revenue",
            data: netRevenue,
            borderColor: ink,
            backgroundColor: ink,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: "y1",
            order: 1,
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: "index",
          intersect: false,
        },

        plugins: {
          legend: {
            position: "bottom",

            labels: {
              boxWidth: 10,
              usePointStyle: true,
            },
          },

          tooltip: {
            callbacks: {
              label: function (context) {
                const index = context.dataIndex;

                if (context.dataset.label === "Bookings") {
                  return `Bookings: ${bookings[index]}`;
                }

                if (context.dataset.label === "Net Revenue") {
                  return `Net Revenue: ₹${Number(
                    netRevenue[index],
                  ).toLocaleString("en-IN")}`;
                }
              },

              afterBody: function (tooltipItems) {
                const index = tooltipItems[0].dataIndex;

                return [
                  `Captured: ₹${Number(capturedAmount[index]).toLocaleString(
                    "en-IN",
                  )}`,

                  `Refunded: ₹${Number(refundedAmount[index]).toLocaleString(
                    "en-IN",
                  )}`,
                ];
              },
            },
          },
        },

        scales: {
          // -----------------------------------
          // Bookings axis
          // -----------------------------------

          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            title: {
              display: true,
              text: "Bookings",
            },
          },

          // -----------------------------------
          // Revenue axis
          // -----------------------------------

          y1: {
            position: "right",
            beginAtZero: true,
            grid: {
              display: false,
            },
            title: {
              display: true,
              text: "Revenue (₹)",
            },
          },

          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // =========================================
  // OCCUPANCY BY ROUTE
  // =========================================

  const occCtx = document.getElementById("occupancyChart");
  const occupancyDataElement = document.getElementById("occupancyChartData");

  if (occCtx && occupancyDataElement) {
    let occupancyChartData = [];

    // -----------------------------------------
    // Parse EJS data
    // -----------------------------------------

    try {
      occupancyChartData = JSON.parse(
        occupancyDataElement.dataset.occupancy || "[]",
      );
    } catch (error) {
      console.error("Error parsing occupancy chart data:", error);
    }

    // -----------------------------------------
    // Prepare labels
    // -----------------------------------------

    const labels = occupancyChartData.map((item) => item.route);

    // -----------------------------------------
    // Prepare occupancy values
    // -----------------------------------------

    const occupancyValues = occupancyChartData.map(
      (item) => item.occupancy || 0,
    );

    // -----------------------------------------
    // Create doughnut chart
    // -----------------------------------------

    new Chart(occCtx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: occupancyValues,
            backgroundColor: [orange, "#e8850d", ink, "#c9c1ae", "#8c8372"],
            borderWidth: 0,
          },
        ],
      },

      options: {
        responsive: true,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              font: {
                size: 11,
              },
            },
          },

          tooltip: {
            callbacks: {
              label: function (context) {
                const item = occupancyChartData[context.dataIndex];
                return [
                  `${item.route}: ${item.occupancy}%`,
                  `Booked: ${item.bookedSeats}`,
                  `Available: ${item.availableSeats}`,
                ];
              },
            },
          },
        },
      },
    });
  }

  const reportRevenueCtx = document.getElementById("reportRevenueChart");
  const reportRevenueDataElement = document.getElementById(
    "reportRevenueChartData",
  );

  if (reportRevenueCtx && reportRevenueDataElement) {
    const revenueData = JSON.parse(
      reportRevenueDataElement.dataset.revenue || "[]",
    );

    console.log("Monthly Revenue Data:", revenueData);

    const labels = revenueData.map((item) => item.label);

    const revenues = revenueData.map((item) => Number(item.revenue || 0));

    new Chart(reportRevenueCtx, {
      type: "line",

      data: {
        labels: labels,

        datasets: [
          {
            label: "Net Revenue",

            data: revenues,

            borderColor: orange,

            backgroundColor: "rgba(255, 158, 44, 0.15)",

            fill: true,

            tension: 0.35,

            pointRadius: 4,

            pointHoverRadius: 6,
          },
        ],
      },

      options: {
        responsive: true,

        interaction: {
          mode: "index",
          intersect: false,
        },

        plugins: {
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  "Net Revenue: ₹" + Number(context.raw).toLocaleString("en-IN")
                );
              },
            },
          },
        },

        scales: {
          x: {
            grid: {
              display: false,
            },
          },

          y: {
            beginAtZero: true,

            grid: {
              color: gridColor,
            },

            ticks: {
              callback: function (value) {
                return "₹" + (Number(value) / 100000).toFixed(1) + "L";
              },
            },
          },
        },
      },
    });
  }

  const repRouteCtx = document.getElementById("reportRouteChart");

  const routeDataElement = document.getElementById("reportRouteChartData");

  if (repRouteCtx && routeDataElement) {
    const routeData = JSON.parse(routeDataElement.dataset.routes || "[]");

    console.log("Chart Route Data:", routeData);

    const labels = routeData.map((item) => item.route);

    const passengerCounts = routeData.map((item) =>
      Number(item.passengers || 0),
    );

    new Chart(repRouteCtx, {
      type: "bar",

      data: {
        labels: labels,

        datasets: [
          {
            label: "Passengers",

            data: passengerCounts,

            backgroundColor: [orange, "#e8850d", ink, "#c9c1ae", "#77716a"],

            borderRadius: 6,
          },
        ],
      },

      options: {
        indexAxis: "y",

        responsive: true,

        plugins: {
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: function (context) {
                const index = context.dataIndex;

                const item = routeData[index];

                return [
                  `Passengers: ${item.passengers}`,
                  `Bookings: ${item.bookingCount}`,
                ];
              },
            },
          },
        },

        scales: {
          x: {
            beginAtZero: true,

            grid: {
              color: gridColor,
            },

            ticks: {
              precision: 0,
            },
          },

          y: {
            grid: {
              display: false,
            },
          },
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
