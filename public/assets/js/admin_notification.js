document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin notification JS loaded");

  const socket = io();

  const notificationMenu = document.getElementById("notificationMenu");

  const notificationDot = document.getElementById("notificationDot");

  socket.on("connect", () => {
    console.log("Admin socket connected:", socket.id);

    socket.emit("joinRoleRoom", "Admin");
  });

  socket.on("connect_error", (error) => {
    console.error("Admin socket error:", error);
  });

  socket.on("newAdminNotification", (notification) => {
    console.log("Admin notification received:", notification);

    addNotification(notification);

    if (notificationDot) {
      notificationDot.style.display = "block";
    }
  });

  function addNotification(notification) {
    if (!notificationMenu) return;

    const emptyNotification =
      notificationMenu.querySelector(".no-notification");

    if (emptyNotification) {
      emptyNotification.remove();
    }

    const item = document.createElement("li");

    item.className = "notif-item";

    item.innerHTML = `
      <i class="bi bi-bell text-brand"></i>

      <div>
        <strong>
          ${escapeHtml(notification.title)}
        </strong>

        <span>
          ${escapeHtml(notification.message)}
        </span>
      </div>
    `;

    notificationMenu.prepend(item);
  }

  function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent = value || "";

    return div.innerHTML;
  }
});
