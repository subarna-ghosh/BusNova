const transporter = require("../config/emailConfig");

const sendEmail = async (req, user) => {
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Your Account Credentials",
    html: `
        <p>Hello ${user.name},</p>
        <p>Your account has been created successfully.</p>
        <p>Login Details:</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Password:</strong> ${req.body.password}</p>
        <p>
          Login URL:
          <a href="http://localhost:3000/web/auth/view/login">
            http://localhost:3000/web/auth/view/login
          </a>
        </p>
        <p>Please login and update your password immediately for security purposes.</p>
        <p>Thank You,</p>
        <p>Admin Team</p>
      `,
  });
};

module.exports = sendEmail;
