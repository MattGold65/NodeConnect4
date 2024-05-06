/* 
Router that handles routes pertaining to user account creation and access
*/

var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var passport = require('passport');
var bcrypt = require('bcryptjs');
const { Query } = require('pg');
var tableMoves = 'connect4_game_state_';
var tableGravity = 'connect4_gravity_state_';
var tableWL = 'connect4_W_L_Record_';

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();

//Function that checks if a user session is active. If not redirect to login page
function loggedIn(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect('/login'); 
  }
}
//Function that checks if a user session is active. If so redirect to profile page
function notLoggedIn(req, res, next) {
  if (!req.user) {
    next();
  } else {
    let prefer = req.user.prefer;
    res.redirect('/users/profile?name='+prefer);
  }
}
/*Function that initalizes data in table that handles game move data. 
Each cell (row, column) gets its own row in the table. 
Cell_State is initalized with 0 meaning no piece is in the cell.
*/
async function initCellValues(req, id, rowNumber, columnNumber, cellState) {
  try {
      const query = `INSERT INTO ${tableMoves + req.body.username} (id, row_number, column_number, cell_state) VALUES ($1, $2, $3, $4)`;
      await client.query(query, [id, rowNumber, columnNumber, cellState]);
      console.log(`Inserted values for id ${id}`);
  } catch (error) {
      console.error("Error inserting values:", error);
  }
}

/*
Function that initalizes data in table that tracks the avaliable depth of each columnn.
Initalized with 5 because no piece is in any column at the start of the game.
*/
async function initGravity(req, col, height) {
  try {
     
      const query = `INSERT INTO ${tableGravity + req.body.username} (column_number, row_height) VALUES ($1, $2)`;
      await client.query(query, [col, height]);
      console.log(`Inserted values for column ${col}`);
  } catch (error) {
      console.error("Error inserting gravity values:", error);
  }
}
/*
Function that inserts the newly created user's infomation into a table storing the users with an account
*/
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

/*
Function that creates the table that holds game moves. Table created upon user signup
*/
function initCellValueTable(req){
    // Execute an UPDATE query to reset all cell state values to zero
    const query = `CREATE TABLE IF NOT EXISTS ${tableMoves + req.body.username} (id SERIAL PRIMARY KEY, row_number INT NOT NULL, column_number INT NOT NULL, cell_state INT NOT NULL,
          move_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
    client.query(query)
    .then(result => console.log('User table created successfully'))
    .catch(error => console.error('Error creating gameboard table:', error));
}

/*
Function that creates table that holds cell depth or gravity states. Table created upon user signup.
*/
function initGravityTable(req){

  const query = `CREATE TABLE IF NOT EXISTS ${tableGravity + req.body.username} (column_number INT PRIMARY KEY, row_height INT NOT NULL)`;
client.query(query)
.then(result => console.log('Gravity table created successfully'))
.catch(error => console.error('Error creating gravity table:', error));
}

/*
Function that creates table that tracks the newly created user's wins and losses
*/
function initRecordTable(req){
  const query = `CREATE TABLE IF NOT EXISTS ${tableWL + req.body.username} (game_number SERIAL, Win_or_Loss VARCHAR(10) NOT NULL)`;
client.query(query)
.then(result => console.log('Record table created successfully'))
.catch(error => console.error('Error creating gravity table:', error));

}
/*
Function that initalizes the user upon account created
*/
function initUser(req, res, next){
  //encrypt users password
  var salt = bcrypt.genSaltSync(10);
  var password = bcrypt.hashSync(req.body.password, salt);
  //create Record, and player move tables. Insert new user into users table
  initRecordTable(req);
  setUserAccount(req, res, password);
  initCellValueTable(req);

//create 42 rows for each unqiue cell for the 6x7 connect4 board. init cell state to 0
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 7; col++) {
      const id = row * 7 + col + 1;
      const cellState = 0; 
      initCellValues(req, id, row, col, cellState);
  }
}
  //create the gravity table
  initGravityTable(req);

//init gravity table value to 5 for each column
for (let col = 0; col < 7; col++) {
  initGravity(req, col, 5);
}
}
//router to allow users to logout
router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) {
      console.log("unable to logout:", err);
      return next(err);
    }
  }); 
  res.redirect('/');
});

//router that sends profile.html when user visits profile page
router.get('/profile',loggedIn, function(req, res){
  res.sendFile(path.join(__dirname,'..', 'public','profile.html'));
});

/* 
Router that queries the current users wins and losses from record table upon
a user visiting their profile page. Json fetch at profile.js and displayed in table
*/
router.get('/profileJSON', function(req, res){
  const name = req.query.name; // Extract query parameter 'name'
  const query = `SELECT * FROM ${tableWL + req.user.username}`;
  console.log("Query:", query); // Log the generated query
  client.query(query, function(err, result){
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(result.rows);
    console.log(result.rows);
  });
});


// get login page if user isnt logged in
router.get('/login', notLoggedIn, function(req, res){
  //success is set true in sign up page
  res.sendFile(path.join(__dirname,'..', 'public','login.html'));
});


router.post('/login',
  // authentication user if incorrect credentials redirect and display error message
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
  // otherwise send signup html
  res.sendFile(path.join(__dirname,'..', 'public','signup.html'));
});
//upon a user signing up
router.post('/signup', function(req, res, next) {
  //querry to check if user exists
  client.query('SELECT * FROM Connect4users WHERE username=$1',[req.body.username], function(err,result){
    if (err) {
      console.log("sql error ");
      next(err); // throw error to error.hbs.
    }
    //if user exists throw error
    else if (result.rows.length > 0) {
      console.log("user exists");
      res.redirect('/users/signup?error=User+exists');
    }
    else {
      //otherwise call initUser function and create the account
      console.log("no user with that name");
      initUser(req, res, next);
    }
  });
});

module.exports = router;