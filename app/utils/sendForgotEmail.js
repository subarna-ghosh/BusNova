const transporter = require("../config/emailConfig");

const sendForgotPasswordEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return info;
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendForgotPasswordEmail;
