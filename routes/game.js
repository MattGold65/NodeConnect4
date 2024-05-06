/*
Connect4 Game router. Backend to Connect 4 Game.
Stores and updates game current game state, calculates AI's move, checks for winner.
*/

var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var tableMoves = 'connect4_game_state_';
var tableGravity = 'connect4_gravity_state_';
var tableWL = 'connect4_W_L_Record_';

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect();

var passport = require('passport');
var bcrypt = require('bcryptjs');

// Function that resets all the cell states to 0 in the game state table when there is a winner
async function setCellValues(req) {
  try {
    // Execute an UPDATE query to reset all cell state values to zero
    const query = `UPDATE ${tableMoves + req.user.username} SET cell_state = 0`;
    await client.query(query);
    console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
  } catch (error) {
    console.error("Error resetting cell state values:", error);
  }
}

// Function that resets all column depth or gavity values to 5 when there is a winner
async function setGravityValues(req) {
  try {
    // Execute an UPDATE query to reset all cell state values to zero
    const query = `UPDATE ${tableGravity + req.user.username} SET row_height = 5`;
    await client.query(query);
    console.log(`Reset all cell state values to zero in table ${tableMoves + req.user.username}`);
  } catch (error) {
    console.error("Error resetting cell state values:", error);
  }

}

// Function stores the game move along with a timestamp of when the move was made in the game table
async function setCellValue(req, cellstate) {
  await client.query(`UPDATE ${tableMoves + req.user.username} SET cell_state = $1, move_timestamp = CURRENT_TIMESTAMP WHERE column_number = $2 AND row_number = $3`, [cellstate, req.body.column, req.body.row], (err, result) => {
    if (err) {
      console.log("unable to query UPDATE");
      next(err);
      return;
    }
  });
}

// Function updates the cell depth or gravity value of a column when a player places a piece in the column
async function setGavityValue(req) {

  //insert move into gameboard
  await client.query(`UPDATE ${tableGravity + req.user.username} SET row_height = $1 WHERE column_number = $2`, [req.body.gravity, req.body.column], (err, result) => {
    if (err) {
      console.log("unable to query UPDATE gravity");
      next(err);
      return;
    }
  });
}
// Function that updates the users game record with a win or loss when the game ends.
async function setResult(req, result) {
  try {
     
      const query = `INSERT INTO ${tableWL + req.user.username} (Win_or_Loss) VALUES ($1)`;
      await client.query(query, [result]);
      console.log(`Inserted game result ${result}`);
  } catch (error) {
      console.error("Error inserting game result:", error);
  }
}

