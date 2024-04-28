var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();

var passport = require('passport');
var bcrypt = require('bcryptjs');

// Assuming you have a database connection named `db`

// Function to insert values into the table
async function insertValues(id, rowNumber, columnNumber, cellState, tablename) {
  try {
      // Assuming you have a table named 'game_table'
      const query = `INSERT INTO ${tablename} (id, row_number, column_number, cell_state) VALUES ($1, $2, $3, $4)`;
      await client.query(query, [id, rowNumber, columnNumber, cellState]);
      console.log(`Inserted values for id ${id}`);
  } catch (error) {
      console.error("Error inserting values:", error);
  }
}

//for gravity
async function insertValues2(col, height, tablename) {
  try {
      // Assuming you have a table named 'game_table'
      const query = `INSERT INTO ${tablename} (column_number, row_height) VALUES ($1, $2)`;
      await client.query(query, [col, height]);
      console.log(`Inserted values for column ${col}`);
  } catch (error) {
      console.error("Error inserting gravity values:", error);
  }
}

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) {
      console.log("unable to logout:", err);
      return next(err);
    }
  });   //passport provide it
  res.redirect('/'); // Successful. redirect to localhost:3000/
});

function loggedIn(req, res, next) {
  if (req.user) {
    next(); // req.user exists, go to the next function (right after loggedIn)
  } else {
    res.redirect('/login'); // user doesn't exists redirect to localhost:3000/users/login
  }
}

router.get('/profile',loggedIn, function(req, res){
  // req.user: passport middleware adds "user" object to HTTP req object
  res.sendFile(path.join(__dirname,'..', 'public','profile.html'));
});

function notLoggedIn(req, res, next) {
  if (!req.user) {
    next();
  } else {
    let prefer = req.user.prefer;
    res.redirect('/users/profile?name='+prefer);
  }
}

// localhost:3000/users/login
router.get('/login', notLoggedIn, function(req, res){
  //success is set true in sign up page
  res.sendFile(path.join(__dirname,'..', 'public','login.html'));
});

// localhost:3000/users/login
router.post('/login',
  // This is where authentication happens - app.js
  // authentication locally (not using passport-google, passport-twitter, passport-github...)
  passport.authenticate('local', { failureRedirect: 'login?message=Incorrect+credentials', failureFlash:true }),
  function(req, res,next) {
    let prefer = req.user.prefer;
    console.log("fullname: ", prefer);
    res.redirect('/users/profile?name='+prefer); // Successful. redirect to localhost:3000/users/profile
});

router.get('/signup',function(req, res) {
  // If logged in, go to profile page
  if(req.user) {
    let prefer = req.user.prefer;
    return res.redirect('/users/profile?name='+prefer);
  }
  res.sendFile(path.join(__dirname,'..', 'public','signup.html'));
});

function createUser(req, res, next){
  var salt = bcrypt.genSaltSync(10);
  var password = bcrypt.hashSync(req.body.password, salt);

  client.query('INSERT INTO Connect4users (username, password, fullname, prefer) VALUES($1, $2, $3, $4)', [req.body.username, password,req.body.fullname,req.body.prefer], function(err, result) {
    if (err) {
      console.log("unable to query INSERT");
      return next(err); // throw error to error.hbs.
    }
    console.log("User creation is successful");
    res.redirect('/users/login?message=We+created+your+account+successfully!');
  });

  // Define the name of the table to store game board state
const tableGameboard = 'connect4_game_state_'+ req.body.username;
// Create the table if it doesn't exist
  // creates user gameboard table
  const createTableGameboardQuery = `
CREATE TABLE IF NOT EXISTS ${tableGameboard} (
    id SERIAL PRIMARY KEY,
    row_number INT NOT NULL,
    column_number INT NOT NULL,
    cell_state INT NOT NULL,
    move_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;
client.query(createTableGameboardQuery)
  .then(result => console.log('User table created successfully'))
  .catch(error => console.error('Error creating gameboard table:', error));

  // Loop to insert values into the table
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 7; col++) {
      // Example values to insert, modify as needed
      const id = row * 7 + col + 1; // Assuming 1-based id
      const cellState = 0; // Example cell state, modify as needed

      // Insert values into the table
      insertValues(id, row, col, cellState, tableGameboard);
  }
}

const tableGravity = 'connect4_gravity_state_'+ req.body.username;

  const createTableGravityQuery = `
  CREATE TABLE IF NOT EXISTS ${tableGravity} (
    column_number INT PRIMARY KEY,
    row_height INT NOT NULL
  )
`;
client.query(createTableGravityQuery)
.then(result => console.log('Gravity table created successfully'))
.catch(error => console.error('Error creating gravity table:', error));

for (let col = 0; col < 7; col++) {
  // Insert values into the grav table
  insertValues2(col, 5, tableGravity);
}

}
router.post('/signup', function(req, res, next) {
  client.query('SELECT * FROM Connect4users WHERE username=$1',[req.body.username], function(err,result){
    if (err) {
      console.log("sql error ");
      next(err); // throw error to error.hbs.
    }
    else if (result.rows.length > 0) {
      console.log("user exists");
      res.redirect('/users/signup?error=User+exists');
    }
    else {
      console.log("no user with that name");
      createUser(req, res, next);
    }
  });
});

module.exports = router;