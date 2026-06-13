const App = {
    currentView: 'menu',
    carouselIndex: 0,
    games: [
        {
            id: '2048',
            name: '2 0 4 8',
            emoji: '🔢',
            bestText: () => {
                const s = Storage.get('best_2048', 0);
                return s ? s.toLocaleString() : '--';
            },
            module: Game2048
        },
        {
            id: 'minesweeper',
            name: '扫 雷',
            emoji: '💣',
            bestText: () => {
                const t = Storage.get('best_minesweeper_easy', 0);
                return t ? t + 's' : '--';
            },
            module: GameMinesweeper
        },
        {
            id: 'sudoku',
            name: '数 独',
            emoji: '🧩',
            bestText: () => {
                const t = Storage.get('best_sudoku', 0);
                return t ? t + 's' : '--';
            },
            module: GameSudoku
        },
        {
            id: 'snake',
            name: '贪吃蛇',
            emoji: '🐍',
            bestText: () => {
                const s = Storage.get('best_snake', 0);
                return s ? s.toLocaleString() : '--';
            },
            module: GameSnake
        },
        {
            id: 'typing',
            name: '打 字',
            emoji: '⌨️',
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

    renderMenu() {
        const sec = document.querySelector('[data-view="menu"]');
        const active = this.games[this.carouselIndex];
        const len = this.games.length;
        const prev = this.games[(this.carouselIndex - 1 + len) % len];
        const next = this.games[(this.carouselIndex + 1) % len];

        const cardHtml = (game, side) => {
            const sideCls = side ? ' carousel-card--side' : '';
            const cls = side ? sideCls : ' carousel-card--active';
            return `
                <div class="carousel-card${cls}" data-game="${game.id}">
                    <div class="carousel-card-emoji">${game.emoji}</div>
                    <div class="carousel-card-name">${game.name}</div>
                    <div class="carousel-card-best">BEST: ${game.bestText()}</div>
                    ${side ? '' : '<div class="carousel-card-start">▶ 开始</div>'}
                </div>`;
        };

        sec.innerHTML = `
            <div class="menu-header">
                <div class="menu-stars">★ ★ ★</div>
                <h1 class="menu-title">游戏合集</h1>
            </div>
            <div class="carousel">
                <div class="carousel-arrow carousel-arrow--left">◀</div>
                <div class="carousel-track">
                    ${cardHtml(prev, true)}
                    ${cardHtml(active, false)}
                    ${cardHtml(next, true)}
                </div>
                <div class="carousel-arrow carousel-arrow--right">▶</div>
            </div>
            <div class="carousel-dots">
                ${this.games.map((g, i) =>
                    `<div class="carousel-dot${i === this.carouselIndex ? ' active' : ''}"></div>`
                ).join('')}
            </div>
            <div class="menu-hint">← → 选择 | ENTER 开始</div>
        `;

        sec.querySelector('.carousel-arrow--left').onclick = () => this._prev();
        sec.querySelector('.carousel-arrow--right').onclick = () => this._next();
        sec.querySelector('.carousel-card--active').onclick = () => this._enter();
        sec.querySelectorAll('.carousel-card--side').forEach(card => {
            card.onclick = () => {
                this.carouselIndex = this.games.findIndex(g => g.id === card.dataset.game);
                this.renderMenu();
            };
        });
    },

    _prev() { this.carouselIndex = (this.carouselIndex - 1 + this.games.length) % this.games.length; this.renderMenu(); },
    _next() { this.carouselIndex = (this.carouselIndex + 1) % this.games.length; this.renderMenu(); },
    _enter() { this.navigateTo(this.games[this.carouselIndex].id); },

    _bindGlobalKeys() {
        document.addEventListener('keydown', (e) => {
            if (this.currentView !== 'menu') return;
            if (e.key === 'ArrowLeft')  { e.preventDefault(); this._prev(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); this._next(); }
            if (e.key === 'Enter')      { e.preventDefault(); this._enter(); }
        });
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
