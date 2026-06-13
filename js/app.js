const App = {
    currentView: 'menu',
    selectedIndex: 0,
    menuNotice: 'SYSTEM READY',
    games: [
        {
            id: '2048',
            name: '2 0 4 8',
            badge: 'NUM',
            aliases: ['2048', 'number'],
            bestText: () => {
                const s = Storage.get('best_2048', 0);
                return s ? s.toLocaleString() : '--';
            },
            module: Game2048
        },
        {
            id: 'minesweeper',
            name: '扫 雷',
            badge: 'MINE',
            aliases: ['minesweeper', 'mine', 'sweep'],
            bestText: () => {
                const t = Storage.get('best_minesweeper_easy', 0);
                return t ? t + 's' : '--';
            },
            module: GameMinesweeper
        },
        {
            id: 'sudoku',
            name: '数 独',
            badge: 'SUD',
            aliases: ['sudoku'],
            bestText: () => {
                const t = Storage.get('best_sudoku', 0);
                return t ? t + 's' : '--';
            },
            module: GameSudoku
        },
        {
            id: 'snake',
            name: '贪吃蛇',
            badge: 'SNK',
            aliases: ['snake'],
            bestText: () => {
                const s = Storage.get('best_snake', 0);
                return s ? s.toLocaleString() : '--';
            },
            module: GameSnake
        },
        {
            id: 'typing',
            name: '打 字',
            badge: 'TYPE',
            aliases: ['typing', 'type', 'terminal'],
            bestText: () => {
                const ms = Storage.get('best_typing_ms', 0);
                return ms ? (ms / 1000).toFixed(2) + 's' : '--';
            },
            module: GameTyping
        }
    ],

    init() {
        this.renderMenu();
        this._bindGlobalKeys();
    },

    navigateTo(view) {
        document.querySelectorAll('section[data-view]').forEach(s => s.classList.remove('active'));
        const sec = document.querySelector(`[data-view="${view}"]`);
        if (sec) sec.classList.add('active');

        if (this.currentView !== 'menu') {
            const prev = this.games.find(g => g.id === this.currentView);
            if (prev && prev.module.destroy) prev.module.destroy();
        }
        this.currentView = view;

        if (view !== 'menu') {
            const game = this.games.find(g => g.id === view);
            if (game && game.module.init) game.module.init();
        } else {
            this.renderMenu();
        }
    },

    backToMenu() {
        this.navigateTo('menu');
    },

    _escape(value) {
        return String(value).replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[ch]);
    },

    renderMenu() {
        const sec = document.querySelector('[data-view="menu"]');
        const len = this.games.length;

        const signalRows = this.games.map((game, i) => {
            const activeCls = i === this.selectedIndex ? ' menu-signal--active' : '';
            return `
                <div class="menu-signal${activeCls}" data-game="${game.id}" data-index="${i}">
                    <span class="menu-signal-index">[${String(i + 1).padStart(2, '0')}]</span>
                    <span class="menu-signal-name">${game.badge} / ${game.name}</span>
                    <span class="menu-signal-best">${game.bestText()}</span>
                </div>`;
        }).join('');

        sec.innerHTML = `
            <div class="menu-shell">
                <div class="menu-header">
                    <div class="menu-stars">ARCADE_OS / ${String(this.selectedIndex + 1).padStart(2, '0')}/${String(len).padStart(2, '0')}</div>
                    <h1 class="menu-title">游戏合集</h1>
                </div>
                <div class="menu-signal-list">${signalRows}</div>
                <div class="menu-notice">${this._escape(this.menuNotice)}</div>
            </div>
        `;

        sec.querySelectorAll('.menu-signal').forEach(row => {
            row.onclick = () => this._selectGame(Number(row.dataset.index), 'TARGET LOCKED');
            row.ondblclick = () => this._enter();
        });
    },

    _selectGame(index, notice) {
        if (index < 0 || index >= this.games.length) return;
        this.selectedIndex = index;
        this.menuNotice = notice || `TARGET ${this.games[index].id}`;
        this.renderMenu();
    },

    _prev() {
        this._selectGame((this.selectedIndex - 1 + this.games.length) % this.games.length, 'TARGET SHIFT LEFT');
    },
    _next() {
        this._selectGame((this.selectedIndex + 1) % this.games.length, 'TARGET SHIFT RIGHT');
    },
    _enter() {
        this.menuNotice = `EXEC ${this.games[this.selectedIndex].id}`;
        this.navigateTo(this.games[this.selectedIndex].id);
    },

    _findGameByCommand(command) {
        const normalized = command.toLowerCase().replace(/\s+/g, '');
        return this.games.find(game => {
            const name = game.name.toLowerCase().replace(/\s+/g, '');
            return game.id === normalized ||
                name === normalized ||
                (game.aliases || []).some(alias => alias === normalized);
        }) || this.games.find(game => {
            const aliases = [game.id, game.name.toLowerCase().replace(/\s+/g, ''), ...(game.aliases || [])];
            return aliases.some(alias => alias.startsWith(normalized));
        });
    },

    _activeGame() {
        return this.games.find(game => game.id === this.currentView);
    },

    _hasSettlementOverlay() {
        if (this.currentView === 'menu') return false;
        const activeSection = document.querySelector(`section[data-view="${this.currentView}"].active`);
        return !!(activeSection && activeSection.querySelector('.overlay'));
    },

    _restartCurrentGame() {
        const game = this._activeGame();
        if (game && game.module.init) game.module.init();
    },

    _bindGlobalKeys() {
        document.addEventListener('keydown', (e) => {
            if (this._hasSettlementOverlay()) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this._restartCurrentGame();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.backToMenu();
                    return;
                }
            }

            if (this.currentView !== 'menu') return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')  { e.preventDefault(); this._prev(); }
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); this._next(); }
            if (e.key === 'Enter')      { e.preventDefault(); this._enter(); }
            if (/^[1-9]$/.test(e.key)) {
                const index = Number(e.key) - 1;
                if (index < this.games.length) {
                    e.preventDefault();
                    this.selectedIndex = index;
                    this.menuNotice = `EXEC ${this.games[index].id}`;
                    this.navigateTo(this.games[index].id);
                }
            }
        });
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
