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

  // round info
  var round_question_idx = -1;
  var round_shuffle_count = 0;
  var round_hide_tile_count = 0;
  var round_score = 0;
  var keep_going = false;

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
  var starElements = [];

  var BASE_Z_INDEX = 100;

  var mouseX = 0.0;
  var mouseY = 0.0;
  var shadow_factor = 1.0; // determines the length/strengh
  var shadow_enabled = false;

  var OK = false;
  var difficulty = 1;

  var input_allowed = false;
  var input_buffer = [];
  var button_clicked = false;


  function assert(condition) {
    if(!condition) {
      console.log((new Error).stack);
      throw "Assertion Failed";
    }
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
          assert(ret in self.labelMap);
          self.script_idx = self.labelMap[ret] + 1;
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

  function clearTileHingeEffects () {
    tileElements.forEach(function(e) {
      e.classList.add('revealed');
      for(var i = 0; i < 4; ++i)
        e.classList.remove('hinge' + i);
    });
  }

  function showScorePage() {
    document.getElementById('score').innerHTML = round_score;
    var scoreSharingE = document.getElementById('sharing');
    scoreSharingE.innerHTML = '';
    var buttonE = document.createElement('a');
    scoreSharingE.appendChild(buttonE);
    buttonE.setAttribute('href', 'https://twitter.com/share');
    buttonE.setAttribute('class', 'twitter-share-button');
    buttonE.setAttribute('data-via', 'coolwanglu');
    buttonE.setAttribute('data-url', 'http://coolwanglu.github.io/OK/');
    buttonE.setAttribute('data-counturl', 'http://coolwanglu.github.io/OK/');
    buttonE.textContent = 'Tweet';

    buttonE.setAttribute('data-text', 
      (round_score > 0) 
        ? ('I just scored ⭐️' + round_score + ' in OK! How much can you get? #OK!')
        : ('I just played OK! Check it out! #OK')
    );
    twttr.widgets.load(scoreSharingE);

    var msgE = document.querySelector('.msg');  
    msgE.classList.remove('hidden'); 
    msgE.classList.remove('flipOutX');
    msgE.classList.add('flipInX');
  }
  function showStars(starsPerTile) {
    var container = document.querySelector('.game-container');
    var baseStarElement = document.querySelector('.star');
    var starW = 32; 
    var starH = 32;
    var score = 0;
    tileElements.forEach(function(e) {
      if(e.classList.contains('pressed')) return;
      score += starsPerTile;
      var l = e.offsetLeft;
      var t = e.offsetTop;
      for(var i = 0; i < starsPerTile; ++i) {
        var starE = baseStarElement.cloneNode();
        starElements.push(starE);
        starE.classList.add('up');
        starE.style.left = 
          Math.random() * TILE_SIZE / 2 + TILE_SIZE / 4 - starW/2  + l + 'px';
        starE.style.top = 
          Math.random() * TILE_SIZE / 2 + TILE_SIZE / 4 - starH/2 + t + 'px'; 
        container.appendChild(starE); 
      }
    });
    return score;
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
        } else if(((cur_row == 0) || (cur_row == 2))
          && (cur_col == 1)) {
          var bombE = document.createElement('img');
          bombE.src = 'bomb.svg';
          cellElement.appendChild(bombE);
          cellElement.classList.add('bomb');
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
      button_clicked = 'StartOver';
    });
    document.getElementById('keepgoing-button').addEventListener('click', function(e) {
      e.preventDefault();
      button_clicked = 'KeepGoing';
    });
  }
  function startGameLoop() {
    var shuffle_left = 0;
    var stage_advanced = false;
    var stage_retries = 3;
    var tmp_label = '';
    new Script([
      'StartOver',
      [function() { // init a game
        clearTileHingeEffects();
        var msgE = document.querySelector('.msg');
        msgE.classList.add('hidden');
        msgE.classList.remove('flipInX');
        msgE.classList.remove('flipOutX');

        document.getElementById('question').innerHTML = 'Shall we start?';

        round_question_idx = -1;
        round_shuffle_count = 0;
        round_hide_tile_count = 0;
        round_score = 0;
        keep_going = false;
        document.querySelector('.game-container').classList.remove('keep-going');
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
      [function() {
        // remove stars, they may block click events
        starElements.forEach(function(e) {
          e.parentNode.removeChild(e);
        });
        starElements.length = 0;
      }, 0],
      [deactivateTiles, 300],

      'WaitForInput',
      [function() { 
        if(input_buffer.length == 3) {
          input_allowed = false;
          return 'ProcessInput'; 
        } 
      }, 10],
      [function() { return 'WaitForInput'; }, 0],

      'ProcessInput',
      [function() { }, 500], // wait for the last character revealed
      [function() {
        var input_str = input_buffer.join('');
        var answerE = document.getElementById('answer');
        if(input_str == 'XXX') {
          // nothing
        } else if(input_str == 'OKBANG') {
          answerE.classList.add('bounceOutUp');
          if(!keep_going) {
            // advance
            ++ round_question_idx;

            // clear question
            var questionE = document.getElementById('question');
            questionE.classList.remove('bounceIn');
            questionE.classList.add('bounceOut');
          }

          round_score += showStars(stage_retries);

          stage_advanced = true;
          stage_retries = 3;

          // update difficulty
          if(keep_going || (round_question_idx == QUESTIONS.length - 1)) {
            // ending or keep_going
            round_shuffle_count = 3; 
            round_hide_tile_count = 3;
          } else {
            round_shuffle_count = (round_question_idx % 3) + 1;
            round_hide_tile_count = Math.min(3, Math.floor(round_question_idx / 3));
          }
        } else {
          // continue this question
          answerE.classList.add('shake');
          stage_advanced = false;
          if(stage_retries > 0)
            -- stage_retries;
        }
        // restore tiles
        tileElements.forEach(function(e) {
          e.classList.remove('pressed');
        });
      }, 300], // wait for animation

      [function() { // clear answer box
        var answerE = document.getElementById('answer');
        answerE.innerHTML = '';
        answerE.classList.remove('bounceOutUp');
        answerE.classList.remove('shake');

        var input_str = input_buffer.join('');
        input_buffer.length = 0;
        if(input_str == 'XXX')
          return 'BombClicked';
      }, 0],

      'Shuffle',
      [function() {
        shuffle_left = round_shuffle_count;
      }, 0],
      [activateTiles, 500],
      [function() { // hide some tiles according to the difficulty
        // hide some tile according to the difficulty
        randomShuffle(okbangTileElements);
        okbangTileElements.forEach(function(e, i) {
          if(i < round_hide_tile_count)
            e.classList.remove('revealed');
          else
            e.classList.add('revealed');
        });
      }, 500],
      'ShuffleOnce',
      [function() {
        if(shuffle_left == 0)
          return 'ShuffleEnd';
        --shuffle_left;
        shuffleTiles();
      }, 700],
      [function() { return 'ShuffleOnce'; }, 0],

      'ShuffleEnd',
      [function() { // next question
        deactivateTiles();
        if(stage_advanced && !keep_going) {
          var e = document.getElementById('question');
          if(round_question_idx >= 0) {
            e.innerHTML = QUESTIONS[round_question_idx];
          }
          e.classList.remove('bounceOut');
          e.classList.add('bounceIn');
        }
      }, 300], 

      [function() { 
        if(keep_going || (round_question_idx < QUESTIONS.length - 1))
          return 'RoundStart'; // next round
      }, 0],

      'ShowResult',
      [function() { // Game finished
        shadow_enabled = true;
        tileElements.forEach(function(e) {
          e.classList.add('hinge' + Math.floor(Math.random() * 4));
        });
        button_clicked = false;
      }, 1500],
      [showScorePage, 1000],

      'WaitForButton',
      [function() {
        if((button_clicked == 'StartOver') 
          || (button_clicked == 'KeepGoing')) {
          tmp_label = button_clicked;
          return 'HideScorePage';
        }
        assert(!button_clicked);
      }, 10],  
      [function() { return 'WaitForButton'; }, 0],

      'HideScorePage',
      [function() {
        var msgE = document.querySelector('.msg');
        msgE.classList.remove('flipInX');
        msgE.classList.add('flipOutX');
      }, 500], 
      [function() { 
        activateTiles();
        clearTileHingeEffects();
      }, 700],
      [function() {
        return tmp_label; 
      }, 0],

      'KeepGoing',
      [function() {
        // restore tiles
        // user may have clicked tiles right before/after the score page
        tileElements.forEach(function(e) {
          e.classList.remove('pressed');
        });
        deactivateTiles();
        // we are going to show and hide the bombs
        // do not allow input here
        input_allowed = false; 
      }, 500],
      [function() { 
        keep_going = true;
        document.querySelector('.game-container').classList.add('keep-going');
        tileElements.forEach(function(e) {
          e.classList.remove('revealed');
          e.classList.add('revealed');
        });
      }, 1000],
      [function() { // hide bombs
        tileElements.forEach(function(e) {
          if(e.classList.contains('bomb'))
            e.classList.remove('revealed');
        });
      }, 1000], 

      [function() {
        return 'Shuffle'; 
      }, 0],

      'BombClicked',
      [function() { return 'ShowResult'; }, 0]
    ]);
  }

  function tileClickHandler(evt) {
    if(!input_allowed) {
      evt.preventDefault();
      return;
    }
    var e = evt.currentTarget;
    if(e.classList.contains('pressed')) {
      evt.preventDefault();
      return;
    }

    e.classList.add('pressed');
    e.classList.add('revealed');
    
    if(keep_going && e.classList.contains('bomb')) {
      // set length to 3 such that 
      // the game loop thinks that there are enough input
      input_buffer = ['X', 'X', 'X'];
      return;
    }

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
