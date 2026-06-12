const Game2048 = {
    SIZE: 4,
    grid: null,
    score: 0,
    bestScore: 0,
    gameOver: false,
    _nextId: 1,
    _prevPositions: null,
    _tileDeltas: null,
    _newTileIds: null,
    _mergedCells: null,

    init() {
        this._unbindKeys();
        this.grid = Array.from({ length: this.SIZE }, () =>
            Array.from({ length: this.SIZE }, () => ({ value: 0, id: 0 }))
        );
        this.score = 0;
        this.bestScore = Storage.get('best_2048', 0);
        this.gameOver = false;
        this._nextId = 1;
        this._prevPositions = null;
        this._tileDeltas = null;
        this._newTileIds = null;
        this._mergedCells = null;
        this.addTile();
        this.addTile();
        this.render();
        this._bindKeys();
    },

    destroy() {
        this._unbindKeys();
    },

    addTile() {
        const empty = [];
        for (let r = 0; r < this.SIZE; r++)
            for (let c = 0; c < this.SIZE; c++)
                if (this.grid[r][c].value === 0) empty.push({ r, c });
        if (!empty.length) return;
        const { r, c } = empty[Math.floor(Math.random() * empty.length)];
        this.grid[r][c] = { value: Math.random() < 0.9 ? 2 : 4, id: this._nextId++ };
    },

    move(dir) {
        if (this.gameOver) return;
        const rotMap = { up: 3, right: 2, down: 1, left: 0 };
        const rot = rotMap[dir];
        if (rot === undefined) return;

        this._savePositions();

        let g = this._rotate(this.grid, rot);
        let moved = false;
        let mergeScore = 0;
        let mergedPositions = [];

        for (let r = 0; r < this.SIZE; r++) {
            const { row, moved: m, merged, mergedCols } = this._slide(g[r]);
            g[r] = row;
            if (m) moved = true;
            mergeScore += merged;
            for (const c of mergedCols) mergedPositions.push({ r, c });
        }

        if (moved) {
            this.grid = this._rotate(g, (4 - rot) % 4);
            this._computeDeltas(rot, mergedPositions);

            this.score += mergeScore;
            this.addTile();
            Audio.move();
            if (mergeScore) Audio.merge();
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                Storage.set('best_2048', this.bestScore);
            }
            if (this._isGameOver()) {
                this.gameOver = true;
                setTimeout(() => Audio.lose(), 200);
            }
            this.render();
        }
    },

    _savePositions() {
        this._prevPositions = new Map();
        for (let r = 0; r < this.SIZE; r++)
            for (let c = 0; c < this.SIZE; c++) {
                const cell = this.grid[r][c];
                if (cell.id) this._prevPositions.set(cell.id, { r, c });
            }
    },

    _computeDeltas(rot, mergedPositions) {
        this._tileDeltas = new Map();
        this._newTileIds = new Set();
        this._mergedCells = new Set();

        const invRot = (4 - rot) % 4;

        // Map merged positions (in rotated frame) back to grid coords
        for (const { r, c } of mergedPositions) {
            let rr = r, cc = c;
            for (let t = 0; t < invRot; t++)
                [rr, cc] = [cc, this.SIZE - 1 - rr];
            this._mergedCells.add(`${rr},${cc}`);
        }

        // Compute move deltas for each tile
        for (let r = 0; r < this.SIZE; r++)
            for (let c = 0; c < this.SIZE; c++) {
                const cell = this.grid[r][c];
                if (!cell.id) continue;
                const prev = this._prevPositions.get(cell.id);
                if (prev) {
                    const dr = prev.r - r;
                    const dc = prev.c - c;
                    if (dr !== 0 || dc !== 0)
                        this._tileDeltas.set(cell.id, { dr, dc });
                } else {
                    this._newTileIds.add(cell.id);
                }
            }
    },

    _slide(row) {
        let arr = row.filter(v => v.value !== 0);
        let moved = row.some((v, i) => v.value !== ((arr[i] && arr[i].value) || 0));
        let merged = 0;
        let mergedCols = [];
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i].value === arr[i + 1].value) {
                arr[i].value *= 2;
                merged += arr[i].value;
                arr[i].id = this._nextId++;
                mergedCols.push(i);
                arr.splice(i + 1, 1);
                arr.push({ value: 0, id: 0 });
                moved = true;
            }
        }
        while (arr.length < this.SIZE) arr.push({ value: 0, id: 0 });
        return { row: arr, moved, merged, mergedCols };
    },

    _rotate(grid, times) {
        let g = grid.map(r => r.map(c => ({ value: c.value, id: c.id })));
        for (let t = 0; t < times; t++) {
            const n = Array.from({ length: this.SIZE }, () =>
                Array.from({ length: this.SIZE }, () => ({ value: 0, id: 0 }))
            );
            for (let r = 0; r < this.SIZE; r++)
                for (let c = 0; c < this.SIZE; c++)
                    n[c][this.SIZE - 1 - r] = { value: g[r][c].value, id: g[r][c].id };
            g = n;
        }
        return g;
    },

    _isGameOver() {
        for (let r = 0; r < this.SIZE; r++)
            for (let c = 0; c < this.SIZE; c++) {
                if (this.grid[r][c].value === 0) return false;
                if (c < this.SIZE - 1 && this.grid[r][c].value === this.grid[r][c + 1].value) return false;
                if (r < this.SIZE - 1 && this.grid[r][c].value === this.grid[r + 1][c].value) return false;
            }
        return true;
    },

    _handleKey(e) {
        const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
        if (dirMap[e.key]) { e.preventDefault(); this.move(dirMap[e.key]); }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.init(); }
    },

    _keyHandler: null,
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
        const sec = document.querySelector('[data-view="2048"]');
        const merged = this._mergedCells;
        const deltas = this._tileDeltas;
        const newIds = this._newTileIds;

        const tileHtml = (cell, r, c) => {
            const val = cell.value;
            let cls = val ? `tile tile-${Math.min(val, 8192)}` : 'tile';
            let style = '';

            if (val) {
                if (merged && merged.has(`${r},${c}`)) cls += ' tile-merged';
                else if (cell.id && deltas && deltas.has(cell.id)) {
                    const d = deltas.get(cell.id);
                    cls += ' tile-moved';
                    style = `style="--dr:${d.dr};--dc:${d.dc}"`;
                } else if (cell.id && newIds && newIds.has(cell.id)) {
                    cls += ' tile-new';
                }
            }

            const v = val || '';
            return `<div class="${cls}" ${style} data-value="${v}">${v}</div>`;
        };

        sec.innerHTML = `
            <div class="game-header">
                <div class="game-header-left">
                    <div class="game-title">2 0 4 8</div>
                    <button class="back-btn" onclick="App.backToMenu()">← BACK</button>
                </div>
                <div class="game-header-right">
                    <div class="score-label">SCORE</div>
                    <div class="score-value">${this.score.toLocaleString()}</div>
                    <div class="best-label">BEST: ${this.bestScore.toLocaleString()}</div>
                </div>
            </div>
            <div class="grid-2048">
                ${this.grid.flatMap((row, r) => row.map((cell, c) => tileHtml(cell, r, c))).join('')}
            </div>
            <div class="game-hint">← ↑ ↓ → 移动 | R 重来</div>
            ${this.gameOver ? `
            <div class="overlay">
                <div class="overlay-content lose-overlay">
                    <h2>GAME OVER</h2>
                    <p>SCORE: ${this.score.toLocaleString()}</p>
                    <button class="pixel-btn" onclick="Game2048.init()">再来一局</button>
                </div>
            </div>` : ''}
        `;

        this._prevPositions = null;
        this._tileDeltas = null;
        this._newTileIds = null;
        this._mergedCells = null;
    }
};
