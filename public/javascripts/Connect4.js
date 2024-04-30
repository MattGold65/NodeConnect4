var RedPlayer = "Red";
var YellowPlayer = "Yellow";
var CurrentPlayer;
var gameOver = false;
var board;
var ColumnState = [5,5,5,5,5,5,5];
var BestMove;

var rows = 6;
var columns = 7;

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

        // add board to html
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

// Function to fetch the game board data from the backend
function getGameBoardData() {
    fetch('/game') // Replace 'your-backend-endpoint' with the actual endpoint
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

  function setGravity(gravState){
    for (let col = 0; col < columns; col++) {
        ColumnState[col] = gravState[col];
  }
}

function setPlayer(CellState){
     if (CellState === 2 || CellState === 0) {
        CurrentPlayer = RedPlayer;
    } else if (CellState === 1) {
        CurrentPlayer = YellowPlayer;
    }
}

function setGameBoardData(row, column, gravityState){
  // Send row and column data to the server
  fetch('/game', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ row: row, column: column, player: CurrentPlayer, gravity: gravityState})
})
.then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
})
.then(data => {
    if (data.win) {
                const message = data.message;
                const winMessageElement = document.createElement('div');
                winMessageElement.textContent = message;
                // Add the win message to a specific element in your HTML
                document.getElementById('message').appendChild(winMessageElement);

                // Display buttons for playing again and returning home
                const playAgainButton = document.createElement('button');
                playAgainButton.textContent = "Play Again";
                playAgainButton.addEventListener("click", () => {
                    // Redirect to play again
                    window.location.href = "/game/connect4";
                });
                document.getElementById('message').appendChild(playAgainButton);
                gameOver = true;
    } else {
        // server will send best move
        console.log(data);
        BestMove = data;
    }
})
.catch(error => {
    console.error('There was a problem with your fetch operation:', error);
});
}
//AI impmenetation
function placeYellowPiece() {
  if (gameOver) {
    return;
}

  // Choose a random column from available columns
  //const randomColumnIndex = Math.floor(Math.random() * availableColumns.length);
  const randomColumn = BestMove;

  // Find the corresponding row for the chosen column
  const row = ColumnState[randomColumn];

  // Select the cell to place the piece
  const selector = `.cell[data-row="${row}"][data-column="${randomColumn}"]`;
  const cellDiv = document.querySelector(selector);

  // Update the ColumnState and set the gravityState
  const gravityState = --ColumnState[randomColumn];

  // Send row and column data to the server
  setGameBoardData(row, randomColumn, gravityState);

  // Assign the appropriate class to the cell
  cellDiv.classList.add("yellow-piece");

  // Switch to the next player
  CurrentPlayer = RedPlayer;
}


function setPiece(event) {
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
      setTimeout(placeYellowPiece, 2000); // Adjust delay as needed
  }
}

window.onload = function() {
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