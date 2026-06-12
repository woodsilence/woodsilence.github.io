const GameSudoku = {
    SIZE: 9,
    SUBGRID: 3,
    puzzle: [],
    solution: [],
    selected: null,
    status: 'playing',
    timer: 0,
    timerId: null,
    _keyHandler: null,

    init() {
        this._unbindKeys();
        this._stopTimer();
        const { puzzle, solution } = this._buildPuzzle();
        this.puzzle = puzzle;
        this.solution = solution;
        this.selected = { r: 0, c: 0 };
        this.status = 'playing';
        this.timer = 0;
        this._startTimer();
        this.render();
        this._bindKeys();
    },

    destroy() {
        this._stopTimer();
        this._unbindKeys();
    },

    _buildPuzzle() {
        const pattern = (r, c) => (this.SUBGRID * (r % this.SUBGRID) + Math.floor(r / this.SUBGRID) + c) % this.SIZE;
        const shuffle = (arr) => {
            const clone = arr.slice();
            for (let i = clone.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [clone[i], clone[j]] = [clone[j], clone[i]];
            }
            return clone;
        };

        const rowGroups = shuffle([0, 1, 2]);
        const colGroups = shuffle([0, 1, 2]);
        const rows = rowGroups.flatMap(g => shuffle([0, 1, 2]).map(r => g * 3 + r));
        const cols = colGroups.flatMap(g => shuffle([0, 1, 2]).map(c => g * 3 + c));
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        const solution = rows.map(r => cols.map(c => nums[pattern(r, c)]));
        const puzzle = solution.map(row => row.slice());

        const cellsToClear = 42;
        let cleared = 0;
        while (cleared < cellsToClear) {
            const r = Math.floor(Math.random() * this.SIZE);
            const c = Math.floor(Math.random() * this.SIZE);
            if (puzzle[r][c] !== 0) {
                puzzle[r][c] = 0;
                cleared++;
            }
        }

        return { puzzle, solution };
    },

    _isFixed(r, c) {
        return this.puzzle[r][c] !== 0;
    },

    _setValue(value) {
        if (this.status !== 'playing' || !this.selected) return;
        const { r, c } = this.selected;
        if (this._isFixed(r, c)) return;
        this.puzzle[r][c] = value;
        Audio.reveal();
        this._checkWin();
        this.render();
    },

    _checkWin() {
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (this.puzzle[r][c] !== this.solution[r][c]) return;
            }
        }
        this.status = 'won';
        this._stopTimer();
        const best = Storage.get('best_sudoku', Infinity);
        if (this.timer < best) Storage.set('best_sudoku', this.timer);
        Audio.win();
    },

    _cellHasConflict(r, c) {
        const value = this.puzzle[r][c];
        if (!value) return false;

        for (let i = 0; i < this.SIZE; i++) {
            if (i !== c && this.puzzle[r][i] === value) return true;
            if (i !== r && this.puzzle[i][c] === value) return true;
        }

        const startR = Math.floor(r / this.SUBGRID) * this.SUBGRID;
        const startC = Math.floor(c / this.SUBGRID) * this.SUBGRID;
        for (let rr = startR; rr < startR + this.SUBGRID; rr++) {
            for (let cc = startC; cc < startC + this.SUBGRID; cc++) {
                if ((rr !== r || cc !== c) && this.puzzle[rr][cc] === value) return true;
            }
        }

        return false;
    },

    _moveSelection(dr, dc) {
        if (!this.selected) return;
        this.selected = {
            r: (this.selected.r + dr + this.SIZE) % this.SIZE,
            c: (this.selected.c + dc + this.SIZE) % this.SIZE
        };
        this.render();
    },

    _handleKey(e) {
        if (App.currentView !== 'sudoku') return;
        const digit = Number(e.key);
        if (e.key === 'ArrowUp') { e.preventDefault(); this._moveSelection(-1, 0); }
        if (e.key === 'ArrowDown') { e.preventDefault(); this._moveSelection(1, 0); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this._moveSelection(0, -1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this._moveSelection(0, 1); }
        if (digit >= 1 && digit <= 9) { e.preventDefault(); this._setValue(digit); }
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); this._setValue(0); }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.init(); }
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

    _startTimer() {
        this.timerId = setInterval(() => {
            this.timer++;
            const el = document.querySelector('.sudoku-timer');
            if (el) el.textContent = `${this.timer}s`;
        }, 1000);
    },

    _stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    },

    render() {
        const sec = document.querySelector('[data-view="sudoku"]');
        const best = Storage.get('best_sudoku', 0);

        const cellHtml = (value, r, c) => {
            const fixed = this._isFixed(r, c);
            const selected = this.selected && this.selected.r === r && this.selected.c === c;
            const related = this.selected && !selected && (
                this.selected.r === r ||
                this.selected.c === c ||
                (Math.floor(this.selected.r / 3) === Math.floor(r / 3) && Math.floor(this.selected.c / 3) === Math.floor(c / 3))
            );
            const error = !fixed && this._cellHasConflict(r, c);
            const rowBreak = r === 2 || r === 5 ? ' sudoku-row-break' : '';
            const classes = [
                'sudoku-cell',
                fixed ? 'sudoku-cell--fixed' : '',
                selected ? 'sudoku-cell--selected' : '',
                related ? 'sudoku-cell--related' : '',
                error ? 'sudoku-cell--error' : '',
                rowBreak
            ].filter(Boolean).join(' ');

            return `<button class="${classes}" data-r="${r}" data-c="${c}">${value || ''}</button>`;
        };

        sec.innerHTML = `
            <div class="game-header">
                <div class="game-header-left">
                    <div class="game-title">数 独</div>
                    <button class="back-btn" onclick="App.backToMenu()">← BACK</button>
                </div>
                <div class="sudoku-meta">
                    <div class="mine-counter">
                        <div class="counter-label">⏱ TIME</div>
                        <div class="counter-value sudoku-timer">${this.timer}s</div>
                    </div>
                    <div class="mine-counter">
                        <div class="counter-label">BEST</div>
                        <div class="counter-value">${best ? best + 's' : '--'}</div>
                    </div>
                </div>
            </div>
            <div class="sudoku-grid">
                ${this.puzzle.flatMap((row, r) => row.map((value, c) => cellHtml(value, r, c))).join('')}
            </div>
            <div class="sudoku-pad">
                ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pixel-btn" data-num="${n}">${n}</button>`).join('')}
                <button class="pixel-btn" data-num="0">清空</button>
            </div>
            <div class="game-hint">点击格子后输入 1-9 | DELETE 清空 | R 重开</div>
            ${this.status === 'won' ? `
            <div class="overlay">
                <div class="overlay-content win-overlay">
                    <h2>✨ 完成数独 ✨</h2>
                    <p>TIME: ${this.timer}s</p>
                    <button class="pixel-btn" onclick="GameSudoku.init()">再来一局</button>
                </div>
            </div>` : ''}
        `;

        sec.querySelectorAll('.sudoku-cell').forEach((cell) => {
            cell.onclick = () => {
                this.selected = { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
                this.render();
            };
        });

        sec.querySelectorAll('.sudoku-pad [data-num]').forEach((btn) => {
            btn.onclick = () => this._setValue(Number(btn.dataset.num));
        });
    }
};
