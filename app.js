if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");

// sqlインジェクション対策のpackage
const mongoSanitize = require('express-mongo-sanitize');

//route
const campgroundRoutes = require("./routes/campgrounds");
const reviewRoutes = require("./routes/reviews");
const userRoutes = require("./routes/users");
// httpヘッダーにセキュリティ対策
const { default: helmet } = require("helmet");

// session Store用
const mongoStore = require('connect-mongo');
const MongoStore = require("connect-mongo");

//DB connection
const dbUrl = "mongodb://localhost:27017/yelp-camp"
mongoose
  .connect(dbUrl, {
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

const app = express();

// view engine setting
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// request parse
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

//static file setting
app.use(express.static(path.join(__dirname, "public")));

// session
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypt: {
    secret: 'mysecret'
  },
  touchAfter: 24 * 3600
})

store.on('error', e => console.log('セッションストアエラー'))

const sessionConfig = {
  store: store,
  name: 'session', //sessionのdefaultの名前を変える（未指定だとpassportの場合はconnect_sid）
  secret: "mysecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    //secure: true, //sessionのやりとりをhttpsでのみ許可（localhostでログインできなくなるためコメントアウト）
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));

// passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// // flash
app.use(flash());

// app.use(helmet());

// 毎回のリクエストで処理
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

//sqlインジェクション対策 クエリパラメータをサニタイズ
app.use(mongoSanitize());

app.get("/", (req, res) => {
  res.render("home");
});

//route
app.use("/", userRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

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
