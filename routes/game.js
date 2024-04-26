var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var tableMoves = `connect4_moves_`;
var gameBoard = [];

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();

var passport = require('passport');
var bcrypt = require('bcryptjs');












// Function to save the game board state to the database
//needs fixing
function saveGameBoardState(gameBoard,req) {
  // Flatten the game board array into rows of (row_number, column_number, cell_state)
  const rows = [];
  for (let i = 0; i < gameBoard.length; i++) {
    for (let j = 0; j < gameBoard[i].length; j++) {
      rows.push([i, j, gameBoard[i][j]]);
    }
  }
  // Define the name of the table to store game board state
  const tableGameboard = 'connect4_game_state_'+ req.user.username;
  // Construct the query to insert or update the game board state
  const insertQuery = `
  INSERT INTO ${tableGameboard} (row_number, column_number, cell_state)
  VALUES ($1, $2, $3)
  ON CONFLICT (row_number, column_number)
  DO UPDATE SET cell_state = EXCLUDED.cell_state
  `;
  
  // Execute the query
  return client.query(insertQuery, rows);
}

// Function to retrieve the game board state from the database
function getGameBoardState(req) {
   // Define the name of the table to store game board state
  const tableGameboard = 'connect4_game_state_'+ req.user.username;
  const query = `SELECT * FROM ${tableGameboard}`;
  return client.query(query)
    .then(result => {
      // Initialize gameBoard with zeros
      gameBoard = Array.from({ length: 6 }, () => Array(7).fill(0));
      
      // Update gameBoard with values from the database
      result.rows.forEach(row => {
        gameBoard[row.row_number][row.column_number] = row.cell_state;
      });
      
      return gameBoard;
    })
    .catch(error => {
      console.error('Error retrieving game board state:', error);
      return null;
    });
}












































//This router.get needs to get cleaned up when we build login
router.get('/', function(req, res, next) {
    // Execute the SQL statement to create the table
  res.sendFile(path.join(__dirname, '..', 'public', 'Connect4.html'));

  gameBoard = getGameBoardState(req);

  /*
   //rows
   for (let i = 0; i < 6; i++) {
     gameBoard[i] = [];
   //columns
     for (let j = 0; j < 7; j++) {
       gameBoard[i][j] = 0; 
     }
   }
   */
 });
 
 // GET users listing. 
 // init new table
 
 
 // Define the route handler for POST requests
 
 // gets what user clicked on
 // inserts users info into database
 // checks for winner --> if winner post winner
 router.post('/', function(req, res, next){
   // Extract data from the request body
   const { row, column, player } = req.body;

   console.log(req.user.username);
   
   
   client.query(`INSERT INTO ${tableMoves + req.user.username} (player, column_number, row_number) VALUES($1, $2, $3)`, [player, column, row], function(err, result) {
     if (err) {
       console.log("unable to query INSERT");
       next(err);
     }
   });
 
   client.query(`Select column_number, row_number FROM ${tableMoves + req.user.username} WHERE player = $1`, [player], (err, result) => {
     if (err) {
       console.log("unable to query INSERT");
       next(err);
     }
 
     const columns = result.rows.map(row => row.column_number);
     const rows = result.rows.map(row => row.row_number);
     const numrows = rows.length;
 
     //get the last row and column from table
     const rowIndex = rows[numrows - 1];
     const colIndex = columns[numrows - 1];
     
     //insert into gameboard
     //red hot encode Red as 1 and Yellow as 2
       if(player == "Red"){
         gameBoard[rowIndex][colIndex] = 1;
       } else if(player =="Yellow"){
         gameBoard[rowIndex][colIndex] = 2;
       }
 
     //Condition 1 - Horizontally
     console.log("Checking for winner...");
     for (let i = 0; i < 6; i++) {
         for (let j = 0; j < 7; j++) {
 
           const cell1 = gameBoard[i][j];   
           const cell2 = gameBoard[i][j + 1];
           const cell3 = gameBoard[i][j + 2];
           const cell4 = gameBoard[i][j + 3];
 
 
           // Check if all four cells exist and have the same class
           if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
               // If so, set the winner
               console.log("Red Wins");
               return res.json({ message: '/game?message=RED+Has+Won!!!'});
              
           }
 
           if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
             // If so, set the winner
             console.log("Yellow Wins");
             return res.json({ message: '/game?message=YELLOW+Has+Won!!!'});
             
         }
            
         }
     }
 
    //Condition 2 - Vertically
    // understand logic
   for (let i = 0; i < 3; i++) {
     for (let j = 0; j < 7; j++) {
 
         const cell1 = gameBoard[i][j];   
         const cell2 = gameBoard[i+1][j];
         const cell3 = gameBoard[i+2][j];
         const cell4 = gameBoard[i+3][j];
 
 
         // Check if all four cells exist and have the same class
         if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
             // If so, set the winner
             console.log("Red Wins");
             return res.json({ message: '/game?message=RED+Has+Won!!!'});
         }
 
         if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
           // If so, set the winner
           console.log("Yellow Wins");
           return res.json({ message: '/game?message=YELLOW+Has+Won!!!'});
 
         }
         }
     }
 
   // Check for diagonal win from bottom-left to top-right
   for (let i = 3; i < 6; i++) { // Start from the 4th row from the bottom
     for (let j = 0; j < 4; j++) { // Start from the leftmost column
 
       const cell1 = gameBoard[i][j];   
       const cell2 = gameBoard[i - 1][j + 1];
       const cell3 = gameBoard[i - 2][j + 2];
       const cell4 = gameBoard[i - 3][j + 3];
 
       // Check if all four cells exist and have the same class
       if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
         // If so, set the winner
         console.log("Red Wins");
         return res.json({ message: '/game?message=RED+Has+Won!!!'});
         
     }
 
     if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
       // If so, set the winner
       console.log("Yellow Wins");
       return res.json({ message: '/game?message=YELLOW+Has+Won!!!'});
      
 
     }
        
     }
 }
 
 
 // Check for diagonal win from top-left to bottom-right
 for (let i = 0; i < 3; i++) { // Start from the top row
   for (let j = 0; j < 4; j++) { // Start from the leftmost column
 
       const cell1 = gameBoard[i][j];   
       const cell2 = gameBoard[i + 1][j + 1];
       const cell3 = gameBoard[i + 2][j + 2];
       const cell4 = gameBoard[i + 3][j + 3];
 
          // Check if all four cells exist and have the same class
          if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
           // If so, set the winner
           console.log("Red Wins");
           return res.json({ message: '/game?message=RED+Has+Won!!!'});
           
       }
   
       if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
         // If so, set the winner
         console.log("Yellow Wins");
         return res.json({ message: '/game?message=YELLOW+Has+Won!!!'});
        
   
       }
 
   }
 }
 
    res.json({ message: 'Received row and column data' });
    saveGameBoardState(gameBoard,req);
   });
 
   });
 
   
 
 
 module.exports = router;