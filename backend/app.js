


const db = require('./database');
const express = require("express");
const bodyParser = require("body-parser");
const paypal = require("@paypal/checkout-server-sdk");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 8000;
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "views")));
app.use(bodyParser.json());

// Set EJS as the view engine
app.set("view engine", "ejs");

// Set the folder where your views are located (optional, as 'views' is the default)
app.set("views", "views");

// Function to generate a random string of a specified length
const generateRandomString = (length) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") // Convert to hexadecimal format
    .slice(0, length); // Trim to the desired length
};

// Set up Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "views/theatreFillms"); // Specify the folder to save files
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Set the filename to the original name of the file
  },
});

const upload = multer({ storage: storage });

// Generate a random key with a length of 32 characters
const randomKey = generateRandomString(32);

app.use(
  session({
    secret: randomKey, // Replace with a secure secret key for session data encryption
    resave: false,
    saveUninitialized: false,
  })
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kriseze9@gmail.com",
    pass: "qfbm yqag dhmz zfss",
  },
  tls: {
    rejectUnauthorized: false, // Use with caution
  },
});
// Database connection



// Set up PayPal SDK environment
const clientId =
  "AS_4sIsBHpqZJ8BGTpWKnexXelN3cjov7cVBj8h1BS7JQvw3OneAXayzyxzsrkCxS4gpDOW--_xskVjh";
const clientSecret =
  "EFOj5Fv8iwmjEiq1mB0Pqt-mZnykEmVL94LWL-ua0N3Lrb12kMlF2dGx0HvUnSfV7W6uYGP_GnnrZow-";

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

const isAuthenticated = (req, res, next) => {
  // Check if user is logged in (adjust the condition based on your session setup)
  if (req.session && req.session.user) {
    // User is authenticated, proceed to the next middleware or route handler
    next();
  } else {
    // User is not authenticated, redirect to the login page or send an unauthorized response
    res.redirect("/signin.html"); // Adjust the URL based on your login page route
    // Alternatively, you can send an unauthorized response
    // res.status(401).json({ message: 'Unauthorized' });
  }
};
// Add middleware and routes here

app.get("/booker", isAuthenticated, (req, res) => {
  res.sendFile(__dirname + "/views/bookings.html");
});

app.get("/", (req, res) => {
  // Render the home page
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/user", (req, res) => {
  // Check if the user is logged in (you might have a middleware for this)
  if (!req.session || !req.session.user || !req.session.user.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Fetch user information from the database using the user ID from the session
  const userIdFromSession = req.session.user.userId;

  const userId = req.session.user.userId;

  // Join the bookings table with movies and theaters tables
  const query = `
    SELECT 
      users.*,
      bookings.*,
      movies.title AS movie_name,
      theaters.name AS theater_name
    FROM users
    JOIN bookings ON users.user_id = bookings.user_id
    JOIN movies ON bookings.movie_id = movies.movie_id
    JOIN theaters ON bookings.theater_id = theaters.theater_id
    WHERE users.user_id = ?`;

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error executing query:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length > 0) {
      // Send the user and booking information as JSON
      res.json({
        userId: results[0].user_id,
        username: results[0].username,
        email: results[0].email,
        bookings: results.map((result) => ({
          booking_id: result.booking_id,
          showtime_id: result.showtime_id,
          num_tickets: result.num_tickets,
          booking_time: result.booking_time,
          total_price: result.total_price,
          status: result.status,
          paymentStatus: result.paymentStatus,
          movie_name: result.movie_name,
          theater_name: result.theater_name,
          // Add other booking properties as needed
        })),
        // Add other relevant user information
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

app.get("/userone", (req, res) => {
  // Check if the user is logged in (you might have a middleware for this)
  if (!req.session || !req.session.user || !req.session.user.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Fetch user information from the database using the user ID from the session
  const userId = req.session.user.userId;

  // Query to get basic user information
  const query = "SELECT * FROM users WHERE user_id = ?";

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error executing query: " + error.stack);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length > 0) {
      // Extract user information
      const user = {
        userId: results[0].user_id,
        username: results[0].username,
        email: results[0].email,
        // Add other relevant user information
      };

      // Send the user information as JSON
      res.json(user);
    } else {
      // If no user is found, return a 404 response
      res.status(404).json({ message: "User not found" });
    }
  });
});

app.get("/logout", (req, res) => {
  // Check if the user is logged in
  if (req.session && req.session.user) {
    const user = req.session.user;

    user.isactive = "inactive"; // Set user status to "inactive"

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.redirect("/");
    });
    // Redirect or send a response after logging out
  } else {
    // User is not logged in, handle accordingly
    res.status(401).json({ message: "Unauthorized" });
  }
});

// API endpoint to get all users
app.get("/users", (req, res) => {
  const sql = "SELECT * FROM users";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(result);
    }
  });
});
// Endpoint to get user by user ID
app.get("/users1/:user_id", (req, res) => {
  const userId = req.params.user_id;

  // Query to get user details by ID
  const query = "SELECT * FROM users WHERE user_id = ?";

  // Execute the query
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user details:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (results.length === 0) {
      // No user found with the given ID
      res.status(404).json({ error: "User not found" });
    } else {
      // User found, send the details
      res.json(results[0]);
    }
  });
});

