document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const togglePasswordBtn = document.getElementById("toggleLoginPassword");
  const errorAlert = document.getElementById("loginError");
  const errorText = document.getElementById("loginErrorText");
  const submitBtn = document.getElementById("loginSubmitBtn");

  // 1. Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      const icon = togglePasswordBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-eye");
        icon.classList.toggle("bi-eye-slash");
      }
    });
  }

  // Helper Function to Show Errors
  function showError(message) {
    errorText.textContent = message;
    errorAlert.classList.remove("d-none");
  }

  // Helper Function to Hide Errors
  function hideError() {
    errorAlert.classList.add("d-none");
  }

  // 2. Form Submission Handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = document.getElementById("rememberMe")?.checked || false;

    // Client-side Validation
    if (!email || !password) {
      showError("Please enter both email and password.");
      return;
    }

    if (password.length < 8) {
      showError("Password must be at least 8 characters long.");
      return;
    }

    // UI Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Signing in...
    `;

    try {
      // 3. Send Credentials to Backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password.");
      }

      // 4. Role-based Dashboard Redirection
      const userRole = data.user?.role?.toLowerCase();

      switch (userRole) {
        case "admin":
          window.location.href = "/admin/dashboard.html";
          break;
        case "driver":
          window.location.href = "/driver/portal.html";
          break;
        case "staff":
          window.location.href = "/staff/counter.html";
          break;
        case "customer":
        default:
          window.location.href = "/index.html";
          break;
      }
    } catch (err) {
      showError(err.message || "An error occurred. Please try again.");
    } finally {
      // Reset Button State
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
});
