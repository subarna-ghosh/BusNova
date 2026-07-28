require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const views = require("views");
const ejs = require("ejs");
const db = require("./app/config/db");
const app = express();
db();

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
// Request Logger
app.use(morgan("dev"));
// CORS
app.use(cors());
// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Cookie Parser
app.use(cookieParser());
// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "hellobusnova",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);

// Global Variables for EJS
app.use((req, res, next) => {
  res.locals.errors = {};
  res.locals.old = {};
  next();
});   

// View Engine
app.set("view engine", "ejs");
app.set("views", "views");
// Static Files
app.use(express.static("public"));

// Routes
const api = require("./app/routes");
app.use(api);

// Server
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`server is running on port --> http://localhost:${port}`);
});
