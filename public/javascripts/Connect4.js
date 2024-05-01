var RedPlayer = "Red";
var YellowPlayer = "Yellow";
var CurrentPlayer;
var gameOver = false;
var board;
var ColumnState = [5, 5, 5, 5, 5, 5, 5];
var BestMove;
var rows = 6;
var columns = 7;

/* 
While waiting for the minimax recursive algorithm to run this function will display a 
waiting message for the user. 
*/
function showWaitingMessage() {
  const waitingMessage = document.getElementById('waitingMessage');
  waitingMessage.style.display = 'block';
}

/* 
This function will hide the waiting message while the user is taking his turn
*/
function hideWaitingMessage() {
  const waitingMessage = document.getElementById('waitingMessage');
  waitingMessage.style.display = 'none';
}

/* 
This function will post the board game data to the server (backend) via JSON. Then the function awaits
a response from the server to see if a player has won the game from the move that was just posted. 
If a player has won the winner of the game is displayed in a message box and a green play again button
appears at the top of the screen.
*/
function setGameBoardData(row, column, gravityState) {
  // Post most recent move info to server via JSON.
  fetch('/game', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ row: row, column: column, player: CurrentPlayer, gravity: gravityState })
  })
  // Bad response? Return error via json.
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    // Absorb response from server.
    .then(data => {
      // If someone won the game (bool)...
      if (data.win) {
        const message = data.message;
        // Init div element.
        const winMessageElement = document.createElement('div');
        // assign text content of div object to message from server.
        winMessageElement.textContent = message;
        // Add div object with message to message element.
        document.getElementById('message').appendChild(winMessageElement);
        // Init the play again button.
        const playAgainButton = document.createElement('button');
        // Assign the text of the button to "play again".
        playAgainButton.textContent = "Play Again";
        // Create click event for play again button.
        playAgainButton.addEventListener("click", () => {
          // Just refreshes page (all data refreshes upon a players victory on backend).
          window.location.href = "/game/connect4";
        });
        // Add play again button to html.
        document.getElementById('message').appendChild(playAgainButton);
        // Set gameOver global var to True
        gameOver = true;
      } else {
        // Log if its the players move or what column on the board the ai has selected to play
        console.log(data);
        // If data isnt a string with the players move...
        if (data != "Player Move") {
          // its an int with the AI's column move
          BestMove = data;
        }
      }
    })
    // Catch any errors with the server response
    .catch(error => {
      // Log the error
      console.error('There was a problem with your fetch operation:', error);
    });
}

/*
This async function inits a Promise object. A promise object in JS is a way to handle asynchronous and has 3 states

1) Pending: Inital state of Promise. State where object is still pending (not fufilled or rejected).

2) Fufilled: Operation is completed sucesfully and has a resolve value.

3) Rejected: Operation failed - promise has reason for failure.
*/
async function waitForBestMove() {
  return new Promise(resolve => {
    // Define a function to check if BestMove is updated.
    function checkBestMove() {
      // If BestMove is updated, resolve the promise
      if (BestMove !== undefined) {
        resolve();
      } else {
        // If not updated, recursive call after 1 second
        setTimeout(checkBestMove, 100);
      }
    }
    // Call checkBestMove within function
    checkBestMove();
  });
}


/*
This async function implements the AI's move on the front end. 
*/
async function placeYellowPiece() {

  // Show waiting message before AI move
  showWaitingMessage();
  // Exit the function if the game is over
  if (gameOver) {
    return;
  }

  // Wait for the AI to calculate its best move from backend
  await waitForBestMove();

  // Origionally a random column now AI's best move
  const randomColumn = BestMove;

  // Find the corresponding row to drop the piece into based on the ColumnState of the column selected by the AI
  const row = ColumnState[randomColumn];

  // Assign a selector to the selector with the corresponding row and column that the piece will fall into
  const selector = `.cell[data-row="${row}"][data-column="${randomColumn}"]`;

  // Log the AI's selector to the front end
  console.log("Selector:", selector);

  // Assign selector query to cellDiv const
  const cellDiv = document.querySelector(selector);

  // Update decrement the gravity state for the next move in the column that the AI played
  const gravityState = --ColumnState[randomColumn];

  // Send the row and column that the AI played to the server. This will be stored in player database on backend
  setGameBoardData(row, randomColumn, gravityState);

  // Assign the appropriate class to the cell
  cellDiv.classList.add("yellow-piece");

  // Switch the current player to the Red (user) player
  CurrentPlayer = RedPlayer;

  // Reinit BestMove. Wait for AI again when it makes its next move
  BestMove = undefined;

  // Hide waiting message after AI move or during player move
  hideWaitingMessage();
}

