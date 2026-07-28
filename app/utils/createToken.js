const jwt = require("jsonwebtoken");

const createAccessToken = (user) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET_KEY,
    {
      expiresIn: "15m",
    },
  );
  return accessToken;
};

const createRefreshToken = (user) => {
  const refreshToken = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET_KEY,
    {
      expiresIn: "7d",
    },
  );
  return refreshToken;
};

module.exports = { createAccessToken, createRefreshToken };
