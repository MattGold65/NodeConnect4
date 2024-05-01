var express = require('express');
var router = express.Router();
var path = require('path');
var env = require('dotenv').config();
var tableMoves = 'connect4_game_state_';
var tableGravity = 'connect4_gravity_state_'

const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect();

var passport = require('passport');
var bcrypt = require('bcryptjs');

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

async function setCellValue(req, cellstate) {
  await client.query(`UPDATE ${tableMoves + req.user.username} SET cell_state = $1, move_timestamp = CURRENT_TIMESTAMP WHERE column_number = $2 AND row_number = $3`, [cellstate, req.body.column, req.body.row], (err, result) => {
    if (err) {
      console.log("unable to query UPDATE");
      next(err);
      return;
    }
  });
}

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

function evaluateWindow(window, piece) {
  const PLAYER_PIECE = 1;
  const AI_PIECE = piece;
  const EMPTY = 0;

  let score = 0;
  let oppPiece = (piece === PLAYER_PIECE) ? AI_PIECE : PLAYER_PIECE;

  if (window.filter(item => item === piece).length === 4) {
    score += 100;
  } else if (window.filter(item => item === piece).length === 3 && window.filter(item => item === EMPTY).length === 1) {
    score += 5;
  } else if (window.filter(item => item === piece).length === 2 && window.filter(item => item === EMPTY).length === 2) {
    score += 2;
  }

  if (window.filter(item => item === oppPiece).length === 3 && window.filter(item => item === EMPTY).length === 1) {
    score -= 4;
  }

  return score;
}

function scorePosition(board, piece) {
  let score = 0;
  const ROW_COUNT = board.length;
  const COLUMN_COUNT = board[0].length;
  const WINDOW_LENGTH = 4;

  // Score center column
  let centerArray = board.map(row => row[Math.floor(COLUMN_COUNT / 2)]);
  let centerCount = centerArray.filter(i => i === piece).length;
  score += centerCount * 3;

  // Score Horizontal
  for (let r = 0; r < ROW_COUNT; r++) {
    let rowArray = [];
    for (let i = 0; i < COLUMN_COUNT; i++) {
      rowArray.push(parseInt(board[r][i]));
    }
    for (let c = 0; c < COLUMN_COUNT - 3; c++) {
      let window = rowArray.slice(c, c + WINDOW_LENGTH);
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

  // Score positive sloped diagonal
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

function isTerminalNode(board){
  return isWinningMove(1, board) || isWinningMove(2, board) || getValidLocations(board).length == 0
  
}

function miniMax(board, depth, alpha, beta, maximizingPlayer) {
  let validLocations = getValidLocations(board);
  let isTerminal = isTerminalNode(board);

  if (depth === 0 || isTerminal) {
    if (isTerminal) {
      if (isWinningMove(2, board)) {
        return [null, 100000000000000];
      } else if (isWinningMove(1, board)) {
        return [null, -10000000000000];
      } else {
        return [null, 0];
      }
    } else {
      return [null, scorePosition(board, 2)];
    }
  }

  if (maximizingPlayer) {
    let value = Number.NEGATIVE_INFINITY;
    let column = Math.floor(Math.random() * validLocations.length + 1);
    for (let col = 0; col < validLocations.length + 1; col++) {
      let row = getNextOpenRow(board, col);
      if (row != null) {
        let b_copy = getCopy(board);
        b_copy[row][col] = 2;
        let new_score = miniMax(b_copy, depth - 1, alpha, beta, false)[1];
        if (new_score > value) {
          value = new_score;
          column = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) {
          break;
        }
      }
    }
    return [column, value];
  } else {
    let value = Number.POSITIVE_INFINITY;
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
        beta = Math.min(beta, value);
        if (alpha >= beta) {
          break;
        }
      }
    }
    return [column, value];
  }
}

function isValidLocations(gameBoard, col) {
  console.log(gameBoard[0][col]);
  return gameBoard[0][col] === 0

}

function getValidLocations(gameboard) {
  let validLocations = [];

  for (let col = 0; col < 7; col++) {
    if (isValidLocations(gameboard, col)) {
      validLocations.push(col);

    }
  }
  return validLocations

}

function getNextOpenRow(gameboard, col) {
  for (let row = 5; row >= 0; row--) {
    if (gameboard[row][col] === 0) {
      return row
    }
  }
  return null;
}

//look into < vs <= for gameboard.length and valid locations.length the +1 in getBestMove may be redundent
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

router.get('/connect4', async function (req, res, next) {
  try {
    // Send the HTML file
    res.sendFile(path.join(__dirname, '..', 'public', 'Connect4.html'));
  } catch (error) {
    console.error('Error sending HTML file:', error);
    next(error);
  }
});

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

  if (isWinningMove(cellstate, gameBoard) && cellstate === 1) {
    setCellValues(req);
    setGravityValues(req);
    return res.json({ win: true, message: 'RED has won' });

  } else if (isWinningMove(cellstate, gameBoard) && cellstate === 2) {
    setCellValues(req);
    setGravityValues(req);
    return res.json({ win: true, message: 'YELLOW has won' });
  }
  //after checking if 1 one the game send instrcutions for 2's move to the front end
  if (cellstate === 1) {
    //res.json(getBestMove(gameBoard, 2));
    res.json(miniMax(gameBoard, 5, Number.NEGATIVE_INFINITY, Number.INFINITY, true)[0]);
  } else {
    res.json("Player Move");
  }
});

module.exports = router;