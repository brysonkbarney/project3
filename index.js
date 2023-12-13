const express = require("express"); //call the express module into app

let app = express(); //server website, listen and have routes

let path = require("path"); //makes it easier to call files

const port = process.env.PORT || 3000; //Where the server is listening on.

app.set("view engine", "ejs"); //using ejs for our files.

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Require multer
const multer = require('multer');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/') // Make sure this path exists and is writable
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })


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
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "carolinetobler",
    password: process.env.RDS_PASSWORD || "P0ftim1225-",
    database: process.env.RDS_DB_NAME || "project3",
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

// Handling POST request for storing activity data
// Route to handle activity data and image upload
app.post("/storeData", upload.single('activityImage'), (req, res) => {
  // Extract data from the request body
  const { 
      activity, 
      description, 
      equipment, 
      equipment_description, 
      price, 
      location, 
      type, 
      duration_slider, 
      time_of_day, 
      season, 
      indoor_outdoor, 
      food 
  } = req.body;

  // Insert data into the 'activity' table including the image path
  knex('activity')
      .insert({
          activity: activity,
          description: description,
          equipment: equipment === 'True',  // Convert to boolean
          equipment_description: equipment === 'True' ? equipment_description : null,
          price: price,
          location: location,
          type: type,
          duration: duration_slider,
          time_of_day: time_of_day,
          season: season,
          indoor_outdoor: indoor_outdoor,
          food: food === 'True',  // Convert to boolean
          image: req.file ? req.file.path : null // Save the image path if file was uploaded
      })
      .then(() => {
          res.send(`<script>alert("Activity added successfully."); window.location.href = "/"; </script>`);
      })
      .catch((err) => {
          console.error(err);
          res.status(500).send(`<script>alert("Error adding activity to the database."); window.location.href = "/add"; </script>`);
      });
});


//app.get("/filter", (req, res) => {
  //knex
    //.select()
    //.from("activity")
    //.then((activity) => {
      //res.render("filter", { myactivity: activity });
    //});
//});

app.get("/filter", (req, res) => {
  let query = knex.select('*').from('activity');

  // Add conditions for each filter if they are provided in the query parameters
  if (req.query.type && req.query.type !== '') {
      query = query.where('type', req.query.type);
  }
  if (req.query.location && req.query.location !== '' && req.query.location !== "Doesn't Matter") {
      query = query.where('location', req.query.location);
  }
  if (req.query.price && req.query.price !== '') {
      query = query.where('price', req.query.price);
  }
  if (req.query.duration && req.query.duration !== '') {
      query = query.where('duration', req.query.duration);
  }
  if (req.query.time_of_day && req.query.time_of_day !== '' && req.query.time_of_day !== "Doesn't Matter") {
      query = query.where('time_of_day', req.query.time_of_day);
  }
  if (req.query.season && req.query.season !== '') {
      query = query.where('season', req.query.season);
  }
  if (req.query.indoor_outdoor && req.query.indoor_outdoor !== '') {
      query = query.where('indoor_outdoor', req.query.indoor_outdoor);
  }
  if (req.query.equipment && req.query.equipment !== '') {
      query = query.where('equipment', req.query.equipment === 'Yes');
  }
  if (req.query.food && req.query.food !== '') {
      query = query.where('food', req.query.food === 'Yes');
  }

  // Execute the query and render the page with the filtered results
  query
      .then((activities) => {
          res.render("filter", { myactivity: activities });
      })
      .catch((err) => {
          console.error('Error fetching activities:', err);
          res.status(500).send('Error fetching activities');
      });
});

app.get('/activity/:id', (req, res) => {
  const activityId = req.params.id;

  knex.select('*').from('activity').where('id', activityId)
      .then(activityDetails => {
          if (activityDetails.length > 0) {
              const recordData = activityDetails[0];
              // Pass 'isLoggedIn' to the EJS template
              res.render("activityDetail", { 
                  record: recordData, 
                  isLoggedIn: req.session.loggedIn || false 
              });
          } else {
              res.status(404).send("Activity not found");
          }
      })
      .catch(err => {
          console.error('Error fetching activity details:', err);
          res.status(500).send('Error fetching activity details');
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
      res.send(
        '<script>alert("Account Created Sucsessfully."); window.location.href = "/"; </script>'
      );
    })
    .catch((err) => {
      console.error(err);
      // Handling the case where the username already exists
      res.send(
        '<script>alert("Username already exists. Please choose another one to continue!"); window.location.href = "/create"; </script>'
      );
    });
})

app.get("/editLogin", (req, res) => {
  console.log("------Testing------");

  // Ensure req.session.userInfo is defined
  if (!req.session.userInfo) {
    // Redirect to the login page if userinfo is not defined
    res.redirect("/account");
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
    res.redirect("/account");
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

// GET route for edit form
app.get('/editRecord/:id', (req, res) => {
  const activityId = req.params.id;

  knex.select('*').from('activity').where('id', activityId)
      .then(activityDetails => {
          if (activityDetails.length > 0) {
              const recordData = activityDetails[0];
              res.render("editActivity", { record: recordData }); // Render an edit form with the record data
          } else {
              res.status(404).send("Activity not found");
          }
      })
      .catch(err => {
          console.error('Error fetching activity for edit:', err);
          res.status(500).send('Error fetching activity');
      });
});

app.post('/updateRecord/:id', upload.single('activityImage'), (req, res) => {
  const activityId = req.params.id;
  const { activity, location, price, duration, time_of_day, season, indoor_outdoor, equipment_description, description } = req.body;

  // Convert checkbox values to boolean
  const food = req.body.food === 'on';
  const equipment = req.body.equipment === 'on';

  // Check if a new image has been uploaded
  const newImagePath = req.file ? req.file.path : null;

  knex('activity')
      .where('id', activityId)
      .update({
          activity: activity,
          location: location,
          price: price,
          duration: duration,
          time_of_day: time_of_day,
          season: season,
          indoor_outdoor: indoor_outdoor,
          food: food,
          equipment: equipment,
          equipment_description: equipment_description,
          description: description,
          image: newImagePath || knex.raw('??', ['image']) // Use new image path or retain the existing one
      })
      .then(() => {
          res.send(`<script>alert("Activity updated successfully."); window.location.href = "/activity/${activityId}"; </script>`);
      })
      .catch((err) => {
          console.error(err);
          res.status(500).send(`<script>alert("Error updating activity."); window.location.href = "/editRecord/${activityId}"; </script>`);
      });
});

app.get('/deleteRecord/:id', (req, res) => {
  const activityId = req.params.id;

  knex('activity')
      .where('id', activityId)
      .del()
      .then(() => {
          res.send(`<script>alert("Activity deleted successfully."); window.location.href = "/"; </script>`);
      })
      .catch((err) => {
          console.error(err);
          res.status(500).send('Error deleting activity');
      });
});

app.listen(port, () => console.log("Server is Listening")); //last line!!
