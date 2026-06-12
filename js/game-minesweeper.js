const GameMinesweeper = {
    DIFFICULTIES: {
        easy:   { rows: 9, cols: 9, mines: 10, label: '初级 9×9' },
        medium: { rows: 16, cols: 16, mines: 40, label: '中级 16×16' },
        hard:   { rows: 30, cols: 16, mines: 99, label: '高级 30×16' }
    },
    difficulty: 'easy',
    rows: 9,
    cols: 9,
    totalMines: 10,
    board: null,
    status: 'playing',
    timer: 0,
    timerId: null,
    flagsPlaced: 0,
    firstClick: true,
    _clickHandler: null,
    _ctxHandler: null,
    _dblHandler: null,

    init(difficulty) {
        this._unbindEvents();
        if (difficulty) this.difficulty = difficulty;
        const cfg = this.DIFFICULTIES[this.difficulty];
        this.rows = cfg.rows;
        this.cols = cfg.cols;
        this.totalMines = cfg.mines;
        this.board = [];
        this.status = 'playing';
        this.timer = 0;
        this.flagsPlaced = 0;
        this.firstClick = true;
        this._stopTimer();

        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.cols; c++)
                this.board[r][c] = { mine: false, revealed: false, flagged: false, adj: 0 };
        }
        this.render();
        this._bindEvents();
    },

    destroy() {
        this._stopTimer();
        this._unbindEvents();
    },

    _placeMines(safeR, safeC) {
        const safe = new Set();
        for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
                const nr = safeR + dr, nc = safeC + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols)
                    safe.add(`${nr},${nc}`);
            }

        let placed = 0;
        while (placed < this.totalMines) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            if (!this.board[r][c].mine && !safe.has(`${r},${c}`)) {
                this.board[r][c].mine = true;
                placed++;
            }
        }

        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (!this.board[r][c].mine)
                    this.board[r][c].adj = this._countAdj(r, c);
    },

    _countAdj(r, c) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc].mine)
                    n++;
            }
        return n;
    },

    reveal(r, c) {
        if (this.status !== 'playing') return;
        const cell = this.board[r][c];
        if (cell.revealed || cell.flagged) return;

        if (this.firstClick) {
            this._placeMines(r, c);
            this.firstClick = false;
            this._startTimer();
        }

        cell.revealed = true;
        if (cell.mine) {
            this.status = 'lost';
            this._stopTimer();
            this._revealAll();
            Audio.explode();
            setTimeout(() => Audio.lose(), 350);
            this.render();
            return;
        }
        Audio.reveal();

        if (cell.adj === 0)
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols)
                        this.reveal(nr, nc);
                }

        this._checkWin();
        this.render();
    },

    toggleFlag(r, c) {
        if (this.status !== 'playing') return;
        const cell = this.board[r][c];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        this.flagsPlaced += cell.flagged ? 1 : -1;
        Audio.flag();
        this.render();
    },

    chord(r, c) {
        if (this.status !== 'playing') return;
        const cell = this.board[r][c];
        if (!cell.revealed || cell.adj === 0) return;

        let adjFlags = 0;
        for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc].flagged)
                    adjFlags++;
            }

        if (adjFlags === cell.adj)
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !this.board[nr][nc].flagged)
                        this.reveal(nr, nc);
                }
    },

    _revealAll() {
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (this.board[r][c].mine) this.board[r][c].revealed = true;
    },

    _checkWin() {
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (!this.board[r][c].mine && !this.board[r][c].revealed) return;
        this.status = 'won';
        this._stopTimer();
        const key = `best_minesweeper_${this.difficulty}`;
        const prev = Storage.get(key, Infinity);
        if (this.timer < prev) Storage.set(key, this.timer);
        Audio.win();
    },

    _startTimer() {
        this.timerId = setInterval(() => {
            this.timer++;
            const el = document.querySelector('.timer-value');
            if (el) el.textContent = String(this.timer).padStart(3, '0');
        }, 1000);
    },

    _stopTimer() {
        if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    },

    _bindEvents() {
        const sec = document.querySelector('[data-view="minesweeper"]');
        if (!sec) return;
        this._unbindEvents();

        this._clickHandler = (e) => {
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = +cellEl.dataset.r, c = +cellEl.dataset.c;
            if (this.board[r][c].revealed) {
                this.chord(r, c);
            } else {
                this.reveal(r, c);
            }
        };
        this._ctxHandler = (e) => {
            e.preventDefault();
            const cell = e.target.closest('.cell');
            if (!cell) return;
            const r = +cell.dataset.r, c = +cell.dataset.c;
            this.toggleFlag(r, c);
        };
        this._dblHandler = (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;
            const r = +cell.dataset.r, c = +cell.dataset.c;
            this.chord(r, c);
        };

        sec.addEventListener('click', this._clickHandler);
        sec.addEventListener('contextmenu', this._ctxHandler);
        sec.addEventListener('dblclick', this._dblHandler);
    },

    _unbindEvents() {
        const sec = document.querySelector('[data-view="minesweeper"]');
        if (!sec) return;
        if (this._clickHandler) sec.removeEventListener('click', this._clickHandler);
        if (this._ctxHandler) sec.removeEventListener('contextmenu', this._ctxHandler);
        if (this._dblHandler) sec.removeEventListener('dblclick', this._dblHandler);
        this._clickHandler = null;
        this._ctxHandler = null;
        this._dblHandler = null;
    },

    render() {
        const sec = document.querySelector('[data-view="minesweeper"]');
        if (!sec) return;
        const remaining = this.totalMines - this.flagsPlaced;
        const bestKey = `best_minesweeper_${this.difficulty}`;
        const bestTime = Storage.get(bestKey, 0);

        const cellHtml = (cell, r, c) => {
            let cls = 'cell';
            let text = '';
            if (cell.revealed) {
                cls += ' cell-revealed';
                if (cell.mine && this.status === 'lost') {
                    text = '💥';
                    cls += ' cell-exploded';
                } else if (cell.mine) {
                    text = '💣';
                } else if (cell.adj > 0) {
                    text = cell.adj;
                    cls += ` cell-n${cell.adj}`;
                }
            } else if (cell.flagged) {
                text = '🚩';
                cls += ' cell-flagged';
            }
            return `<div class="${cls}" data-r="${r}" data-c="${c}">${text}</div>`;
        };

        const diffBtns = Object.entries(this.DIFFICULTIES).map(([key, cfg]) => {
            const activeCls = key === this.difficulty ? ' pixel-btn--active' : '';
            return `<button class="pixel-btn${activeCls}" onclick="GameMinesweeper.init('${key}')">${cfg.label}</button>`;
        }).join('');

        sec.innerHTML = `
            <div class="game-header">
                <div class="game-header-left">
                    <div class="game-title">扫 雷</div>
                    <button class="back-btn" onclick="App.backToMenu()">← BACK</button>
                </div>
                <div class="mine-counter">
                    <div class="counter-label">💣 REMAIN</div>
                    <div class="counter-value">${remaining}</div>
                </div>
                <div class="mine-counter">
                    <div class="counter-label">⏱ TIME</div>
                    <div class="counter-value timer-value">${String(this.timer).padStart(3, '0')}</div>
                </div>
            </div>
            <div class="grid-minesweeper" style="grid-template-columns:repeat(${this.cols},1fr);font-size:${this.cols > 16 ? '10px' : '14px'}">
                ${this.board.flatMap((row, r) => row.map((cell, c) => cellHtml(cell, r, c))).join('')}
            </div>
            <div class="difficulty-buttons">${diffBtns}</div>
            <div class="game-hint">左键翻开/展开 | 右键插旗</div>
            ${this.status === 'won' ? `
            <div class="overlay">
                <div class="overlay-content win-overlay">
                    <h2>✨ 恭喜通关 ✨</h2>
                    <p>TIME: ${this.timer}s${bestTime ? ' | BEST: ' + bestTime + 's' : ''}</p>
                    <button class="pixel-btn" onclick="GameMinesweeper.init('${this.difficulty}')">再来一局</button>
                </div>
            </div>` : ''}
            ${this.status === 'lost' ? `
            <div class="overlay">
                <div class="overlay-content lose-overlay">
                    <h2>💥 GAME OVER</h2>
                    <button class="pixel-btn" onclick="GameMinesweeper.init('${this.difficulty}')">再来一局</button>
                </div>
            </div>` : ''}
        `;
    }
};