// API endpoint to update a user
app.put("/users/:userId", (req, res) => {
  const userId = req.params.userId;
  const { username, email, password, Role, isactive } = req.body;
  const sql =
    "UPDATE users SET username=?, email=?, password=?, Role=?, isactive=? WHERE user_id=?";
  const values = [username, email, password, Role, isactive, userId];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "User updated successfully" });
    }
  });
});

// API endpoint to delete a user
app.delete("/users/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    try {
      // 1. Delete related bookings first
      await db.query("DELETE FROM bookings WHERE user_id = ?", [userId]);

      // 2. Now, delete the user
      await db.query("DELETE FROM users WHERE user_id = ?", [userId]);

      // Commit the transaction
      await db.commit();

      res
        .status(200)
        .json({ message: "User and related bookings deleted successfully." });
    } catch (error) {
      // Rollback the transaction in case of an error
      await db.rollback();
      console.error("Error deleting user and bookings:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      // Close the database connection
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Define a route to render the movie description page
app.get("/movies/:id", (req, res) => {
  const movieId = req.params.id;
  // Fetch the movie details from the database using parameterized query
  const query = "SELECT * FROM movies WHERE movie_id = ?";

  db.query(query, [movieId], (error, results) => {
    if (error) {
      console.error("Error fetching movie data:", error);
      res.status(500).send("Error fetching movie data");
      return;
    }

    if (results.length === 0) {
      res.status(404).send("Movie not found");
      return;
    }

    const movie = results[0];

    // Render the movie details page with the fetched data
    res.render("moviedescription", { movie });
  });
});

app.get("/movie/:id", (req, res) => {
  const movieId = req.params.id;
  const query = "SELECT * FROM movies WHERE movie_id = ?";

  db.query(query, [movieId], (error, results) => {
    if (error) {
      console.error("Error fetching movie data:", error);
      res.status(500).send("Error fetching movie data");
      return;
    }

    if (results.length === 0) {
      res.status(404).send("Movie not found");
      return;
    }

    const movie = results[0];

    // Explicitly send JSON as a string
    res.send(JSON.stringify(movie));
  });
});

// Route to get all movies
app.get("/movies", (req, res) => {
  db.query("SELECT * FROM movies", (error, results) => {
    if (error) throw error;
    res.render("MoviePage", { movies: results });
  });
});
app.get("/moviesall", (req, res) => {
  db.query("SELECT * FROM movies", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// Add a new route for fetching random movies
app.get("/moviesrand/random", (req, res) => {
  let count = req.query.count || 3;
  count = parseInt(count, 10); // Parse count as an integer

  // Fetch random movies from the database
  db.query(
    "SELECT * FROM movies ORDER BY RAND() LIMIT ?",
    [count],
    (error, results) => {
      if (error) {
        console.error("Error fetching random movies:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }

      res.json(results);
    }
  );
});

// Your existing endpoint to add a new movie
app.post("/addMovie", upload.single("image"), (req, res) => {
  const {
    title,
    genre,
    release_date,
    duration,
    description,
    cast,
    trailer_url,
    price,
  } = req.body;

  // Save the file name to your database
  const filename = req.file ? req.file.filename : null;
  // Save other movie details to your database
  const sql =
    "INSERT INTO movies (title, genre, release_date, duration, description, cast, trailer_url, price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [
    title,
    genre,
    release_date,
    duration,
    description,
    cast,
    trailer_url,
    price,
    filename,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Movie added successfully" });
    }
  });
});

// API endpoint to update a movie
// Update the route with multer middleware
app.put("/movies/:movieId", upload.single("image"), (req, res) => {
  const movieId = req.params.movieId;
  const {
    title,
    genre,
    release_date,
    duration,
    description,
    cast,
    trailer_url,
    price,
  } = req.body;

  // Check if an image was uploaded
  const image = req.file ? req.file.filename : null;

  const sql =
    "UPDATE movies SET title=?, genre=?, release_date=?, duration=?, description=?, cast=?, trailer_url=?, price=?, image=? WHERE movie_id=?";
  const values = [
    title,
    genre,
    release_date,
    duration,
    description,
    cast,
    trailer_url,
    price,
    image,
    movieId,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Movie updated successfully" });
    }
  });
});

// API endpoint to delete a movie
app.delete("/movieD/:movieId", (req, res) => {
  const movieId = req.params.movieId;
  const sql = "DELETE FROM movies WHERE movie_id=?";

  db.query(sql, [movieId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Movie deleted successfully" });
    }
  });
});

// Route to get all theaters
// Theater Management
app.get("/theaters", (req, res) => {
  // Retrieve all theaters from the database
  db.query("SELECT * FROM theaters", (error, results) => {
    if (error) {
      console.error("Error retrieving theaters:", error);
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});
// Endpoint to fetch theaters based on selected movie and showtime
// Define the endpoint to find a theater by movie_id and showtime_id
app.get("/theaterg/:movie_id/:showtime_id", (req, res) => {
  const movieId = req.params.movie_id;
  const showtimeId = req.params.showtime_id;

  // Query to find the theater by movie_id and showtime_id
  const query = `
    SELECT theaters.theater_id, theaters.name
    FROM theaters
    JOIN theater_showtimes ON theaters.theater_id = theater_showtimes.theater_id
    WHERE theater_showtimes.movie_id = ? AND theater_showtimes.showtime_id = ?
  `;

  // Execute the query with the provided parameters
  db.query(query, [movieId, showtimeId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    } else {
      if (results.length > 0) {
        // If theaters are found, send the result
        res.json(results[0]);
      } else {
        // If no theaters are found, send a 404 Not Found status
        res.status(404).send("Theater not found");
      }
    }
  });
});

// API endpoint to add a new theater
app.post("/theaters", (req, res) => {
  const { name, location, capacity, movie_id } = req.body;
  const sql =
    "INSERT INTO theaters (name, location, capacity, movie_id) VALUES (?, ?, ?, ?)";
  const values = [name, location, capacity, movie_id];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Theater added successfully" });
    }
  });
});

