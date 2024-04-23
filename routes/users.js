var express = require('express');
var router = express.Router();
var tableName = `connect4_moves_${Date.now()}`
var gameBoard = [];

var path = require('path');
var env = require('dotenv').config();

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();


router.get('/', function(req, res, next) {
   // Execute the SQL statement to create the table

   const createTableQuery = `
   CREATE TABLE IF NOT EXISTS ${tableName} (
       id SERIAL PRIMARY KEY,
       player VARCHAR(10) NOT NULL,
       column_number INT NOT NULL,
       row_number INT NOT NULL,
       move_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )
`;
client.query(createTableQuery)
.then((result) => {
    console.log('Table created successfully:', result.command);
    res.sendFile(path.join(__dirname, '..', 'public', 'Connect4.html'));
})
.catch((error) => {
    console.error('Error creating table:', error);
    // Respond with an error
    res.status(500).json({ error: 'Error creating table' });
});

  //rows
  for (let i = 0; i < 6; i++) {
    gameBoard[i] = [];
  //columns
    for (let j = 0; j < 7; j++) {
      gameBoard[i][j] = 0; 
    }
  }

res.sendFile(path.join(__dirname,'..', 'public','Connect4.html'));
});

// GET users listing. 
// init new table
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


// Define the route handler for POST requests

// gets what user clicked on
// inserts users info into database
// checks for winner --> if winner post winner
router.post('/', function(req, res, next){
  // Extract data from the request body
  const { row, column, player } = req.body;
  
  
  client.query(`INSERT INTO ${tableName} (player, column_number, row_number) VALUES($1, $2, $3)`, [player, column, row], function(err, result) {
    if (err) {
      console.log("unable to query INSERT");
      next(err);
    }
  });

  client.query(`Select column_number, row_number FROM ${tableName} WHERE player = $1`, [player], (err, result) => {
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
              res.json({ message: '/Connect4?message=RED+Has+Won!!!'});
              return;
          }

          if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
            // If so, set the winner
            console.log("Yellow Wins");
            res.json({ message: '/Connect4?message=YELLOW+Has+Won!!!'});
            return;
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
            res.json({ message: '/Connect4?message=RED+Has+Won!!!'});
        }

        if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
          // If so, set the winner
          console.log("Yellow Wins");
          res.json({ message: '/Connect4?message=YELLOW+Has+Won!!!'});
          return;

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
        res.json({ message: '/Connect4?message=RED+Has+Won!!!'});
        return;
    }

    if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
      // If so, set the winner
      console.log("Yellow Wins");
      res.json({ message: '/Connect4?message=YELLOW+Has+Won!!!'});
      return;

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
          res.json({ message: '/Connect4?message=RED+Has+Won!!!'});
          return;
      }
  
      if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
        // If so, set the winner
        console.log("Yellow Wins");
        res.json({ message: '/Connect4?message=YELLOW+Has+Won!!!'});
        return;
  
      }

  }
}

   res.json({ message: 'Received row and column data' });
  });

  });

  


module.exports = router;