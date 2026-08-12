document.addEventListener("DOMContentLoaded", () => {
  /* ---------------- Mobile sidebar toggle ---------------- */
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const openBtn = document.getElementById("sidebarToggle");
  const closeBtn = document.getElementById("sidebarClose");

  function openSidebar() {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
  }
  function closeSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  }

  openBtn && openBtn.addEventListener("click", openSidebar);
  closeBtn && closeBtn.addEventListener("click", closeSidebar);
  backdrop && backdrop.addEventListener("click", closeSidebar);

  /* ---------------- Passenger check-in toggle (passenger_list.html only) ---------------- */
  document.querySelectorAll(".passenger-status-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      const badge = btn.querySelector(".badge");
      const isCheckedIn = row.dataset.status === "checked-in";

      if (isCheckedIn) {
        row.dataset.status = "pending";
        badge.className = "badge badge-warning";
        badge.textContent = "Pending";
      } else {
        row.dataset.status = "checked-in";
        badge.className = "badge badge-success";
        badge.textContent = "Checked in";
      }
    });
  });

  /* ---------------- Trip selector (passenger_list.html only, front-end demo) ---------------- */
  const tripSelect = document.getElementById("tripSelect");
  tripSelect &&
    tripSelect.addEventListener("change", () => {
      // Front-end demo only — wire this up to reload/fetch the manifest
      // for the selected trip once the backend endpoint exists.
      console.log("Selected trip:", tripSelect.value);
    });

  /* ---------------- Schedule range filter pills (trip_schedule.html only) ---------------- */
  const filterPills = document.querySelectorAll(
    "#scheduleFilterPills .nav-link",
  );
  filterPills.forEach((pill) => {
    pill.addEventListener("click", (e) => {
      e.preventDefault();
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      // Front-end demo only — the day blocks below are static sample data;
      // wire data-range up to your real schedule query once available.
    });
  });
});
