const express = require("express"); //call the express module into app

let app = express(); //server website, listen and have routes

let path = require("path"); //makes it easier to call files

const port = process.env.PORT || 3000; //Where the server is listening on.

app.set("view engine", "ejs"); //using ejs for our files.

app.use(express.urlencoded({ extended: true }));

const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "admin",
    database: process.env.RDS_DB_NAME || "activity_app",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB ? { rejectUnauthorized: false } : false,
  }, //a dictionary (keys and values)
}); //parameters go in the ({})

app.get("/", (req, res) => {
  knex
    .select()
    .from("activity")
    .then((activity) => {
      res.render("index.ejs", { myactivity: activity });
    });
});

app.listen(port, () => console.log("Server is Listening")); //last line!!
