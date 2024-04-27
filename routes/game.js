var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var tableMoves = `connect4_game_state_`;


const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();

var passport = require('passport');
var bcrypt = require('bcryptjs');

//This router.get needs to get cleaned up when we build login
router.get('/', function(req, res, next) {
    // Execute the SQL statement to create the table
  res.sendFile(path.join(__dirname, '..', 'public', 'Connect4.html'));
 });
 
 // GET users listing. 
 // init new table
 
 
 // Define the route handler for POST requests
 
 // gets what user clicked on
 // inserts users info into database
 // checks for winner --> if winner post winner
 router.post('/', async function(req, res, next){
   
  let gameBoard = []; // Define gameboard outside the loop
  let cellstate = 0;

  // Extract data from the request body
  const { row, column, player } = req.body;

  if (player == "Red"){
    cellstate = 1;
  } else if (player == "Yellow"){
    cellstate = 2;
  }


  //insert move into gameboard
  await client.query(`UPDATE ${tableMoves + req.user.username} SET cell_state = $1 WHERE column_number = $2 AND row_number = $3`, [cellstate, column, row], (err, result) => {
    if (err) {
      console.log("unable to query UPDATE");
      next(err);
      return; // Exit callback if error
    }
    });


  //get latest gameboard
  //get latest gameboard
for (let row = 0; row < 6; row++) {
  gameBoard[row] = []; // Initialize inner array
  for (let col = 0; col < 7; col++) {
    try {
      const result = await client.query(`SELECT cell_state FROM ${tableMoves + req.user.username} WHERE column_number = $1 AND row_number = $2`, [col, row]);
      if (result.rows.length > 0) {
        console.log(result.rows[0].cell_state); // Access the cell_state value from the result
        gameBoard[row][col] = result.rows[0].cell_state;
      } else {
        // Handle case when no rows are returned
        console.log(`No data found for row ${row}, column ${col}`);
      }
    } catch (err) {
      console.log("Unable to query SELECT:", err);
      // Handle the error if needed
    }
  }
}


  console.log(gameBoard);
 
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
            try {
              // Execute an UPDATE query to reset all cell state values to zero
              const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
              await client.query(query);
              console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
            } catch (error) {
              console.error("Error resetting cell state values:", error);
            }
               // If so, set the winner
               console.log("Red Wins");
               return res.json({ message: '/game?message=RED+Has+Won!!!'});
              
           }
 
           if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
            try {
              // Execute an UPDATE query to reset all cell state values to zero
              const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
              await client.query(query);
              console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
            } catch (error) {
              console.error("Error resetting cell state values:", error);
            }
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
          try {
            // Execute an UPDATE query to reset all cell state values to zero
            const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
            await client.query(query);
            console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
          } catch (error) {
            console.error("Error resetting cell state values:", error);
          }
             // If so, set the winner
             console.log("Red Wins");
             return res.json({ message: '/game?message=RED+Has+Won!!!'});
         }
 
         if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
          try {
            // Execute an UPDATE query to reset all cell state values to zero
            const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
            await client.query(query);
            console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
          } catch (error) {
            console.error("Error resetting cell state values:", error);
          }
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
        try {
          // Execute an UPDATE query to reset all cell state values to zero
          const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
          await client.query(query);
          console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
        } catch (error) {
          console.error("Error resetting cell state values:", error);
        }
         // If so, set the winner
         console.log("Red Wins");
         return res.json({ message: '/game?message=RED+Has+Won!!!'});
         
     }
 
     if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
      try {
        // Execute an UPDATE query to reset all cell state values to zero
        const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
        await client.query(query);
        console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
      } catch (error) {
        console.error("Error resetting cell state values:", error);
      }
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
            try {
              // Execute an UPDATE query to reset all cell state values to zero
              const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
              await client.query(query);
              console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
            } catch (error) {
              console.error("Error resetting cell state values:", error);
            }
           // If so, set the winner
           console.log("Red Wins");
           return res.json({ message: '/game?message=RED+Has+Won!!!'});
           
       }
   
       if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
        try {
          // Execute an UPDATE query to reset all cell state values to zero
          const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
          await client.query(query);
          console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
        } catch (error) {
          console.error("Error resetting cell state values:", error);
        }
         // If so, set the winner
         console.log("Yellow Wins");
         return res.json({ message: '/game?message=YELLOW+Has+Won!!!'});
        
   
       }
 
   }
 }
 
    res.json({ message: 'Received row and column data' });
   });
 
   
 
 
 module.exports = router;