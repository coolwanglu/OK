document.addEventListener('DOMContentLoaded', function() {

var ROW = 3;
var COL = 3;
var FPS = 60.0;

// margin plus width/height
var MARGIN = 16;
var TILE_SIZE = 105;

var INNER_SHADOW_SCALE = 100;
var INNER_SHADOW_MAX_OFFSET = 8;
var INNER_SHADOW_BLUR_RADIUS = 16;
var INNER_SHADOW_SPREAD_RADIUS = -8;
var INNER_SHADOW_COLOR = 'rgba(0,0,0,0.7)';
var innerShadowGrids = [];

var GAME_CONTAINER_MAX_OFFSET = 4;
var GAME_CONTAINER_SHADOW_BLUR_RADIUS = 6;
var GAME_CONTAINER_SHADOW_SPREAD_RADIUS = -3;
var GAME_CONTAINER_SHADOW_COLOR = 'rgba(0,0,0,0.7)';

var TILE_MAX_OFFSET = 3;
var TILE_SHADOW_BLUR_RADIUS = 3;
var TILE_SHADOW_SPREAD_RADIUS = -1;
var TILE_SHADOW_COLOR = 'rgba(0,0,0,0.7)';
var tileElements = [];

var BASE_Z_INDEX = 100;

var mouseX = 0.0;
var mouseY = 0.0;
var shadow_factor = 1.0;
var shadow_enabled = false;

var OK = false;
var difficulty = 1;


function assert(condition) {
  if(!condition)
    throw "Assertion Failed";
}
function randomElement(l, pop) {
  var idx = Math.floor(Math.random() * l.length);
  var ret = l[idx];
  if(pop) {
    l[idx] = l[l.length-1];
    l.pop();
  }
  return ret;
}
function randomeShuffle(l) {
  var ll = l.length;
  while(ll > 1) {
    var idx = Math.floor(Math.random() * ll);
    swap(l, idx, ll-1);
    --ll;
  }
}
function swap(l, i1, i2) {
  var tmp = l[i1];
  l[i1] = l[i2];
  l[i2] = tmp;
}

function Script(script) {
  this.script = script;
  this.script_idx = 0;
  var self = this;
  this.next = function() {
    if(self.script_idx < self.script.length) {
        var item = self.script[self.script_idx];
        if(typeof item === 'string') {
          ++ self.script_idx;
          self.next();
          return;
        }
        var fn = item[0];
        var timeOut = item[1];
        var ret = fn();

        if(typeof ret === 'undefined') {
          ++self.script_idx;
        } else {
          for(var i = 0; i < self.script.length; ++i) {
            if(self.script[i] === ret) {
              ++i;
              break;
            }
          }
          self.script_idx = i;
          timeOut = 0;
        }
        setTimeout(self.next, timeOut);
    }
  }
}

function getTileOriginalPos(tile) {
   return [
    parseInt(tile.getAttribute('data-row')),
    parseInt(tile.getAttribute('data-col'))
   ];
}

function getTilePos(tile) {
   return [
    parseInt(tile.getAttribute('data-cur-row')),
    parseInt(tile.getAttribute('data-cur-col'))
   ];
}
function moveTile(tile, row, col) {
  tile.setAttribute('data-cur-row', row);
  tile.setAttribute('data-cur-col', col);
  tile.style.left = MARGIN + (MARGIN + TILE_SIZE) * col + 'px';
  tile.style.top = MARGIN + (MARGIN + TILE_SIZE) * row + 'px';
}

function init() {
  // setup board
  var container = document.querySelector('.game-container');
  container.style.width = MARGIN + (MARGIN+TILE_SIZE) * COL + 'px';
  container.style.height = MARGIN + (MARGIN+TILE_SIZE) * ROW + 'px';

  // shadow grids
  for(var cur_row = 0; cur_row < ROW; ++cur_row) {
    for(var cur_col = 0; cur_col < COL; ++cur_col) {
      var cellElement = document.createElement('div');
      cellElement.classList.add('grid');
      cellElement.style.left = (MARGIN + TILE_SIZE) * cur_col + 'px';
      cellElement.style.top = (MARGIN + TILE_SIZE) * cur_row + 'px';
      container.appendChild(cellElement);
      innerShadowGrids.push(cellElement);
    }
  }

  // tiles
  for(var cur_row = 0; cur_row < ROW; ++cur_row) {
    for(var cur_col = 0; cur_col < COL; ++cur_col) {
      var cellElement = document.createElement('div');
      cellElement.classList.add('tile');
      cellElement.classList.add('inactive');
      cellElement.style['zIndex'] = BASE_Z_INDEX + 1;

      cellElement.setAttribute('data-row', cur_row);
      cellElement.setAttribute('data-col', cur_col);

      moveTile(cellElement, cur_row, cur_col);

      container.appendChild(cellElement);

      if(cur_row == 1 && cur_col == 0)
          cellElement.classList.add('O');
      if(cur_row == 1 && cur_col == 1)
          cellElement.classList.add('K');
      if(cur_row == 1 && cur_col == 2)
          cellElement.classList.add('EXCLAMATION');

      tileElements.push(cellElement);
    }
  }

  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
}

function reset() {
  new Script([
    [function() { // check if all tiles are in position
      tileElements.forEach(function(e) {
        var opos = getTileOriginalPos(e);
        var pos = getTilePos(e);
        if(opos[0] != pos[0] || opos[1] != pos[1]) {
          return;  
        }
      });
      return 'L1';
    }, 0],
    // move tiles to their original places
    [activeTiles, 300],
    [function() {
      tileElements.forEach(function(e) {
        var opos = getTileOriginalPos(e);
        moveTile(e, opos[0], opos[1]);
      });
    }, 700],
    [deactiveTiles, 300],

    'L1',
    [function() {
      input_
    }, 0],

    'L2', // wait for OK
    [function() {
    }, 0],
    [function() {}, 300],
    [function() { return 'L2'; }, 0]
  ]);
}

function renderInnerShadowGrids() {
  innerShadowGrids.forEach(function(e) {
    var rect = e.getBoundingClientRect();
    var mx = mouseX - rect.left;
    var my = mouseY - rect.right;
    
    var shadowX = (mx < 0)
      ? Math.min(-mx / INNER_SHADOW_SCALE, INNER_SHADOW_MAX_OFFSET)
      : (mx > rect.width)
      ? Math.max((rect.width - mx) / INNER_SHADOW_SCALE, -INNER_SHADOW_MAX_OFFSET)
      : 0 ;
    var shadowY = (my < 0)
      ? Math.min(-my / INNER_SHADOW_SCALE, INNER_SHADOW_MAX_OFFSET)
      : (my > rect.height)
      ? Math.max((rect.height - my) / INNER_SHADOW_SCALE, -INNER_SHADOW_MAX_OFFSET)
      : 0 ;
    e.style['boxShadow'] = 'inset ' 
      + shadowX * shadow_factor + 'px '
      + shadowY * shadow_factor + 'px '
      + INNER_SHADOW_BLUR_RADIUS * shadow_factor + 'px '
      + INNER_SHADOW_SPREAD_RADIUS * shadow_factor + 'px '
      + INNER_SHADOW_COLOR;
  });
}

function renderGameContainerShadow() {
  var e = document.querySelector('.game-container');
  var rect = e.getBoundingClientRect();
  var mx = mouseX - rect.left - rect.width / 2.0;
  var my = mouseY - rect.top - rect.height / 2.0;

  var tmp_offset = GAME_CONTAINER_MAX_OFFSET * 0.8;
  var shadowX = (-mx / rect.width * tmp_offset);
  shadowX = Math.min(Math.max(shadowX, -GAME_CONTAINER_MAX_OFFSET), GAME_CONTAINER_MAX_OFFSET);
  var shadowY = (-my / rect.height * tmp_offset);
  shadowY = Math.min(Math.max(shadowY, -GAME_CONTAINER_MAX_OFFSET), GAME_CONTAINER_MAX_OFFSET);
  e.style['boxShadow'] = shadowX + 'px '
      + shadowY + 'px '
      + GAME_CONTAINER_SHADOW_BLUR_RADIUS + 'px '
      + GAME_CONTAINER_SHADOW_SPREAD_RADIUS + 'px '
      + GAME_CONTAINER_SHADOW_COLOR;
}

function renderTileShadow() {
  tileElements.forEach(function(e) {
    var rect = e.getBoundingClientRect();
    var mx = mouseX - rect.left - rect.width / 2.0;
    var my = mouseY - rect.top - rect.height / 2.0;
  
    var tmp_offset = TILE_MAX_OFFSET * 0.8;
    var shadowX = (-mx / rect.width * tmp_offset);
    shadowX = Math.min(Math.max(shadowX, -TILE_MAX_OFFSET), TILE_MAX_OFFSET);
    var shadowY = (-my / rect.height * tmp_offset);
    shadowY = Math.min(Math.max(shadowY, -TILE_MAX_OFFSET), TILE_MAX_OFFSET);
    e.style['boxShadow'] = shadowX * shadow_factor + 'px '
        + shadowY * shadow_factor + 'px '
        + TILE_SHADOW_BLUR_RADIUS * shadow_factor + 'px '
        + TILE_SHADOW_SPREAD_RADIUS * shadow_factor + 'px '
        + TILE_SHADOW_COLOR;
  });
}

function renderShadow() {
  renderInnerShadowGrids();
  renderGameContainerShadow();
  renderTileShadow();
}

function beginMove () {
  activeTiles();
}

function activeTiles() {
  shadow_enabled = true;
  shadow_factor = 1.0;
  var l = [];
  for(var i = 1; i <= ROW * COL; ++i) {
    l.push(i);
    // TODO: difficulty
    //l.push(BASE_Z_INDEX+i);
  }
  tileElements.forEach(function(e) {
    e.classList.add('active');
    e.classList.remove('inactive');
    var zIndex = randomElement(l);
    e.style['zIndex'] = zIndex;
    if(zIndex > BASE_Z_INDEX) {
      e.classList.add('zoomIn');
      e.classList.remove('zoomOut');
    } else {
      e.classList.add('zoomOut');
      e.classList.remove('zoomIn');
    }
  });
  setTimeout(shuffleTiles, 300);
}

function shuffleTiles () {
  var l = [];
  for(var i = 0; i < ROW; ++i) {
    for(var j = 0; j < COL; ++j) {
      l.push([i,j]);
    }
  }
  randomeShuffle(l);
  // make sure that no tile stay at the same place
  tileElements.forEach(function(e, i) {
    var pos = getTilePos(e);
    if(l[i][0] == pos[0] && l[i][1] == pos[1]) {
      var idx = Math.floor(Math.random() * (l.length-1));
      swap(l, i, (idx == i) ? (l.length - 1) : idx)
    }
  });
  tileElements.forEach(function(e, i) {
    moveTile(e, l[i][0], l[i][1]);
  });
  setTimeout(activeTiles, 700);
}

function deactiveTiles() {
  shadow_enabled = false;
  shadow_factor = 0.0;
  tileElements.forEach(function(e) {
    e.classList.add('inactive');
    e.classList.remove('active');
    e.classList.remove('zoomIn');
    e.classList.remove('zoomOut');
    e.style['zIndex'] = 101;
    e.style['boxShadow'] = '';
  });
  setTimeout(activeTiles, 300);
}

function render() {
  // draw
  requestAnimationFrame(function() {
    if(shadow_enabled) {
      renderShadow();
    }
    setTimeout(render, 1.0 / FPS);
  });
}

(function main() {
  init();
  reset();
  //beginMove();
  render();
})();

});
