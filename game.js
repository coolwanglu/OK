document.addEventListener('DOMContentLoaded', function() {
  var ROW = 3;
  var COL = 3;
  var FPS = 60.0;

  // margin plus width/height
  var MARGIN = 16;
  var TILE_SIZE = 105;

  var QUESTIONS = [
    'Give me an OK!',
    'Do it again?',
    'Keep going!',

    'Getting harder...',
    'Try to beat this game!',
    'Let\'s have fun!',

    'Hang in there!',
    'Give me a star?',
    'Fork it!',

    'Watch carefully!',
    'Tweet this game?',
    'Almost there!',

    'You are awesome!',
  ];
QUESTIONS = ['test1','test2'];

  // round info
  var round_question_idx = -1;
  var round_shuffle_count = 0;
  var round_hide_tile_count = 0;
  var round_score = 0;

  // shadow 
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

  var TILE_MAX_OFFSET = 2;
  var TILE_SHADOW_BLUR_RADIUS = 3;
  var TILE_SHADOW_SPREAD_RADIUS = -2;
  var TILE_SHADOW_COLOR = 'rgba(0,0,0,0.7)';
  var tileElements = [];
  var okbangTileElements = [];

  var BASE_Z_INDEX = 100;

  var mouseX = 0.0;
  var mouseY = 0.0;
  var shadow_factor = 1.0; // determines the length/strengh
  var shadow_enabled = false;

  var OK = false;
  var difficulty = 1;

  var input_allowed = false;
  var input_buffer = [];

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
  function randomShuffle(l) {
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
    var self = this;
    this.script = script;
    this.labelMap = {};
    script.forEach(function(item, i) {
      if(typeof item === 'string') {
        self.labelMap[item] = i;
      }
    });

    this.script_idx = 0;
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
          if(ret in self.labelMap)
            self.script_idx = self.labelMap[ret] + 1;
          else
            self.script_idx = self.script.length;
          timeOut = 0;
        }
        setTimeout(self.next, timeOut);
      }
    }
    setTimeout(self.next, 0);
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
  function allTileInOriginalPosition () {
    return tileElements.every(function(e) {
      var opos = getTileOriginalPos(e);
      var pos = getTilePos(e);
      return ((opos[0] == pos[0]) && (opos[1] == pos[1]));
    });
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
    if(shadow_enabled) {
      renderInnerShadowGrids();
      renderTileShadow();
    }
    renderGameContainerShadow();
  }

  function activateTiles() {
    input_allowed = false;
    shadow_enabled = true;
    shadow_factor = 1.0;
    var l = [];
    for(var i = 1; i <= ROW * COL; ++i) {
      l.push(i);
      l.push(BASE_Z_INDEX+i);
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
  }
  function shuffleTiles () {
    var l = [];
    for(var i = 0; i < ROW; ++i) {
      for(var j = 0; j < COL; ++j) {
        l.push([i,j]);
      }
    }
    randomShuffle(l);
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
  }
  function deactivateTiles() {
    input_allowed = true;
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

        if(cur_row == 1 && cur_col == 0) {
          cellElement.classList.add('O');
          okbangTileElements.push(cellElement);
        } else if(cur_row == 1 && cur_col == 1) {
          cellElement.classList.add('K');
          okbangTileElements.push(cellElement);
        } else if(cur_row == 1 && cur_col == 2) {
          cellElement.classList.add('BANG');
          okbangTileElements.push(cellElement);
        }

        tileElements.push(cellElement);
        cellElement.addEventListener('mousedown', tileClickHandler);
      }
    }

    document.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.getElementById('startover-button').addEventListener('click', function(e) {
      e.preventDefault();
      var msgE = document.querySelector('.msg');
      msgE.classList.add('flipOutX');
      setTimeout(restart, 800);
    });
  }

  function startGameLoop() {
    var shuffle_left = 0;
    var question_updated = false;
    new Script([
      [function() { // init a game
        tileElements.forEach(function(e) {
          e.classList.add('revealed');
          for(var i = 0; i < 4; ++i)
            e.classList.remove('hinge' + i);
        });
        document.getElementById('question').innerHTML = 'Shall we start?';
        var msgE = document.querySelector('.msg');
        msgE.classList.add('hidden');
        msgE.classList.remove('flipInX');
        msgE.classList.remove('flipOutX');

        round_question_idx = -1;
        round_shuffle_count = 0;
        round_hide_tile_count = 0;
        round_score = 0;
      }, 0],
      [function() { return (allTileInOriginalPosition() ? 'RoundStart' : 'ResetTilePosition'); }, 0],
      'ResetTilePosition',
      [activateTiles, 300],
      [function() {
        tileElements.forEach(function(e) {
          var opos = getTileOriginalPos(e);
          moveTile(e, opos[0], opos[1]);
        });
      }, 700],

      'RoundStart',
      [deactivateTiles, 300],
      [function() {
        input_allowed = true;
      }, 0],

      'WaitForInput',
      [function() { 
        if(input_buffer.length == 3) {
          input_allowed = false;
          return 'ProcessInput'; 
        }
      }, 10],
      [function() { return 'WaitForInput'; }, 0],

      'ProcessInput',
      [function() { }, 300], // wait for the last character revealed
      [function() {
        var answerE = document.getElementById('answer');
        if(input_buffer.join('') == 'OKBANG') {
          // advance
          ++ round_question_idx;
          answerE.classList.add('bounceOutUp');

          // clear question
          var questionE = document.getElementById('question');
          questionE.classList.remove('bounceIn');
          questionE.classList.add('bounceOut');

          question_updated = true;

          // update difficulty
          if(round_question_idx == QUESTIONS.length - 1) {
            // ending
            round_shuffle_count = 5;
            round_hide_tile_count = 3;
          } else {
            round_shuffle_count = (round_question_idx % 3) + 1;
            round_hide_tile_count = Math.min(3, Math.floor(round_question_idx / 3));
          }
        } else {
          // continue this question
          answerE.classList.add('shake');
          question_updated = false;
        }

        input_buffer.length = 0;
        tileElements.forEach(function(e) {
          e.classList.remove('pressed');
        });

        // hide some tile according to the difficulty
        randomShuffle(okbangTileElements);
        okbangTileElements.forEach(function(e, i) {
          if(i < round_hide_tile_count)
            e.classList.remove('revealed');
          else
            e.classList.add('revealed');
        });
      }, 300], // wait for animation

      [function() {
        var answerE = document.getElementById('answer');
        answerE.innerHTML = '';
        answerE.classList.remove('bounceOutUp');
        answerE.classList.remove('shake');

        shuffle_left = round_shuffle_count;
      }, 0],

      'Shuffle',
      [activateTiles, 500],
      [function() {
        if(shuffle_left == 0)
          return 'ShuffleEnd';
        --shuffle_left;
        shuffleTiles();
      }, 700],
      [function() { return 'Shuffle'; }, 0],

      'ShuffleEnd',
      [function() { // next question
        deactivateTiles();
        if(question_updated) {
          var e = document.getElementById('question');
          if(round_question_idx >= 0) {
            e.innerHTML = QUESTIONS[round_question_idx];
          }
          e.classList.remove('bounceOut');
          e.classList.add('bounceIn');
        }
      }, 300], 

      [function() { 
        if(round_question_idx < QUESTIONS.length - 1)
          return 'RoundStart'; // next round
      }, 0],

      'ShowResult',
      [function() { // Game finished
        shadow_enabled = true;
        tileElements.forEach(function(e) {
          e.classList.add('hinge' + Math.floor(Math.random() * 4));
        });
      }, 1500],
      [function() { // show score
        document.getElementById('score').innerHTML = round_score;

        var e = document.querySelector('.msg');  
        e.classList.remove('hidden'); 
        e.classList.remove('flipOutX');
        e.classList.add('flipInX');
      }, 1000],
    ]);
  }

  function tileClickHandler(evt) {
    if(!input_allowed) {
      evt.preventDefault();
      return;
    }
    var e = evt.target;
    if(e.classList.contains('pressed')) {
      evt.preventDefault();
      return;
    }

    e.classList.add('pressed');
    e.classList.add('revealed');
    var is_space = ['O','K','BANG'].every(function(cls) {
      if(!e.classList.contains(cls))
        return true; // continue;

      assert(input_buffer.indexOf(cls) === -1);
      input_buffer.push(cls);
      document.getElementById('answer').innerHTML += 
        '<span>' + ((cls == 'BANG') ? '!' : cls) + '</span>';
      
      return false; // break
    });
    if(is_space) {
      document.getElementById('answer').innerHTML += ' ';
    }
  }
  function render() {
    // draw
    requestAnimationFrame(function() {
      renderShadow();
      setTimeout(render, 1.0 / FPS);
    });
  }
  function main() {
    init();
    render(); // start render routine
    startGameLoop();
  }
  main();
});
