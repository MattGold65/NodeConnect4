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
        // Divide By 7 to reset count for each now row
        cell.setAttribute('data-row', Math.floor(i / 7));

        cell.addEventListener("click", setPiece);
        // add board to html
        board.appendChild(cell);

        cell.addEventListener("click", setPiece);
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
     fetch('/users', {
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
        if (data.message.startsWith('/Connect4?message=')) {
            // Extract the message from the data
            const message = decodeURIComponent(data.message.substring('/Connect4?message='.length));
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
}








/*

//Alot of repetition in this function try to condense the 4 conditions into a single function with parameters
//Sliding window algorith
function checkWinner() {
    //Condition 1 - Horizontally
    console.log("Checking for winner...");
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns - 3; j++) {
            const selector1 = `.cell[data-row="${i}"][data-column="${j}"]`;
            const selector2 = `.cell[data-row="${i}"][data-column="${j + 1}"]`;
            const selector3 = `.cell[data-row="${i}"][data-column="${j + 2}"]`;
            const selector4 = `.cell[data-row="${i}"][data-column="${j + 3}"]`;

            // Get the cell elements from the DOM
            const cell1 = document.querySelector(selector1);
            const cell2 = document.querySelector(selector2);
            const cell3 = document.querySelector(selector3);
            const cell4 = document.querySelector(selector4);

            // Check if all four cells exist and have the same class
            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("red-piece") &&
                cell2.classList.contains("red-piece") &&
                cell3.classList.contains("red-piece") &&
                cell4.classList.contains("red-piece")) {
                // If so, set the winner
                setWinner(i, j, "red");
                return;
            }

            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("yellow-piece") &&
                cell2.classList.contains("yellow-piece") &&
                cell3.classList.contains("yellow-piece") &&
                cell4.classList.contains("yellow-piece")){
                    setWinner(i, j, "yellow");
                    return;

            }
        }
    }

    //Condition 2 - Vertically
    for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows - 3; j++) {
            const selector1 = `.cell[data-row="${j}"][data-column="${i}"]`;
            const selector2 = `.cell[data-row="${j + 1}"][data-column="${i}"]`;
            const selector3 = `.cell[data-row="${j + 2}"][data-column="${i}"]`;
            const selector4 = `.cell[data-row="${j + 3}"][data-column="${i}"]`;

            // Get the cell elements from the DOM
            const cell1 = document.querySelector(selector1);
            const cell2 = document.querySelector(selector2);
            const cell3 = document.querySelector(selector3);
            const cell4 = document.querySelector(selector4);

            // Check if all four cells exist and have the same class
            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("red-piece") &&
                cell2.classList.contains("red-piece") &&
                cell3.classList.contains("red-piece") &&
                cell4.classList.contains("red-piece")) {
                // If so, set the winner
                setWinner(i, j, "red");
                return;
            }

            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("yellow-piece") &&
                cell2.classList.contains("yellow-piece") &&
                cell3.classList.contains("yellow-piece") &&
                cell4.classList.contains("yellow-piece")){
                    setWinner(i, j, "yellow");
                    return;

            }
        }
    }

    //Condition 3 - Reverse Diagonally (these are kinda like vectors tbh)
    for(let i=0; i<rows-3; i++){
        for(let j = 0; j < columns - 3; j++){
            const selector1 = `.cell[data-row="${i}"][data-column="${j}"]`;
            const selector2 = `.cell[data-row="${i + 1}"][data-column="${j + 1}"]`;
            const selector3 = `.cell[data-row="${i + 2}"][data-column="${j + 2}"]`;
            const selector4 = `.cell[data-row="${i + 3}"][data-column="${j + 3}"]`;

            // Get the cell elements from the DOM
            const cell1 = document.querySelector(selector1);
            const cell2 = document.querySelector(selector2);
            const cell3 = document.querySelector(selector3);
            const cell4 = document.querySelector(selector4);

            // Check if all four cells exist and have the same class
            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("red-piece") &&
                cell2.classList.contains("red-piece") &&
                cell3.classList.contains("red-piece") &&
                cell4.classList.contains("red-piece")) {
                // If so, set the winner
                setWinner(i, j, "red");
                return;
            }

            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("yellow-piece") &&
                cell2.classList.contains("yellow-piece") &&
                cell3.classList.contains("yellow-piece") &&
                cell4.classList.contains("yellow-piece")){
                    setWinner(i, j, "yellow");
                    return;

            }
        }
    }

    //Condition 4 - Diagonally
    for(let i=3; i<rows; i++){
        for(let j = 0; j < columns - 3; j++){
            const selector1 = `.cell[data-row="${i}"][data-column="${j}"]`;
            const selector2 = `.cell[data-row="${i - 1}"][data-column="${j + 1}"]`;
            const selector3 = `.cell[data-row="${i - 2}"][data-column="${j + 2}"]`;
            const selector4 = `.cell[data-row="${i - 3}"][data-column="${j + 3}"]`;

            // Get the cell elements from the DOM
            const cell1 = document.querySelector(selector1);
            const cell2 = document.querySelector(selector2);
            const cell3 = document.querySelector(selector3);
            const cell4 = document.querySelector(selector4);

            // Check if all four cells exist and have the same class
            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("red-piece") &&
                cell2.classList.contains("red-piece") &&
                cell3.classList.contains("red-piece") &&
                cell4.classList.contains("red-piece")) {
                // If so, set the winner
                setWinner(i, j, "red");
                return;
            } 
            
            if (cell1 && cell2 && cell3 && cell4 &&
                cell1.classList.contains("yellow-piece") &&
                cell2.classList.contains("yellow-piece") &&
                cell3.classList.contains("yellow-piece") &&
                cell4.classList.contains("yellow-piece")){
                    setWinner(i, j, "yellow");
                    return;

            }
        }
    }


}

function setWinner(row, column, color) {

    const winner = document.getElementById("winner");
    if (color === "red"){
        winner.innerText = "Red Wins!";
    } else if (color === "yellow"){
        winner.innerText = "Yellow Wins!";
    }


}

*/












window.onload = createCells;