app.get("/theaters1/:theaterId", (req, res) => {
  const theaterId = req.params.theaterId;

  // Query to get theater details by ID
  const query = "SELECT * FROM theaters WHERE theater_id = ?";

  // Execute the query
  db.query(query, [theaterId], (err, results) => {
    if (err) {
      console.error("Error fetching theater details:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (results.length === 0) {
      // No theater found with the given ID
      res.status(404).json({ error: "Theater not found" });
    } else {
      // Theater found, send the details
      res.json(results[0]);
    }
  });
});

// API endpoint to update a theater
app.put("/theaters/:theaterId", (req, res) => {
  const theaterId = req.params.theaterId;
  const { name, location, capacity, movie_id } = req.body;
  const sql =
    "UPDATE theaters SET name=?, location=?, capacity=?, movie_id=? WHERE theater_id=?";
  const values = [name, location, capacity, movie_id, theaterId];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Theater updated successfully" });
    }
  });
});

// API endpoint to delete a theater
app.delete("/theaters/:theaterId", (req, res) => {
  const theaterId = req.params.theaterId;

  // Step 1: Delete referencing rows in theater_showtimes
  const deleteShowtimesSql = "DELETE FROM theater_showtimes WHERE theater_id=?";
  db.query(deleteShowtimesSql, [theaterId], (showtimesErr, showtimesResult) => {
    if (showtimesErr) {
      console.error("Error deleting referencing showtimes:", showtimesErr);
      res.status(500).send("Internal Server Error");
      return;
    }

    // Step 2: Delete the theater
    const deleteTheaterSql = "DELETE FROM theaters WHERE theater_id=?";
    db.query(deleteTheaterSql, [theaterId], (theaterErr, theaterResult) => {
      if (theaterErr) {
        console.error("Error deleting theater:", theaterErr);
        res.status(500).send("Internal Server Error");
      } else {
        res.json({ message: "Theater deleted successfully" });
      }
    });
  });
});


