const GameSnake = {
    SIZE: 16,
    snake: [],
    direction: 'right',
    nextDirection: 'right',
    food: null,
    score: 0,
    bestScore: 0,
    status: 'playing',
    tickMs: 170,
    loopId: null,
    _keyHandler: null,

    init() {
        this.destroy();
        this.snake = [
            { r: 8, c: 5 },
            { r: 8, c: 4 },
            { r: 8, c: 3 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.food = null;
        this.score = 0;
        this.bestScore = Storage.get('best_snake', 0);
        this.status = 'playing';
        this.tickMs = 170;
        this._spawnFood();
        this.render();
        this._bindKeys();
        this._startLoop();
    },

    destroy() {
        this._stopLoop();
        this._unbindKeys();
    },

    _startLoop() {
        this._stopLoop();
        this.loopId = setInterval(() => this._step(), this.tickMs);
    },

    _stopLoop() {
        if (this.loopId) {
            clearInterval(this.loopId);
            this.loopId = null;
        }
    },

    _spawnFood() {
        const occupied = new Set(this.snake.map(part => `${part.r},${part.c}`));
        const free = [];
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (!occupied.has(`${r},${c}`)) free.push({ r, c });
            }
        }
        this.food = free[Math.floor(Math.random() * free.length)] || null;
    },

    _step() {
        if (this.status !== 'playing') return;

        const opposite = {
            up: 'down',
            down: 'up',
            left: 'right',
            right: 'left'
        };
        if (this.nextDirection !== opposite[this.direction]) {
            this.direction = this.nextDirection;
        }

        const head = this.snake[0];
        const delta = {
            up: { r: -1, c: 0 },
            down: { r: 1, c: 0 },
            left: { r: 0, c: -1 },
            right: { r: 0, c: 1 }
        }[this.direction];

        const next = { r: head.r + delta.r, c: head.c + delta.c };
        const hitsWall = next.r < 0 || next.r >= this.SIZE || next.c < 0 || next.c >= this.SIZE;
        const hitsBody = this.snake.some(part => part.r === next.r && part.c === next.c);
        if (hitsWall || hitsBody) {
            this.status = 'lost';
            this._stopLoop();
            Audio.lose();
            this.render();
            return;
        }

        this.snake.unshift(next);
        if (this.food && next.r === this.food.r && next.c === this.food.c) {
            this.score++;
            Audio.merge();
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                Storage.set('best_snake', this.bestScore);
            }
            if (this.tickMs > 90 && this.score % 3 === 0) {
                this.tickMs -= 10;
                this._startLoop();
            }
            this._spawnFood();
        } else {
            this.snake.pop();
            Audio.move();
        }

        this.render();
    },

    _handleKey(e) {
        if (App.currentView !== 'snake') return;
        const next = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
            w: 'up',
            s: 'down',
            a: 'left',
            d: 'right',
            W: 'up',
            S: 'down',
            A: 'left',
            D: 'right'
        }[e.key];

        if (next) {
            e.preventDefault();
            this.nextDirection = next;
            return;
        }

        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            this.init();
        }
    },

    _bindKeys() {
        this._unbindKeys();
        this._keyHandler = this._handleKey.bind(this);
        document.addEventListener('keydown', this._keyHandler);
    },

    _unbindKeys() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    render() {
        const sec = document.querySelector('[data-view="snake"]');
        const occupied = new Map(this.snake.map((part, idx) => [`${part.r},${part.c}`, idx]));

        const cells = [];
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                let cls = 'snake-cell';
                const index = occupied.get(`${r},${c}`);
                if (index === 0) cls += ' snake-cell--head';
                else if (index !== undefined) cls += ' snake-cell--snake';
                else if (this.food && this.food.r === r && this.food.c === c) cls += ' snake-cell--food';
                cells.push(`<div class="${cls}"></div>`);
            }
        }

        sec.innerHTML = `
            <div class="game-header">
                <div class="game-header-left">
                    <div class="game-title">贪吃蛇</div>
                    <button class="back-btn" onclick="App.backToMenu()">← BACK</button>
                </div>
                <div class="game-header-right">
                    <div class="score-label">SCORE</div>
                    <div class="score-value">${this.score}</div>
                    <div class="best-label">BEST: ${this.bestScore}</div>
                </div>
            </div>
            <div class="snake-status">
                <button class="pixel-btn" onclick="GameSnake.init()">重开</button>
                <div class="mine-counter">
                    <div class="counter-label">SPEED</div>
                    <div class="counter-value">${Math.round((200 - this.tickMs) / 10)}</div>
                </div>
            </div>
            <div class="snake-board">
                ${cells.join('')}
            </div>
            <div class="game-hint">方向键 / WASD 控制 | R 重开</div>
            ${this.status === 'lost' ? `
            <div class="overlay">
                <div class="overlay-content lose-overlay">
                    <h2>CRASH</h2>
                    <p>SCORE: ${this.score}</p>
                    <div class="overlay-shortcuts"><kbd>ENTER</kbd> 再来一局 <kbd>ESC</kbd> 主菜单</div>
                    <button class="pixel-btn" onclick="GameSnake.init()">再来一局</button>
                </div>
            </div>` : ''}
        `;
    }
};
