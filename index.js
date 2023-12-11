const express = require("express"); //call the express module into app

let app = express(); //server website, listen and have routes

let path = require("path"); //makes it easier to call files

const port = process.env.PORT || 3000; //Where the server is listening on.

app.set("view engine", "ejs"); //using ejs for our files.

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting up express-session middleware
const session = require("express-session");
app.use(
  session({
    secret: "section2team8", // Use a long, random string in production
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: false }, // Set to true if using https
  })
);

// Static files middleware setup
app.use(express.static("public"));

const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DB_NAME,
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB ? { rejectUnauthorized: false } : false,
  }, //a dictionary (keys and values)
}); //parameters go in the ({})

// Handling GET request for the landing page
app.get("/", (req, res) => {
  res.render("index"); // Render the index.ejs file
});

// Handling GET request for the add page
app.get("/add", (req, res) => {
  // Check if the user is logged in
  if (req.session.loggedIn) {
    res.render("add"); // Render the add.ejs file if logged in
  } else {
    // Send an alert message and then redirect to the account page
    res.send(`<script>alert("Please login to add an activity idea"); window.location.href = "/account"; </script>`);
  }
});


app.get("/filter", (req, res) => {
  knex
    .select()
    .from("activity")
    .then((activity) => {
      res.render("filter", { myactivity: activity });
    });
});

// Handling POST request for adding users to the data table
app.post("/storeLogin", (req, res) => {
  // Extracting data from the request body
  const { username, password } = req.body;

  // Inserting user data into the login table
  knex("login")
    .insert({
      username: username,
      password: password,
    })
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => {
      console.error(err);
      // Handling the case where the username already exists
      res.send(
        '<script>alert("Username already exists. Please choose another one to continue!"); window.location.href = "/create"; </script>'
      );
    });
})

// Handling GET request for the create account page
app.get("/create", (req, res) => {
  res.render("create"); // Render the create.ejs file
});


// Handling POST request for searching the table for matches
app.post("/findLogin", async (req, res) => {
  // Extracting data from the request body
  const { username, password } = req.body;

  console.log("Received body:", req.body);
  console.log("Extracted username:", username);
  console.log("Extracted password:", password);

  try {
    // Searching for a user in the login table
    const user = await knex
      .select("*")
      .from("login")
      .where({
        username: username,
        password: password,
      })
      .first();

    if (user) {
      // Setting session variables for a logged-in user
      req.session.userInfo = user;
      req.session.loggedIn = true;
      // Redirecting with a success message
      res.send(
        '<script>alert("Your login credentials were validated!"); window.location.href = "/"; </script>'
      );
    } else {
      // Redirecting with an error message for invalid credentials
      res.send(
        '<script>alert("Login Credentials Invalid!"); window.location.href = "/account"; </script>'
      );
    }
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).send("An error occurred during login.");
  }
});

// Handling GET request for the login page
app.get("/account", (req, res) => {
  // Checking if the user is logged in
  const isLoggedIn = req.session.loggedIn || false;
  // Rendering the login page and passing the logged-in status to the EJS template
  res.render("account", { isLoggedIn: isLoggedIn });
});

// Handling GET request for editing login information
app.get("/editLogin", (req, res) => {
  console.log("------Testing------");

  // Ensure req.session.userInfo is defined
  if (!req.session.userInfo) {
    // Redirect to the login page if userinfo is not defined
    res.redirect("/login");
    return;
  }

  console.log(req.session.userInfo.username);
  console.log(req.session.userInfo.password);
  // Render the editLogin page and pass userinfo to the template
  res.render("editLogin", { userinfo: req.session.userInfo });
});

// Handling POST request for editing login information
app.post("/editLogin", (req, res) => {
  const { username, password } = req.body;

  // Updating login information in the login table
  knex("login")
    .where("username", req.session.userInfo.username)
    .update({
      username: username,
      password: password,
    })
    .then(() => {
      // Update the session with the new username if it was changed
      if (username !== req.session.userInfo.username) {
        req.session.userInfo.username = username;
      }

      res.redirect("/");
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.listen(port, () => console.log("Server is Listening")); //last line!!