// Route to get all showtimes
app.get("/showtimes", (req, res) => {
  // Retrieve all showtimes from the database
  db.query("SELECT * FROM Showtimes", (error, results) => {
    if (error) {
      console.error("Error retrieving showtimes:", error);
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});

// Route to get showtimes by movie ID
app.get("/showtimes/:movieId", (req, res) => {
  const movieId = req.params.movieId;
  // Fetch showtimes from the database based on the provided movie ID
  db.query(
    "SELECT * FROM Showtimes WHERE movie_id = ?",
    [movieId],
    (error, results) => {
      if (error) {
        console.error("Error retrieving showtimes:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }

      res.json(results);
    }
  );
});

// API endpoint to add a new showtime
app.post("/showtimesN", (req, res) => {
  const { movie_id, theater_id, start_time, price, available_seats, end_time } =
    req.body;

  // Step 1: Check if the referenced row exists in theaters table
  const checkTheaterSql = "SELECT * FROM theaters WHERE Theater_id = ?";
  db.query(checkTheaterSql, [theater_id], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("Error checking theater:", checkErr);
      res.status(500).send("Internal Server Error");
      return;
    }

    // If the referenced row does not exist, return an error response
    if (checkResult.length === 0) {
      res.status(400).json({ error: "The referenced theater does not exist." });
      return;
    }

    // Step 2: Insert into showtimes table
    const insertShowtimeSql =
      "INSERT INTO showtimes (movie_id, theater_id, start_time, price, available_seats, end_time) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [movie_id, theater_id, start_time, price, available_seats, end_time];

    db.query(insertShowtimeSql, values, (insertErr, insertResult) => {
      if (insertErr) {
        console.error("Error inserting into showtimes:", insertErr);
        res.status(500).send("Internal Server Error");
      } else {
        res.json({ message: "Showtime added successfully" });
      }
    });
  });
});


// API endpoint to get showtime details by ID
app.get("/showtimes1/:showtimeId", (req, res) => {
  const showtimeId = req.params.showtimeId;
  const sql = "SELECT * FROM showtimes WHERE showtime_id=?";

  db.query(sql, [showtimeId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      if (result.length > 0) {
        // Assuming you send the showtime details as JSON
        res.json(result[0]);
      } else {
        res.status(404).send("Showtime not found");
      }
    }
  });
});

// API endpoint to update a showtime
app.put("/showtimes/:showtimeId", (req, res) => {
  const showtimeId = req.params.showtimeId;
  const { movie_id, theater_id, start_time, price, available_seats, end_time } =
    req.body;
  const sql =
    "UPDATE showtimes SET movie_id=?, theater_id=?, start_time=?, price=?, available_seats=?, end_time=? WHERE showtime_id=?";
  const values = [
    movie_id,
    theater_id,
    start_time,
    price,
    available_seats,
    end_time,
    showtimeId,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Showtime updated successfully" });
    }
  });
});

