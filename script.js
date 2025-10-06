// Simple Minesweeper implementation in vanilla JavaScript.
// This script attaches event handlers to the board and provides the game logic.

document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const boardElem = document.getElementById('board');
  const rowsInput = document.getElementById('rows');
  const colsInput = document.getElementById('cols');
  const minesInput = document.getElementById('mines');
  const minesLeftDisplay = document.getElementById('minesLeftDisplay');
  const timerElem = document.getElementById('timer');
  const messageElem = document.getElementById('message');
  const newGameButton = document.getElementById('newGameButton');

  // State variables
  let board = [];
  let rows = 0;
  let cols = 0;
  let totalMines = 0;
  let minesLeft = 0;
  let firstClick = true;
  let timerId = null;
  let time = 0;
  let gameOver = false;

  /**
   * Initialize a new game by creating the grid and resetting state.
   */
  function newGame() {
    // Read values from controls and validate
    rows = Math.max(5, Math.min(parseInt(rowsInput.value, 10) || 9, 30));
    cols = Math.max(5, Math.min(parseInt(colsInput.value, 10) || 9, 30));
    totalMines = parseInt(minesInput.value, 10) || 10;
    const maxMines = rows * cols - 1;
    if (totalMines > maxMines) {
      totalMines = maxMines;
    }

    // Reset state
    board = [];
    firstClick = true;
    time = 0;
    clearInterval(timerId);
    timerId = null;
    timerElem.textContent = '0';
    gameOver = false;
    messageElem.textContent = '';

    // Set mines left display
    minesLeft = totalMines;
    minesLeftDisplay.textContent = minesLeft;

    // Clear board element
    boardElem.innerHTML = '';
    boardElem.style.gridTemplateRows = `repeat(${rows}, 30px)`;
    boardElem.style.gridTemplateColumns = `repeat(${cols}, 30px)`;

    // Create cell objects and DOM elements
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) {
        const cellElem = document.createElement('div');
        cellElem.classList.add('cell');
        cellElem.dataset.row = r;
        cellElem.dataset.col = c;
        boardElem.appendChild(cellElem);

        const cell = {
          row: r,
          col: c,
          hasMine: false,
          neighbor: 0,
          revealed: false,
          flagged: false,
          element: cellElem
        };
        board[r][c] = cell;

        // Attach mouse event listeners to each cell
        cellElem.onmousedown = (event) => {
          event.preventDefault();
          if (gameOver) return;
          if (event.button === 0) {
            // Left click
            handleLeftClick(cell);
          } else if (event.button === 2) {
            // Right click
            handleRightClick(cell);
          }
        };
      }
    }

    // Prevent context menu on the entire board
    boardElem.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  /**
   * Place mines randomly on the board, avoiding the first clicked cell.
   * @param {number} excludeRow - Row index to exclude.
   * @param {number} excludeCol - Column index to exclude.
   */
  function placeMines(excludeRow, excludeCol) {
    // Build a list of all possible positions except the excluded one
    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === excludeRow && c === excludeCol) continue;
        positions.push([r, c]);
      }
    }
    // Randomly place mines
    for (let i = 0; i < totalMines; i++) {
      const index = Math.floor(Math.random() * positions.length);
      const [r, c] = positions.splice(index, 1)[0];
      board[r][c].hasMine = true;
    }
    // Calculate neighbour counts for each cell
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (cell.hasMine) continue;
        let count = 0;
        getNeighbors(r, c).forEach((n) => {
          if (n.hasMine) count++;
        });
        cell.neighbor = count;
      }
    }
  }

  /**
   * Handle left click on a cell. Reveals the cell and starts the timer.
   * @param {Object} cell - The cell that was clicked.
   */
  function handleLeftClick(cell) {
    if (cell.revealed || cell.flagged) return;
    // On first click, place mines and start the timer
    if (firstClick) {
      placeMines(cell.row, cell.col);
      firstClick = false;
      timerId = setInterval(() => {
        time++;
        timerElem.textContent = time.toString();
      }, 1000);
    }
    // Reveal the clicked cell
    revealCell(cell);
    // Check for win after each reveal
    checkWin();
  }

  /**
   * Reveal a cell. If it's a mine, trigger loss; if neighbour count is zero,
   * recursively reveal neighbours.
   * @param {Object} cell - The cell to reveal.
   */
  function revealCell(cell) {
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    cell.element.classList.add('revealed');
    // If it's a mine, reveal all mines and end game
    if (cell.hasMine) {
      cell.element.textContent = '💣';
      cell.element.style.backgroundColor = '#ef5350';
      loseGame();
      return;
    }
    // Display neighbour count if greater than zero
    if (cell.neighbor > 0) {
      cell.element.dataset.neighbors = cell.neighbor;
      cell.element.textContent = cell.neighbor;
    } else {
      // No neighbours: recursively reveal adjacent cells
      getNeighbors(cell.row, cell.col).forEach((n) => {
        if (!n.revealed) {
          revealCell(n);
        }
      });
    }
  }

  /**
   * Handle right click on a cell. Toggles flag state and updates mine counter.
   * @param {Object} cell - The cell that was right-clicked.
   */
  function handleRightClick(cell) {
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    if (cell.flagged) {
      cell.element.classList.add('flagged');
      cell.element.textContent = '🚩';
      minesLeft--;
    } else {
      cell.element.classList.remove('flagged');
      cell.element.textContent = '';
      minesLeft++;
    }
    minesLeftDisplay.textContent = minesLeft;
  }

  /**
   * Get all valid neighbouring cells of the given coordinates.
   * @param {number} r - Row index.
   * @param {number} c - Column index.
   * @returns {Array<Object>} Array of neighbour cells.
   */
  function getNeighbors(r, c) {
    const neighbours = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          neighbours.push(board[nr][nc]);
        }
      }
    }
    return neighbours;
  }

  /**
   * Reveal all mines and disable further interaction. Called when the player loses.
   */
  function revealAllMines() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (cell.hasMine) {
          cell.element.classList.add('revealed');
          // Only show a bomb if it's not flagged by user on loss
          cell.element.textContent = cell.flagged ? '🚩' : '💣';
          cell.element.style.backgroundColor = '#ef5350';
        }
        // Disable all cells
        cell.element.classList.add('disabled');
      }
    }
  }

  /**
   * Called when the player loses the game.
   */
  function loseGame() {
    gameOver = true;
    clearInterval(timerId);
    messageElem.textContent = 'Game over!';
    revealAllMines();
  }

  /**
   * Check if the player has won. If all non-mine cells are revealed, declare victory.
   */
  function checkWin() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (!cell.hasMine && !cell.revealed) {
          return; // Not yet won
        }
      }
    }
    // If all non-mine cells revealed, player wins
    winGame();
  }

  /**
   * Called when the player wins the game.
   */
  function winGame() {
    gameOver = true;
    clearInterval(timerId);
    messageElem.style.color = '#388e3c';
    messageElem.textContent = 'Congratulations! You cleared the board!';
    // Reveal all mines as flags
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (cell.hasMine) {
          cell.element.classList.add('revealed');
          cell.element.textContent = '🚩';
        }
        cell.element.classList.add('disabled');
      }
    }
  }

  // Attach handler to New Game button
  newGameButton.addEventListener('click', () => {
    messageElem.style.color = '#d32f2f';
    newGame();
  });

  // Start the first game on page load
  newGame();
});