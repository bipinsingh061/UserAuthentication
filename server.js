const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const sessions = require("client-sessions");
const bcrypt = require("bcryptjs");

// put in your mongodb uri string below in connect "" , I have removed mine for security
mongoose
  .connect("", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(console.log("monngo connected"));

// Models

let User = mongoose.model(
  "User",
  new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  })
);

let Post = mongoose.model(
  "Post",
  new mongoose.Schema({
    email: { type: String, required: true },
    status: { type: String, required: true },
  })
);

let app = express();

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.use(
  sessions({
    cookieName: "session",
    secret: "dsdsd54s54dsdsd545sd",
    duration: 30 * 60 * 1000,
  })
);

app.post("/logout", (req, res) => {
  console.log("wants to logout");
  res.clearCookie("session");
  res.redirect("/dashboard");
});

app.use((req, res, next) => {
  if (!(req.session && req.session.userId)) {
    return next();
  }
  User.findById(req.session.userId, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next();
    }
    user.password = undefined;
    req.user = user;
    res.locals.user = user;
    next();
  });
});

function loginRequired(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}

app.set("view engine", "pug");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/dashboard", loginRequired, async (req, res) => {
  const posts = await Post.find({});

  res.render("dashboard", { name: res.locals.user.firstName, posts: posts });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  console.log(req.body.password);
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err || !user || !bcrypt.compareSync(req.body.password, user.password)) {
      return res.render("login", {
        error: "Incorrect email/password",
      });
    }
    req.session.userId = user._id;
    res.redirect("dashboard");
  });
});

app.post("/dashboard", loginRequired, (req, res) => {
  let post = new Post({
    email: res.locals.user.email,
    status: req.body.status,
  });
  console.log(res.locals.user.email);
  console.log(req.body.status);

  post.save((err) => {
    if (err) {
      console.log("something went wrong");
      console.log(err);
      let error = "Something bad happend try again";
      return res.render("dashboard");
    }
    res.redirect("/dashboard");
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  console.log("before password ", req.body.password);
  let hash = bcrypt.hashSync(req.body.password, 14);

  req.body.password = hash;
  console.log("after password ", req.body.password);
  console.log("hash ", req.body.password);

  let user = new User(req.body);

  user.save((err) => {
    if (err) {
      let error = "Something bad happend try again";
      if (err.code === 11000) {
        error = "That email is already taken please try another";
        console.log("email Error");
      }
      console.log("something bad");
      return res.render("register", { error: error });
    }
    res.redirect("/dashboard");
  });
});

app.listen(3000);