// API endpoint to delete a showtime
app.delete("/showtimes1/:showtimeId", (req, res) => {
  const showtimeId = req.params.showtimeId;
  const sql = "DELETE FROM showtimes WHERE showtime_id=?";

  db.query(sql, [showtimeId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ message: "Showtime deleted successfully" });
    }
  });
});

// Route to get all bookings
app.get("/bookings", (req, res) => {
  db.query("SELECT * FROM Bookings", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
app.get("/bookings/:id", (req, res) => {
  const bookingId = req.params.id;

  // SQL SELECT statement to retrieve booking details
  const selectSql = `
    SELECT
      booking_id,
      user_id,
      movie_id,
      showtime_id,
      theater_id,
      num_tickets,
      booking_time,
      total_price,
      status,
      paymentStatus
    FROM bookings
    WHERE booking_id = ?
  `;

  // Execute the SQL query to retrieve booking details
  db.query(selectSql, [bookingId], (error, results) => {
    if (error) {
      console.error("Error retrieving booking details:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Check if a booking with the given ID exists
    if (results.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Return the booking details
    const bookingDetails = results[0];
    res.status(200).json(bookingDetails);
  });
});

// API endpoint to add a new booking
app.post("/bookingsAdmin", (req, res) => {
  const {
    showtime_id,
    user_id,
    num_tickets,
    total_price,
    status,
    paymentStatus,
    movie_id,
    theater_id,
  } = req.body;
  const sql =
    "INSERT INTO bookings (showtime_id, user_id, num_tickets, booking_time, total_price, status, paymentStatus, movie_id, theater_id) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)";
  const values = [
    showtime_id,
    user_id,
    num_tickets,
    total_price,
    status,
    paymentStatus,
    movie_id,
    theater_id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Booking added successfully" });
    }
  });
});

// API endpoint to update a booking
app.put("/bookings/:bookingId", (req, res) => {
  const bookingId = req.params.bookingId;
  const {
    showtime_id,
    user_id,
    num_tickets,
    total_price,
    status,
    paymentStatus,
    movie_id,
    theater_id,
  } = req.body;
  const sql =
    "UPDATE bookings SET showtime_id=?, user_id=?, num_tickets=?, total_price=?, status=?, paymentStatus=?, movie_id=?, theater_id=? WHERE booking_id=?";
  const values = [
    showtime_id,
    user_id,
    num_tickets,
    total_price,
    status,
    paymentStatus,
    movie_id,
    theater_id,
    bookingId,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Booking updated successfully" });
    }
  });
});

// API endpoint to delete a booking
app.delete("/bookings/:bookingId", (req, res) => {
  const bookingId = req.params.bookingId;
  const sql = "DELETE FROM bookings WHERE booking_id=?";

  db.query(sql, [bookingId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json({ message: "Booking deleted successfully" });
    }
  });
});

// Endpoint to handle booking creation after PayPal payment
app.post("/bookings", isAuthenticated, (req, res) => {
  // Extract booking data from the request body
  const { movieId, showtimeId, theaterId, numSeats, price, totalPrice } =
    req.body;
  const userEmail = req.session.user.email;
  const userId = req.session.user.userId; // Extract user_id from the session

  // SQL INSERT statement
  const insertSql = `
    INSERT INTO bookings
    (user_id, movie_id, showtime_id, theater_id, num_tickets, booking_time, total_price, status, paymentStatus)
    VALUES (?, ?, ?, ?, ?, NOW(), ?, 'confirmed', 'completed')
  `;

  // Values to insert into the SQL statement
  const insertValues = [
    userId,
    movieId,
    showtimeId,
    theaterId,
    numSeats,
    totalPrice,
  ];

  // Execute the SQL query to insert the booking
  db.query(insertSql, insertValues, (error, insertResults) => {
    if (error) {
      console.error("Error inserting booking:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Get the newly created booking ID
    const bookingId = insertResults.insertId;

    // SQL SELECT statement to retrieve booking details
    const selectSql = `
      SELECT
        booking_id,
        user_id,
        movie_id,
        showtime_id,
        theater_id,
        num_tickets,
        booking_time,
        total_price,
        status,
        paymentStatus
      FROM bookings
      WHERE booking_id = ?
    `;

    // Execute the SQL query to retrieve booking details
    db.query(selectSql, [bookingId], (selectError, selectResults) => {
      if (selectError) {
        console.error("Error retrieving booking details:", selectError);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      // Check if a booking with the given ID exists
      if (selectResults.length === 0) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      // Return the booking details
      const bookingDetails = selectResults[0];

      // Send a confirmation email to the user
      sendConfirmationEmail(userEmail, bookingId, bookingDetails);

      // Return the newly created booking ID
      res.status(201).json({ bookingId });
    });
  });
});

// Function to send a confirmation email
async function sendConfirmationEmail(userEmail, bookingId, bookingDetails) {
  const totalAmount = bookingDetails.total_price || 0; // Adjust the property name if needed
  const formattedTotalAmount = totalAmount.toFixed(2);
  try {
    // Fetch theater name, movie title, and user name based on IDs
    const theaterName = await getTheaterName(bookingDetails.theater_id);
    const movieTitle = await getMovieTitle(bookingDetails.movie_id);
    const userName = await getUserName(bookingDetails.user_id);

    // ... (existing code)
    // Create the email text with booking details
    const emailText = `
    Dear ${userName},

    Thank you for your booking! Your booking ID is ${bookingId}. Here are the details:

    Booking ID: ${bookingId}
    User Email: ${userEmail}
    Movie Title: ${movieTitle}
    Theater Name: ${theaterName}
    Showtime: ${bookingDetails.showtime_id}
    Number of Tickets: ${bookingDetails.num_tickets}
    Total Amount: $${formattedTotalAmount}

    We look forward to seeing you at the show!

    Regards,
    Movie Booking System
  `;

    const mailOptions = {
      from: "theatreApp@gmail.com",
      to: userEmail,
      subject: "Booking Confirmation",
      text: emailText,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending confirmation email:", error);
      } else {
        console.log("Confirmation email sent:", info.response);
      }
    });
  } catch (error) {
    console.error("Error getting data from the database:", error);
    return;
  }
}
// Function to get user name by ID
function getUserName(userId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT username FROM users WHERE user_id = ?";
    db.query(sql, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        const userName = result[0] ? result[0].username : null;
        resolve(userName);
      }
    });
  });
}

