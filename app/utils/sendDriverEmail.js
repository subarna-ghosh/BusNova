const transporter = require("../config/emailConfig");
const logger = require("../utils/logger");

const sendDriverEmail = async (user, plainPassword) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Your BusNova Driver Account Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #0d6efd;">Welcome to BusNova</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>An administrator has registered your driver account. You can now log into the driver portal using the credentials below:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login Email:</strong> ${user.email}</p>
            <a href="http://localhost:3000/web/auth/view/login" style="display: inline-block; margin: 10px 0; padding: 10px 20px; background-color: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 4px;">Driver Login</a>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; color: #d63384;">${plainPassword}</code></p>
          </div>

          <p>Please log in and update your password immediately after your first sign-in.</p>
          <br>
          <p>Regards,</p>
          <strong>BusNova Team</strong>
        </div>
      `,
    });

    logger.info(`Credentials email successfully dispatched to ${user.email}`);
  } catch (error) {
    logger.error(`Email delivery failed: ${error.message}`);
    throw error;
  }
};

module.exports = sendDriverEmail;
