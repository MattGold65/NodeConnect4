var RedPlayer = "Red";
var YellowPlayer = "Yellow";
var CurrentPlayer = RedPlayer;

var gameOver = false;
var board;
var ColumnState;

var rows = 6;
var columns = 7;

function createCells() {
    //select board from html and assign to board var
    board = document.querySelector('.board');
    //implements gravity
    ColumnState = [5,5,5,5,5,5,5];
    //for each cell on the board
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        //add new cell div
        cell.classList.add('cell');
        // Multiple of 7 creates a new column
        cell.setAttribute('data-column', i % 7);
        // Divide By 7 to reset count for each new row
        cell.setAttribute('data-row', Math.floor(i / 7));

        cell.addEventListener("click", setPiece);
        // add board to html
        board.appendChild(cell);

        cell.addEventListener("click", setPiece);
    }
}

// In connect4.js

// Function to save the game state to localStorage
function saveGameState() {
    localStorage.setItem('connect4GameState', JSON.stringify(gameBoard));
}

// Function to load the game state from localStorage
function loadGameState() {
    const savedGameState = localStorage.getItem('connect4GameState');
    if (savedGameState) {
        gameBoard = JSON.parse(savedGameState);
        // Code to update the game board UI based on the loaded game state
        // For example, update the cell classes based on the values in gameBoard
    }
}


function setPiece(event) {
    if (gameOver) {
        return;
    }
    const target = event.target;
    const column = parseInt(target.getAttribute('data-column'));
    let row = ColumnState[column]; // Retrieve the current row from ColumnState

    if (column < 0 || row < 0) {
        return;
    }

    // Select the cell to place the piece
    const selector = `.cell[data-row="${row}"][data-column="${column}"]`;
    const cellDiv = document.querySelector(selector);

    // Update the row height in the column and update the ColumnState array
    ColumnState[column]--;

     // Send row and column data to the server
     fetch('/game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ row: row, column: column, player: CurrentPlayer})
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.message.startsWith('/game?message=')) {
            // Extract the message from the data
            const message = decodeURIComponent(data.message.substring('/game?message='.length));
            // Redirect to the Connect4 page with the winner message
            window.location.href = data.message;
        } else {
            // Log any other data received
            console.log(data);
        }
    })
    .catch(error => {
        console.error('There was a problem with your fetch operation:', error);
    });

     // Check the current player and assign the appropriate class
     if (CurrentPlayer === RedPlayer) {
        cellDiv.classList.add("red-piece");
        CurrentPlayer = YellowPlayer; // Switch to the next player
    } else if (CurrentPlayer === YellowPlayer) {
        cellDiv.classList.add("yellow-piece");
        CurrentPlayer = RedPlayer; // Switch to the next player
    }

    saveGameState();
}

window.onload = function() {
    createCells();
    loadGameState();
};