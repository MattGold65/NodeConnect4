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
    cell_state INT NOT NULL
)
`;
client.query(createTableGameboardQuery)
  .then(result => console.log('User table created successfully'))
  .catch(error => console.error('Error creating gameboard table:', error));

  var tableMoves = `connect4_moves_` + req.body.username;

  const createTableMovesQuery = `
  CREATE TABLE IF NOT EXISTS ${tableMoves} (
      id SERIAL PRIMARY KEY,
      player VARCHAR(10) NOT NULL,
      column_number INT NOT NULL,
      row_number INT NOT NULL,
      move_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;
client.query(createTableMovesQuery)
.then(result => console.log('User table created successfully'))
.catch(error => console.error('Error creating moves table:', error));
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