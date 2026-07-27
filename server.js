require("dotenv").config();
const express = require("express");
const app = express();
const db = require("./app/config/db");
const views = require("views");
const ejs = require("ejs");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");

db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static("public"));

app.use(cookieParser());
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

const api = require("./app/routes");
app.use(api);


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`server is running on port --> http://localhost:${port}`);
});
