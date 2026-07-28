document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("loginPassword");
  const togglePasswordBtn = document.getElementById("toggleLoginPassword");

  // Toggle Password Visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = passwordInput.getAttribute("type") === "password";
      passwordInput.setAttribute("type", isPassword ? "text" : "password");

      const icon = togglePasswordBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-eye", !isPassword);
        icon.classList.toggle("bi-eye-slash", isPassword);
      }
    });
  }
});