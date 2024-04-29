var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var passport = require('passport');
var bcrypt = require('bcryptjs');
var tableMoves = 'connect4_game_state_';
var tableGravity = 'connect4_gravity_state_';

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();

function loggedIn(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect('/login'); 
  }
}

function notLoggedIn(req, res, next) {
  if (!req.user) {
    next();
  } else {
    let prefer = req.user.prefer;
    res.redirect('/users/profile?name='+prefer);
  }
}

async function initCellValues(req, id, rowNumber, columnNumber, cellState) {
  try {
      const query = `INSERT INTO ${tableMoves + req.body.username} (id, row_number, column_number, cell_state) VALUES ($1, $2, $3, $4)`;
      await client.query(query, [id, rowNumber, columnNumber, cellState]);
      console.log(`Inserted values for id ${id}`);
  } catch (error) {
      console.error("Error inserting values:", error);
  }
}

async function initGravity(req, col, height) {
  try {
     
      const query = `INSERT INTO ${tableGravity + req.body.username} (column_number, row_height) VALUES ($1, $2)`;
      await client.query(query, [col, height]);
      console.log(`Inserted values for column ${col}`);
  } catch (error) {
      console.error("Error inserting gravity values:", error);
  }
}

function setUserAccount(req, res, password){
  client.query('INSERT INTO Connect4users (username, password, fullname, prefer) VALUES($1, $2, $3, $4)', [req.body.username, password,req.body.fullname,req.body.prefer], function(err, result) {
    if (err) {
      console.log("unable to query INSERT");
      return next(err); // throw error to error.hbs.
    }
    console.log("User creation is successful");
    res.redirect('/users/login?message=We+created+your+account+successfully!');
  });
}

function initCellValueTable(req){
    // Execute an UPDATE query to reset all cell state values to zero
    const query = `CREATE TABLE IF NOT EXISTS ${tableMoves + req.body.username} (id SERIAL PRIMARY KEY, row_number INT NOT NULL, column_number INT NOT NULL, cell_state INT NOT NULL,
          move_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
    client.query(query)
    .then(result => console.log('User table created successfully'))
    .catch(error => console.error('Error creating gameboard table:', error));
}

function initGravityTable(req){

  const query = `CREATE TABLE IF NOT EXISTS ${tableGravity + req.body.username} (column_number INT PRIMARY KEY, row_height INT NOT NULL)`;
client.query(query)
.then(result => console.log('Gravity table created successfully'))
.catch(error => console.error('Error creating gravity table:', error));
}

function initUser(req, res, next){
  var salt = bcrypt.genSaltSync(10);
  var password = bcrypt.hashSync(req.body.password, salt);

  setUserAccount(req, res, password);
  initCellValueTable(req);

for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 7; col++) {
      const id = row * 7 + col + 1;
      const cellState = 0; 
      initCellValues(req, id, row, col, cellState);
  }
}

  initGravityTable(req);

for (let col = 0; col < 7; col++) {
  initGravity(req, col, 5);
}
}

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) {
      console.log("unable to logout:", err);
      return next(err);
    }
  }); 
  res.redirect('/');
});

router.get('/profile',loggedIn, function(req, res){
  // req.user: passport middleware adds "user" object to HTTP req object
  res.sendFile(path.join(__dirname,'..', 'public','profile.html'));
});

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
      initUser(req, res, next);
    }
  });
});

module.exports = router;