// This async function takes a setPiece
async function setPiece(event) {
  if (gameOver) {
    return;
  }

  // Check if it's the current player's turn
  if (CurrentPlayer === RedPlayer) {
    const target = event.target;
    const column = parseInt(target.getAttribute('data-column'));
    let row = ColumnState[column]; // Retrieve the current row from ColumnState

    if (column < 0 || row < 0) {
      return;
    }

    // Select the cell to place the piece
    const selector = `.cell[data-row="${row}"][data-column="${column}"]`;
    const cellDiv = document.querySelector(selector);

    // Update the ColumnState and set the gravityState
    const gravityState = --ColumnState[column];

    // Send row and column data to the server
    setGameBoardData(row, column, gravityState);

    // Check the current player and assign the appropriate class
    cellDiv.classList.add("red-piece");
    CurrentPlayer = YellowPlayer; // Switch to the next player

    // Trigger Yellow's move after a delay
    //30
    placeYellowPiece(); // Adjust delay as needed

  }
}

/* This function initalizes the board, creates 42 cell elements (6x7) within the board.
   Also calls setPiece function on a user click event on a cell.*/
function createCells() {
  //select board from html and assign to board var
  board = document.querySelector('.board');
  //for each cell on the board
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement('div');
    //add new cell div
    cell.classList.add('cell');
    // Multiple of 7 creates a new column
    cell.setAttribute('data-column', i % 7);
    // Divide By 7 to reset count for each new row
    cell.setAttribute('data-row', Math.floor(i / 7));

    // cell to board
    board.appendChild(cell);
    cell.addEventListener("click", setPiece);

  }
}

// Function to load the game state from localStorage
function getGameState() {
  // Retrieve the current player from local storage
  CurrentPlayer = localStorage.getItem('CurrentPlayer');
  // If the current player is not stored in local storage, default to RedPlayer
  if (!CurrentPlayer) {
    CurrentPlayer = RedPlayer;
  }
}

// Function to update the game board UI based on the loaded game state
function setGameBoardUI(gameBoard) {
  // Loop through the game board data and update the UI
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const selector = `.cell[data-row="${row}"][data-column="${col}"]`;
      const cellDiv = document.querySelector(selector);
      const cellState = gameBoard[row][col];
      // Update the cell class based on the cell state
      if (cellState === 1) {
        cellDiv.classList.add("red-piece");
      } else if (cellState === 2) {
        cellDiv.classList.add("yellow-piece");
      }
    }
  }
}

function setGravity(gravState) {
  for (let col = 0; col < columns; col++) {
    ColumnState[col] = gravState[col];
  }
}

function setPlayer(CellState) {
  if (CellState === 2 || CellState === 0) {
    CurrentPlayer = RedPlayer;
  } else if (CellState === 1) {
    CurrentPlayer = YellowPlayer;
  }
}

// Function to fetch the game board data from the backend
function getGameBoardData() {
  fetch('/game')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Process the game board data as usual
      setGameBoardUI(data.gameBoard);
      setGravity(data.ColumnState);
      setPlayer(data.CellState);
    })
    .catch(error => {
      console.error('There was a problem with fetching game board data:', error);
    });
}

window.onload = function () {
  // Add event listener to the always visible return home button
  const alwaysReturnHomeButton = document.getElementById('alwaysReturnHomeButton');
  alwaysReturnHomeButton.addEventListener("click", () => {
    // Redirect to return home
    window.location.href = "/users/login";
  });
  createCells();
  getGameState();
  getGameBoardData();

};