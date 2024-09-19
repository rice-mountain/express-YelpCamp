const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const Joi = require("joi");
const session = require("express-session");

const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");

const campgroundRoutes = require("./routes/campgrounds");
const reviewRoutes = require("./routes/reviews");
const app = express();

mongoose
  .connect("mongodb://localhost:27017/yelp-camp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("mongoDBコネクションOK");
  })
  .catch((err) => {
    console.log("mongoDBコネクションエラー");
    console.log(err);
  });

app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
//static file setting
app.use(express.static(path.join(__dirname, "public")));

app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

const sessionConfig = {
  secret: "mysecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));

app.get("/", (req, res) => {
  res.render("home");
});

app.all("*", (req, res, next) => {
  next(new ExpressError("page is not found", 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) {
    err.message = "問題が起きました";
  }
  res.status(statusCode).render("error", { err });
});

app.listen(3000, (req, res) => {
  console.log("waiting request at port 3000...");
});
