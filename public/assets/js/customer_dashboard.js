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

  /* ---------------- Profile edit toggle (profile.html only) ---------------- */
  const editBtn = document.getElementById("editProfileBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const profileForm = document.getElementById("profileForm");
  const saveRow = document.getElementById("profileSaveRow");

  function setProfileEditable(editable) {
    if (!profileForm) return;
    profileForm.querySelectorAll("input, select, textarea").forEach((el) => {
      el.disabled = !editable;
    });
    saveRow.classList.toggle("d-none", !editable);
    if (editBtn) editBtn.classList.toggle("d-none", editable);
  }

  editBtn && editBtn.addEventListener("click", () => setProfileEditable(true));
  cancelBtn &&
    cancelBtn.addEventListener("click", () => setProfileEditable(false));
  profileForm &&
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      setProfileEditable(false);
    });

  /* ---------------- Booking history filter pills (bookings.html only) ---------------- */
  const filterPills = document.querySelectorAll(
    "#bookingFilterPills .nav-link",
  );
  const bookingRows = document.querySelectorAll("#bookingHistoryBody tr");

  filterPills.forEach((pill) => {
    pill.addEventListener("click", (e) => {
      e.preventDefault();
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      const filter = pill.dataset.filter;
      bookingRows.forEach((row) => {
        row.style.display =
          filter === "all" || row.dataset.status === filter ? "" : "none";
      });
    });
  });

  /* ---------------- Cancel upcoming trip (upcoming.html only) ---------------- */
  document.querySelectorAll(".cancel-trip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest("li");
      if (confirm("Cancel this trip? This can't be undone.")) {
        item.remove();
      }
    });
  });

  /* ---------------- Remove favorite route (favorites.html only) ---------------- */
  document.querySelectorAll(".route-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".col-md-6");
      card && card.remove();
    });
  });

  /* ---------------- Remove saved passenger (passengers.html only) ---------------- */
  document.querySelectorAll(".remove-passenger-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".col-md-6");
      if (card && confirm("Remove this saved passenger?")) {
        card.remove();
      }
    });
  });

  /* ---------------- Add passenger (passengers.html only, front-end demo) ---------------- */
  const addPassengerForm = document.getElementById("addPassengerForm");
  addPassengerForm &&
    addPassengerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const modalEl = document.getElementById("addPassengerModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal && modal.hide();
      addPassengerForm.reset();
    });
});
