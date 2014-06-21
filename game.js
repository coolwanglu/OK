document.addEventListener('DOMContentLoaded', function() {

var ROW = 4;
var COL = 4;
var board = [
  [0,0,0,0],
  [0,0,0,0],
  [0,0,0,0],
  [0,0,0,0]
];
var boardElements = [
  [null,null,null,null],
  [null,null,null,null],
  [null,null,null,null],
  [null,null,null,null]
];
var allowMove = true;
var waitingForAI = false;
var aiMove = [0,0,0];
var checkList = [
  [[],[],[],[]],
  [[],[],[],[]],
  [[],[],[],[]],
  [[],[],[],[]]
];

function assert(condition) {
  if(!condition)
    throw "Assertion Failed";
}

function setBoard(row, col, value) {
  board[row][col] = value;
  var cellElement = boardElements[row][col];
  cellElement.innerHTML='<div class="' + (value == 1 ? 'ring' : 'cross') + '"></div>';
  cellElement.classList.remove('empty');
}

function finishGame(result) {
  allowMove = false;
  // show message
  document.getElementById('result').innerHTML = ['You Win!', 'You Lose!', 'Tie!'][result];
  document.querySelector('.msg').classList.remove('hidden');
}

function check(row, col, user_move) {
  var list = checkList[row][col];
  for(var i = 0; i < list.length; ++i) { 
    var item = list[i];
    var c = board[item[0]][item[1]];
    if(c == 0) continue;
    if(board[item[2]][item[3]] != c) continue;
    if(board[item[4]][item[5]] != c) continue;
    finishGame(user_move ? 0 : 1);
    return true;
  }
  for(var i = 0; i < ROW; ++i) {
    for(var j = 0; j < COL; ++j) {
      if(board[i][j] == 0) {
        return false;
      }
    }
  }
  // no move left
  finishGame(2);
  return true;
}

function calcAIMove() {
  for(var i = 0; i < ROW; ++i) {
    for(var j = 0; j < COL; ++j) {
      if(board[i][j] == 0) {
        return [i, j, Math.round(1 + Math.random())];
      }
    }
  }
  assert(false);
}

function user_move(row, col, value) {
  if(board[row][col] != 0)
    return;

  setBoard(row, col, value);
  if(check(row, col, true)) {
    return;
  }
 
  waitingForAI = true;
  setTimeout(function() {
    waitingForAI = false;
    var move = calcAIMove();
    setBoard(move[0], move[1], move[2]);
    if(check(move[0], move[1], false)) {
      return;
    }
  }, 500);
}

function addCheckItem(item) {
  for(var i = 0; i < 6; i += 2) {
    checkList[item[i]][item[i+1]].push(item);
  }
}

function init() {
  // setup board
  document.getElementById('rematch-button').addEventListener('click', function() {
    reset();
  });
  var container = document.querySelector('.game-container');
  container.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
/*
  container.addEventListener('mousedown', function(e) {
    e.preventDefault();
  });
*/
  for(var cur_row = 0; cur_row < ROW; ++cur_row) {
    var rowElement = document.createElement('div');
    rowElement.classList.add('grid-row');
    container.appendChild(rowElement);
    for(var cur_col = 0; cur_col < COL; ++cur_col) {
      var cellElement = document.createElement('div');
      cellElement.classList.add('grid');
      cellElement.classList.add('empty');
      cellElement.setAttribute('data-row', cur_row);
      cellElement.setAttribute('data-col', cur_col);
      rowElement.appendChild(cellElement);
      boardElements[cur_row][cur_col] = cellElement;

      cellElement.addEventListener('mouseup', function(e) {
        e.preventDefault();
        if(!allowMove || waitingForAI) return;
       
        if(e.button == 0 || e.button == 2) {
          var target = e.currentTarget;
          var row = parseInt(target.getAttribute('data-row'));
          var col = parseInt(target.getAttribute('data-col'));
          user_move(row, col, ((e.button == 0) ? 1 : 2));
        }
      });
    }
  }

  // setup checkList
  for(var i = 0; i < ROW - 2; ++i) {
    for(var j = 0; j < COL; ++j) {
      addCheckItem([i, j, i+1, j, i+2, j]);
    }
  }
  for(var i = 0; i < ROW; ++i) {
    for(var j = 0; j < COL - 2; ++j) {
      addCheckItem([i, j, i, j+1, i, j+2]);
    }
  }
  for(var i = 0; i < ROW - 2; ++i) {
    for(var j = 0; j < COL - 2; ++j) {
      addCheckItem([i, j, i+1, j+1, i+2, j+2]);
    }
  }
  for(var i = 2; i < ROW; ++i) {
    for(var j = 0; j < COL - 2; ++j) {
      addCheckItem([i, j, i-1, j+1, i-2, j+2]);
    }
  }
}

function reset() {
  for(var i = 0; i < ROW; ++i) {
    for(var j = 0; j < COL; ++j) {
      board[i][j] = 0;
      var cellElement = boardElements[i][j];
      cellElement.classList.add('empty');
      cellElement.innerHTML = '';
    }
  }
  allowMove = true;
  waitingForAI = false;
  document.querySelector('.msg').classList.add('hidden');
}

(function main() {
  init();
  reset();
})();

});