/*
Function that updates the gameboard[row][col] double matrix with all the data thats stored in the table holding player moves. 
Once each cell has been iterated over and updated from the table the function returns an updated gameboard
*/
async function getCellValues(req, gameBoard) {
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
/* 
Function that updates the ColumnState[col] matrix with the current row depth or gavity states of each cell.
Once each col has been iterated over and updated from the table the function returns an updated columnstate variable
*/
async function getColumnState(req, ColumnState) {

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

/*
Function that returns the player that made the last game move by querying the latest move timestamp
*/
async function getCurrentPlayer(req) {

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

/*
Function that scores a 'window' thats passed into the function
 --> A 'window' describes a group of 4 cells that are in a row either horizontally, vertically, diagonally, or reverse diagonally
 In essense a window is a possible way for someone to win a game of connect4 on the board.
 The piece parameter is the player who is making the turn (will always be 2 because the AI plays as yellow)
 This function is how AI evaluates a possible move it can make.
*/
function evaluateWindow(window, piece) {
  // Player (red) cell state always 1
  const PLAYER_PIECE = 1;
  // Ai (yellow) cell state always 2
  const AI_PIECE = piece;
  // Empty cell on board always 0
  const EMPTY = 0;

  // init score to 0
  let score = 0;

  // oppPiece will always assign to the players piece because only the Ai uses this scoring logic in game
  // oppPiece is opposite of piece thats passed into function
  let oppPiece = (piece === PLAYER_PIECE) ? AI_PIECE : PLAYER_PIECE;

  /*
  NOTE: The AI isnt scoring the ACTUAL board rather it is making copies of the board and scoring every possible move it can make.
  will get to this in depth shortly
  */

  // If a window has four yellow pieces in a row - score the move 100 points
  if (window.filter(item => item === piece).length === 4) {
    score += 100;
    // If a window has 3 yellow pieces in a row and an empty cell - score the move 5 points
  } else if (window.filter(item => item === piece).length === 3 && window.filter(item => item === EMPTY).length === 1) {
    score += 5;
    // If a window has 2 yellow pieces in a row and 2 empty cells - score the move 2 points
  } else if (window.filter(item => item === piece).length === 2 && window.filter(item => item === EMPTY).length === 2) {
    score += 2;
  }
    // If a window has 3 red pieces (OPPONENT) in a row and an empty cell - deduct 4 points from the score
  if (window.filter(item => item === oppPiece).length === 3 && window.filter(item => item === EMPTY).length === 1) {
    score -= 4;
  }
  //return the total score
  return score;
}

/*
Function passes in the piece the current board state. Function iterates over the board
and uses the evaluate window function to score every possible window going vertically,
horizontally, diagonally and reverse diagonally
*/
function scorePosition(board, piece) {
  let score = 0;
  //6
  const ROW_COUNT = board.length;
  //7
  const COLUMN_COUNT = board[0].length;
  const WINDOW_LENGTH = 4;

  // Score center column cell in each row with a 3x multiplyer
  // Connect 4 strategy says the center column is the most important
  // So reward ai for going center cell in each row
  let centerArray = board.map(row => row[Math.floor(COLUMN_COUNT / 2)]);
  let centerCount = centerArray.filter(i => i === piece).length;
  score += centerCount * 3;

  // Score Horizontal
  // for each row
  for (let r = 0; r < ROW_COUNT; r++) {
    // init an empty row array
    let rowArray = [];
    // for each  column in the row
    for (let i = 0; i < COLUMN_COUNT; i++) {
      //push cell states (player moves) at each cell into the row array
      rowArray.push(parseInt(board[r][i]));
    }

    // iterate over each column that can be length of window (7-3=4)
    for (let c = 0; c < COLUMN_COUNT - 3; c++) {
      //for each column take a slice of the row array - the slice being the window
      let window = rowArray.slice(c, c + WINDOW_LENGTH);
      //score the window
      score += evaluateWindow(window, piece);
    }
  }

  // Score Vertical
  for (let c = 0; c < COLUMN_COUNT; c++) {
    let colArray = [];
    for (let i = 0; i < board.length; i++) {
      colArray.push(parseInt(board[i][c]));
    }
    for (let r = 0; r < ROW_COUNT - 3; r++) {
      let window = colArray.slice(r, r + WINDOW_LENGTH);
      score += evaluateWindow(window, piece);
    }
  }

  // Score positive sloped diagonal (subtract 3 because cannot have diagonal connect4 in first three rows or cols)
  for (let r = 0; r < ROW_COUNT - 3; r++) {
    let window = [];
    for (let c = 0; c < COLUMN_COUNT - 3; c++) {
      for (let i = 0; i < WINDOW_LENGTH; i++) {
        window.push(board[r + i][c + i]);
      }
      score += evaluateWindow(window, piece);
    }
  }

  // Score negative sloped diagonal
  for (let r = 0; r < ROW_COUNT - 3; r++) {
    let window = [];
    for (let c = 0; c < COLUMN_COUNT - 3; c++) {
      for (let i = 0; i < WINDOW_LENGTH; i++) {
        window.push(board[r + 3 - i][c + i]);
      }
      score += evaluateWindow(window, piece);
    }
  }
  return score;
}

/* Function checks to see if a col on the gameboard is open or not.
If the top cell (index 0) ===0 the column is full and the move is 
NOT VALID
*/
function isValidLocations(gameBoard, col) {
  console.log(gameBoard[0][col]);
  return gameBoard[0][col] === 0

}

// Function takes a gameboard as a parameter and returns an array of valid locations 
function getValidLocations(gameboard) {
  let validLocations = [];

  for (let col = 0; col < 7; col++) {
    if (isValidLocations(gameboard, col)) {
      validLocations.push(col);

    }
  }
  return validLocations

}

// Function returns the next open row in a col if it is not already full
function getNextOpenRow(gameboard, col) {
  for (let row = 5; row >= 0; row--) {
    if (gameboard[row][col] === 0) {
      return row
    }
  }
  return null;
}

/*
Makes a copy of the gameboard double array. Needed for AI
to evaluate different possible moves it can make on the board.
Dont want to overwrite actual gameboard in memory so copy function
needed.
*/
function getCopy(gameboard) {
  let tempgameboard = [];
  for (let i = 0; i < gameboard.length; i++) {
    tempgameboard[i] = [];
    for (let j = 0; j < gameboard[i].length; j++) {
      tempgameboard[i][j] = gameboard[i][j];
    }
  }
  return tempgameboard;
}

/*
Function takes in a cell state (Red 1 or Yellow 2) and a gameboard (can be actual or a copy for ai) and
checks to see if a winning move has been made by checking windows (4 in a row) 
vertically, horizontally, diagonally, and reverse diagonally
*/
function isWinningMove(cellState, gameBoard) {

  //Condition 1 - Horizontally
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {

      const cell1 = gameBoard[i][j];
      const cell2 = gameBoard[i][j + 1];
      const cell3 = gameBoard[i][j + 2];
      const cell4 = gameBoard[i][j + 3];

      if ((cell1 == cellState) && (cell2 == cellState) && (cell3 == cellState) && (cell4 == cellState)) {
        return true;
      }
    }
  }

  //Condition 2 - Vertically
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 7; j++) {

      const cell1 = gameBoard[i][j];
      const cell2 = gameBoard[i + 1][j];
      const cell3 = gameBoard[i + 2][j];
      const cell4 = gameBoard[i + 3][j];

      if ((cell1 == cellState) && (cell2 == cellState) && (cell3 == cellState) && (cell4 == cellState)) {
        return true;
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

      if ((cell1 == cellState) && (cell2 == cellState) && (cell3 == cellState) && (cell4 == cellState)) {
        return true;

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
      if ((cell1 == cellState) && (cell2 == cellState) && (cell3 == cellState) && (cell4 == cellState)) {
        return true;
      }
    }
  }
}

/*
Checks for a terminal node - a state that would ultimatley end the recursive call of minimax algorithm
Checks if the move is a winning move for Red or Yellow or the board is full (tie)
*/
function isTerminalNode(board){
  return isWinningMove(1, board) || isWinningMove(2, board) || getValidLocations(board).length == 0
  
}

//Minimax is recursive algorith (AI) that allows use to 
/*
https://www.youtube.com/watch?v=MMLtza3CZFM&ab_channel=KeithGalli
board --> the gameboard (state) the minimax evaluates
depth --> how many moves ahead we want to search
Alpha --> the best alternative for the Ai (the max player)
Beta --> the best alternative for the use (the min player)
maximizingPlayer --> bool; true = AI, false = user
*/
function miniMax(board, depth, alpha, beta, maximizingPlayer) {
  let validLocations = getValidLocations(board);
  let isTerminal = isTerminalNode(board);

  // if depth is 0 or we're in a terminal state
  if (depth === 0 || isTerminal) {
    //if we're in a terminal state
    if (isTerminal) {
      //if the AI won
      if (isWinningMove(2, board)) {
        // return a really big number and a null col --> game over
        return [null, 100000000000000];
        // else if the user won
      } else if (isWinningMove(1, board)) {
        // return a really small number and a null col --> game over
        return [null, -10000000000000];
      } else {
        // otherwise return null and 0 --> must be a tie
        return [null, 0];
      }
    } else {
      //if the depth is 0 score the position of the board for the AI (yellow)
      return [null, scorePosition(board, 2)];
    }
  }
  //if its the maximizing Player or AI
  if (maximizingPlayer) {
    //initalizes value to a really small number
    let value = Number.NEGATIVE_INFINITY;
    //pick a random column
    let column = Math.floor(Math.random() * validLocations.length + 1);
    //iterate over cols that are valid location (have empty cells)
    //IN THIS FOR LOOP THE AI IS ESSENTIALLY EVALUATING ALL OF ITS OPTIONS
    for (let col = 0; col < validLocations.length + 1; col++) {
      //get the next open row in that column 
      let row = getNextOpenRow(board, col);
      // if the column isnt full
      if (row != null) {
        //make a copy of the gameboard
        let b_copy = getCopy(board);
        //insert a yellow piece in the open cell
        b_copy[row][col] = 2;
        //recursively call minimax algo on the copy gameboard
        //we subtract the depth by 1 because we are evaluating one move closer to the present
        //index one to return a score not the column
        //set maxplayer to false indicating its users turn
        let new_score = miniMax(b_copy, depth - 1, alpha, beta, false)[1];
        //if the new score is bigger than value (initalized as negative infinity)
        if (new_score > value) {
          //set the score to be the value
          value = new_score;
          //set the column to be the column associated with that score
          column = col;
        }
        //assign alpha to either alpha or the max value
        alpha = Math.max(alpha, value);
        //if the maximizing player (alpha) has an as good or better move than min player (beta)
        if (alpha >= beta) {
          //break the for loop
          break;
        }
      }
    }
    // return the highest value and column associated with that value
    return [column, value];
    //logic for min player
  } else {
    //init value to really big number
    let value = Number.POSITIVE_INFINITY;
    //select random column
    let column = Math.floor(Math.random() * validLocations.length + 1);
    for (let col = 0; col < validLocations.length + 1; col++) {
      let row = getNextOpenRow(board, col);
      if (row != null) {
        let b_copy = getCopy(board);
        //drop the piece
        b_copy[row][col] = 1;
        let new_score = miniMax(b_copy, depth - 1, alpha, beta, true)[1];
        if (new_score < value) {
          value = new_score;
          column = col;
        }
        //assign beta to the lower value of beta or value
        beta = Math.min(beta, value);
        //if alpha is greater than or equal to beta
        if (alpha >= beta) {
          //break
          break;
        }
      }
    }
    //return the lowest value and column asssociated with that value
    return [column, value];
  }
}
//old AI that doesnt look ahead
function getBestMove(gameboard, piece) {
  let bestscore = -1000;
  let validLocations = getValidLocations(gameboard);
  console.log(validLocations);
  //console.log(validLocations.length);
  //random column of the valid locations
  let best_col = validLocations[Math.floor(Math.random() * (validLocations.length + 1))]
  for (let col = 0; col < validLocations.length + 1; col++) {
    let openrow = getNextOpenRow(gameboard, col);
    //gameboard.copy() - dont modify actual gameboard
    //check if the row is not closed
    if (openrow != null) {
      let tempgameboard = getCopy(gameboard);
      //place the piece at that location in the temp gameboard
      tempgameboard[openrow][col] = piece;
      let score = scorePosition(tempgameboard, piece)
      console.log("for col: " + col + " and player " + piece + " --> " + score)
      if (score > bestscore) {
        bestscore = score;
        //console.log("the best score for the " + piece + " is " + bestscore);
        best_col = col;
      }

    }
  }
  console.log("player " + piece + " should play the col " + best_col);
  return best_col;
}
//get request that sends the most rcent game data to the front end
router.get('/', async function (req, res, next) {
  try {
    let gameBoard = []
    let ColumnState = []
    let CurrentPlayer = 0;

    gameBoard = await getCellValues(req, gameBoard);
    ColumnState = await getColumnState(req, ColumnState);
    CurrentPlayer = await getCurrentPlayer(req);

    // Send the game board data as JSON to front end
    res.json({ gameBoard: gameBoard, ColumnState: ColumnState, CellState: CurrentPlayer });

  } catch (error) {
    console.error('Error retrieving game state:', error);
    next(error);
  }
});

//sends html file to the front end
router.get('/connect4', async function (req, res, next) {
  try {
    // Send the HTML file
    res.sendFile(path.join(__dirname, '..', 'public', 'Connect4.html'));
  } catch (error) {
    console.error('Error sending HTML file:', error);
    next(error);
  }
});

//post retrives most recent move from front end and stores info in player game tables
router.post('/', async function (req, res, next) {

  let gameBoard = [];
  //let columnState = [];
  let cellstate = 0;

  // Extract data from the request body
  const { row, column, player, gravity } = req.body;

  if (player == "Red") {
    cellstate = 1;
  } else if (player == "Yellow") {
    cellstate = 2;
  }

  await setCellValue(req, cellstate);

  await setGavityValue(req);

  //get latest gameboard
  gameBoard = await getCellValues(req, gameBoard);

  //if red had a winning move
  if (isWinningMove(cellstate, gameBoard) && cellstate === 1) {
    setCellValues(req);
    setGravityValues(req);
    setResult(req,"Win");
    return res.json({ win: true, message: 'RED has won' });
    //if yellow had a winning move
  } else if (isWinningMove(cellstate, gameBoard) && cellstate === 2) {
    setCellValues(req);
    setGravityValues(req);
    setResult(req,"Loss");
    return res.json({ win: true, message: 'YELLOW has won' });
  }
  //after checking if 1 one the game send instrcutions for 2's move to the front end
  if (cellstate === 1) {
    //sends ai's column move from minimax to front end.
    res.json(miniMax(gameBoard, 5, Number.NEGATIVE_INFINITY, Number.INFINITY, true)[0]);
  } else {
    res.json("Player Move");
  }
});

module.exports = router;