// Function to get movie title by ID
function getMovieTitle(movieId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT title FROM movies WHERE movie_id = ?";
    db.query(sql, [movieId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        const movieTitle = result[0] ? result[0].title : null;
        resolve(movieTitle);
      }
    });
  });
}

// Function to get theater name by ID
function getTheaterName(theaterId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT name FROM theaters WHERE theater_id = ?";
    db.query(sql, [theaterId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        const theaterName = result[0] ? result[0].name : null;
        resolve(theaterName);
      }
    });
  });
}

//login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (error, results) => {
    if (error) {
      console.error("Error executing query: " + error.stack);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length > 0) {
      const user = results[0];

      // Use a secure hashing library like bcrypt to compare passwords
      if (password === user.password) {
        user.isactive = "active";
        req.session.user = {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.Role, // Assuming there is a 'role' field in your users table
        };

        res.json({ message: "Login successful!", user });

        // Store user information in the session
        req.session.user = {
          userId: user.user_id,
          email: user.email,
          role: user.Role, // Assuming there is a 'role' field in your users table
        };
      } else {
        // Delay response to mitigate brute force attacks
        setTimeout(() => {
          res.status(401).json({ message: "Invalid credentials" });
        }, 1000); // Add a delay of 1 second (adjust as needed)
      }
    } else {
      // Delay response to mitigate brute force attacks
      setTimeout(() => {
        res.status(401).json({ message: "Invalid credentials" });
      }, 1000); // Add a delay of 1 second (adjust as needed)
    }
  });
});
function checkUserLoggedIn(req) {
  // Check if there is user information in the session
  return req.session.user !== undefined && req.session.user !== null;
}
app.get("/check-login-status", (req, res) => {
  const isLoggedIn = checkUserLoggedIn(req);
  res.json({ isLoggedIn });
});
// Signup endpoint
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password],
      (error, results) => {
        if (error) {
          console.error("Error executing query: " + error.stack);
          res.status(500).json({ message: "Internal Server Error" });
          return;
        }

        res.json({ message: "User registered successfully!" });
      }
    );
  } catch (error) {
    console.error("Error in signup route: " + error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add a route for the admin page
app.get("/admin", isAdmin, (req, res) => {
  // Query the database for active and inactive users
  db.query(
    "SELECT * FROM Users WHERE isActive = ?",
    [true],
    (error, activeUsers) => {
      if (error) {
        console.error("Error executing query for active users:", error.stack);
        res.status(500).send("Internal Server Error");
        return;
      }

      db.query(
        "SELECT * FROM Users WHERE isActive = ?",
        [false],
        (error, inactiveUsers) => {
          if (error) {
            console.error(
              "Error executing query for inactive users:",
              error.stack
            );
            res.status(500).send("Internal Server Error");
            return;
          }

          // Query the database for successful and unsuccessful ticket payments
          db.query(
            "SELECT * FROM Bookings WHERE paymentStatus = ?",
            ["successful"],
            (error, successfulPayments) => {
              if (error) {
                console.error(
                  "Error executing query for successful payments:",
                  error.stack
                );
                res.status(500).send("Internal Server Error");
                return;
              }

              db.query(
                "SELECT * FROM Bookings WHERE paymentStatus = ?",
                ["unsuccessful"],
                (error, unsuccessfulPayments) => {
                  if (error) {
                    console.error(
                      "Error executing query for unsuccessful payments:",
                      error.stack
                    );
                    res.status(500).send("Internal Server Error");
                    return;
                  }

                  // Render the admin page with the retrieved data
                  res.render("admin", {
                    activeUsers,
                    inactiveUsers,
                    successfulPayments,
                    unsuccessfulPayments,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});
function isAdmin(req, res, next) {
  // Check if the user is logged in
  if (req.session.user && req.session.user.role === "admin") {
    // User is an admin, proceed to the next middleware or route
    next();
  } else {
    // User is not an admin, return unauthorized status
    res.redirect("/user.html");
  }
}
// Showtime Management

app.put("/showtimes/:showtimeId", (req, res) => {
  const showtimeId = req.params.showtimeId;
  const { startTime, movieId, theaterId } = req.body;

  // Update showtime details in the database
  db.query(
    "UPDATE Showtimes SET StartTime = ?, MovieID = ?, TheaterID = ? WHERE ShowtimeID = ?",
    [startTime, movieId, theaterId, showtimeId],
    (error, results) => {
      if (error) {
        console.error("Error updating showtime:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }

      res.json({ message: "Showtime updated successfully!" });
    }
  );
});

// API endpoint for movie search with optional genre parameter
app.get("/search", (req, res) => {
  const searchTerm = req.query.q;
  const genre = req.query.genre;

  if (!searchTerm && !genre) {
    return res.status(400).json({ error: "Search term or genre is required" });
  }

  let query = `
    SELECT * FROM movies
    WHERE (title LIKE ? OR description LIKE ?)
  `;
  const params = [`%${searchTerm || ""}%`, `%${searchTerm || ""}%`];

  if (genre) {
    query += " AND genre = ?";
    params.push(genre);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.json(results);
    }
  });
});

app.get("/moviesB/:movieId", (req, res) => {
  const movieId = req.params.movieId;
  const sql = "SELECT * FROM movies WHERE movie_id = ?";
  db.query(sql, [movieId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(result[0]); // Assuming movie_id is unique, so return the first result
    }
  });
});

app.get("/theatersB/:theaterId", (req, res) => {
  const theaterId = req.params.theaterId;
  const sql = "SELECT * FROM theaters WHERE theater_id = ?";
  db.query(sql, [theaterId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(result[0]); // Assuming theater_id is unique, so return the first result
    }
  });
});

app.get("/usersB/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = "SELECT * FROM users WHERE user_id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(result[0]); // Assuming user_id is unique, so return the first result
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Make the 'db' object accessible in your routes or middleware
app.locals.db = db;
