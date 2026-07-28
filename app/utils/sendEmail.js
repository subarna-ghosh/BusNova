const transporter = require("../config/emailConfig");
const EmailVerification = require("../models/Otp");
const logger = require("../utils/logger");

const sendEmail = async (user) => {
  try {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete Previous OTP
    await EmailVerification.deleteMany({
      userId: user._id,
    });

    // Save OTP
    await EmailVerification.create({
      userId: user._id,
      otp,
    });

    // Send Mail
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Verify Your BusNova Account",

      html: `
        <div style="font-family:Arial,sans-serif">

          <h2>Welcome to BusNova</h2>

          <p>Hello <strong>${user.name}</strong>,</p>

          <p>
            Thank you for registering with BusNova.
          </p>

          <p>
            Please verify your email using the OTP below.
          </p>

          <h1
            style="
              color:#0d6efd;
              letter-spacing:8px;
            "
          >
            ${otp}
          </h1>

          <p>
            This OTP will expire in
            <strong>15 minutes</strong>.
          </p>

          <p>
            If you didn't create this account,
            simply ignore this email.
          </p>

          <br>

          <p>Regards,</p>

          <strong>BusNova Team</strong>

        </div>
      `,
    });

    logger.info(`Verification email sent to ${user.email}`);
  } catch (error) {
    // Remove OTP if email sending failed
    await EmailVerification.deleteMany({
      userId: user._id,
    });

    logger.error(`Email sending failed: ${error.message}`);

    throw error;
  }
};

module.exports = sendEmail;
