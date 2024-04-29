var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var tableMoves = `connect4_game_state_`;
var tableGravity = 'connect4_gravity_state_'

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
}); 
client.connect();

var passport = require('passport');
var bcrypt = require('bcryptjs');

async function setCellValues(req){
  try {
    // Execute an UPDATE query to reset all cell state values to zero
    const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
    await client.query(query);
    console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
  } catch (error) {
    console.error("Error resetting cell state values:", error);
  }

}

async function setGravityValues(req){
  try {
    // Execute an UPDATE query to reset all cell state values to zero
    const query = `UPDATE ${tableGravity + req.user.username} SET row_height = 5`;
    await client.query(query);
    console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
  } catch (error) {
    console.error("Error resetting cell state values:", error);
  }

}

async function setCellValue(req, cellstate){
  await client.query(`UPDATE ${tableMoves + req.user.username} SET cell_state = $1, move_timestamp = CURRENT_TIMESTAMP WHERE column_number = $2 AND row_number = $3`, [cellstate, req.body.column, req.body.row], (err, result) => {
    if (err) {
      console.log("unable to query UPDATE");
      next(err);
      return; 
    }
    });
}

async function setGavityValue(req){

  //insert move into gameboard
  await client.query(`UPDATE ${tableGravity + req.user.username} SET row_height = $1 WHERE column_number = $2`, [req.body.gravity, req.body.column], (err, result) => {
    if (err) {
      console.log("unable to query UPDATE gravity");
      next(err);
      return;
    }
    });
}

async function getCellValues(req, gameBoard){
  for (let row = 0; row < 6; row++) {
    gameBoard[row] = []; // Initialize inner array
    for (let col = 0; col < 7; col++) {
      try {
        const result = await client.query(`SELECT cell_state FROM ${tableMoves + req.user.username} WHERE column_number = $1 AND row_number = $2`, [col, row]);
        if (result.rows.length > 0) {
          gameBoard[row][col] = result.rows[0].cell_state;
        } else {
          console.log(`No data found for row ${row}, column ${col}`);
        }
      } catch (err) {
        console.log("Unable to query SELECT:", err);
      }
    }
  }
  return gameBoard;
}

async function getColumnState(req, ColumnState){

  for (let col = 0; col < 7; col++) {
    try {
      const result = await client.query(`SELECT row_height FROM ${tableGravity + req.user.username} WHERE column_number = $1`, [col]);
      if (result.rows.length > 0) {
        ColumnState[col] = result.rows[0].row_height;
      } else {
        console.log(`No data found for gravity at column ${col}`);
      }
    } catch (err) {
      console.log("Unable to query SELECT:", err);
    }
  }
  return ColumnState;
}

async function getCurrentPlayer(req){

  try {
    const result = await client.query(`
    SELECT cell_state FROM ${tableMoves + req.user.username}
    ORDER BY move_timestamp DESC
    LIMIT 1
  `);
    if (result.rows.length > 0) {
      //the current player
      return result.rows[0].cell_state;
    } else {
      console.log(`No data found for cell state`);
    }
  } catch (err) {
    console.log("Unable to query Order cell_state:", err);
  }
}




router.get('/', async function(req, res, next) {
  try {
    let gameBoard = []
    let ColumnState = []
    let CurrentPlayer = 0;

    gameBoard = await getCellValues(req, gameBoard);
    ColumnState = await getColumnState(req, ColumnState);
    CurrentPlayer = await getCurrentPlayer(req);

    // Send the game board data as JSON to front end
    res.json({ gameBoard: gameBoard, ColumnState: ColumnState, CellState: CurrentPlayer});
    
  } catch (error) {
    console.error('Error retrieving game state:', error);
    next(error);
  }
});

router.get('/connect4', async function(req, res, next) {
  try {
    // Send the HTML file
    res.sendFile(path.join(__dirname, '..', 'public', 'Connect4.html'));
  } catch (error) {
    console.error('Error sending HTML file:', error);
    next(error);
  }
});
 
 router.post('/', async function(req, res, next){
   
  let gameBoard = [];
  //let columnState = [];
  let cellstate = 0;

  // Extract data from the request body
  const { row, column, player, gravity } = req.body;

  if (player == "Red"){
    cellstate = 1;
  } else if (player == "Yellow"){
    cellstate = 2;
  }

  await setCellValue(req, cellstate);
  
  await setGavityValue(req);

  //get latest gameboard
  gameBoard = await getCellValues(req, gameBoard);

     //Condition 1 - Horizontally
     for (let i = 0; i < 6; i++) {
         for (let j = 0; j < 7; j++) {
 
           const cell1 = gameBoard[i][j];   
           const cell2 = gameBoard[i][j + 1];
           const cell3 = gameBoard[i][j + 2];
           const cell4 = gameBoard[i][j + 3];
 
           if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
              setCellValues(req);
              setGravityValues(req);
              return res.json({ win: true, message: 'RED has won' });
           }
 
           if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
            setCellValues(req);
            setGravityValues(req);
            return res.json({ win: true, message: 'YELLOW has won' });
         }
         }
     }
 
    //Condition 2 - Vertically
   for (let i = 0; i < 3; i++) {
     for (let j = 0; j < 7; j++) {
 
         const cell1 = gameBoard[i][j];   
         const cell2 = gameBoard[i+1][j];
         const cell3 = gameBoard[i+2][j];
         const cell4 = gameBoard[i+3][j];
 
         if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
          setCellValues(req);
          setGravityValues(req);
            return res.json({ win: true, message: 'RED has won' });
         }
 
         if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
          setCellValues(req);
          setGravityValues(req);
          return res.json({ win: true, message: 'YELLOW has won' });
 
         }
         }
     }
 
   // Check for diagonal win from bottom-left to top-right
   for (let i = 3; i < 6; i++) { 
     for (let j = 0; j < 4; j++) { 
 
       const cell1 = gameBoard[i][j];   
       const cell2 = gameBoard[i - 1][j + 1];
       const cell3 = gameBoard[i - 2][j + 2];
       const cell4 = gameBoard[i - 3][j + 3];
 
       if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
        setCellValues(req);
        setGravityValues(req);
        return res.json({ win: true, message: 'RED has won' });
         
     }
 
     if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
      setCellValues(req);
      setGravityValues(req);
      return res.json({ win: true, message: 'YELLOW has won' });
      
     }
        
     }
 }
 
 
 // Check for diagonal win from top-left to bottom-right
 for (let i = 0; i < 3; i++) {
   for (let j = 0; j < 4; j++) { 
 
       const cell1 = gameBoard[i][j];   
       const cell2 = gameBoard[i + 1][j + 1];
       const cell3 = gameBoard[i + 2][j + 2];
       const cell4 = gameBoard[i + 3][j + 3];
          if ((cell1 == 1) && (cell2 == 1) && (cell3 == 1) && (cell4 == 1)) {
            setCellValues(req);
            setGravityValues(req);
           return res.json({ win: true, message: 'RED has won' }); 
       }
   
       if ((cell1 == 2) && (cell2 == 2) && (cell3 == 2) && (cell4 == 2)) {
        setCellValues(req);
        setGravityValues(req);
         return res.json({ win: true, message: 'YELLOW has won' });
       }
   }
 }
    res.json({ message: 'Received row and column data' });
   });
 
 module.exports = router;