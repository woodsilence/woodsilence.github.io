const GameTyping = {
    WORDS: [
        'access', 'agent', 'array', 'binary', 'buffer', 'cache', 'cipher', 'client',
        'codec', 'commit', 'compile', 'console', 'cursor', 'daemon', 'debug', 'deploy',
        'device', 'domain', 'driver', 'encrypt', 'engine', 'export', 'filter', 'gateway',
        'kernel', 'lambda', 'matrix', 'memory', 'module', 'packet', 'payload', 'process',
        'protocol', 'proxy', 'python', 'query', 'render', 'router', 'runtime', 'script',
        'server', 'socket', 'source', 'stream', 'syntax', 'system', 'thread', 'token',
        'trace', 'update', 'vector', 'window'
    ],
    ROUND_SIZE: 12,
    words: [],
    completed: [],
    currentIndex: 0,
    input: '',
    status: 'ready',
    errors: 0,
    startTime: 0,
    elapsedMs: 0,
    bestMs: 0,
    timerId: null,
    _inputHandler: null,
    _keydownHandler: null,
    _clickHandler: null,

    init() {
        this.destroy();
        this.words = this._pickWords();
        this.completed = [];
        this.currentIndex = 0;
        this.input = '';
        this.status = 'ready';
        this.errors = 0;
        this.startTime = 0;
        this.elapsedMs = 0;
        this.bestMs = Storage.get('best_typing_ms', 0);
        this.render();
        this._bindEvents();
    },

    destroy() {
        this._stopTimer();
        this._unbindEvents();
    },

    _pickWords() {
        const pool = this.WORDS.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, this.ROUND_SIZE);
    },

    _startTimer() {
        if (this.timerId) return;
        this.status = 'playing';
        this.startTime = performance.now() - this.elapsedMs;
        this.timerId = setInterval(() => {
            this.elapsedMs = this._getElapsedMs();
            const el = document.querySelector('[data-view="typing"] .typing-time-value');
            if (el) el.textContent = this._formatTime(this.elapsedMs);
        }, 50);
    },

    _stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    },

    _getElapsedMs() {
        return this.startTime ? Math.round(performance.now() - this.startTime) : this.elapsedMs;
    },

    _formatTime(ms) {
        return (ms / 1000).toFixed(2) + 's';
    },

    _currentWord() {
        return this.words[this.currentIndex] || '';
    },

    _handleInput(value) {
        if (this.status === 'won') return;
        this.input = value.toLowerCase().replace(/[^a-z]/g, '');
        if (this.input && this.status === 'ready') this._startTimer();
        this.render();
    },

    _submitWord() {
        if (this.status === 'won') return;
        const word = this._currentWord();
        if (!word) return;

        if (this.input === word) {
            if (this.status === 'ready') this._startTimer();
            this.completed.push(word);
            this.currentIndex++;
            this.input = '';
            Audio.merge();

            if (this.currentIndex >= this.words.length) {
                this._finish();
            } else {
                this.render();
            }
            return;
        }

        this.errors++;
        Audio.flag();
        this.render();
    },

    _finish() {
        this.elapsedMs = this._getElapsedMs();
        this.status = 'won';
        this._stopTimer();

        if (!this.bestMs || this.elapsedMs < this.bestMs) {
            this.bestMs = this.elapsedMs;
            Storage.set('best_typing_ms', this.bestMs);
        }

        Audio.win();
        this.render();
    },

    _bindEvents() {
        const sec = document.querySelector('[data-view="typing"]');
        if (!sec) return;
        this._unbindEvents();

        this._inputHandler = (e) => {
            if (e.target.matches('.typing-input')) this._handleInput(e.target.value);
        };
        this._keydownHandler = (e) => {
            if (!e.target.matches('.typing-input')) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._submitWord();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.input = '';
                this.render();
            }
        };
        this._clickHandler = () => this._focusInput();

        sec.addEventListener('input', this._inputHandler);
        sec.addEventListener('keydown', this._keydownHandler);
        sec.addEventListener('click', this._clickHandler);
    },

    _unbindEvents() {
        const sec = document.querySelector('[data-view="typing"]');
        if (!sec) return;
        if (this._inputHandler) sec.removeEventListener('input', this._inputHandler);
        if (this._keydownHandler) sec.removeEventListener('keydown', this._keydownHandler);
        if (this._clickHandler) sec.removeEventListener('click', this._clickHandler);
        this._inputHandler = null;
        this._keydownHandler = null;
        this._clickHandler = null;
    },

    _focusInput() {
        if (this.status === 'won') return;
        const input = document.querySelector('[data-view="typing"] .typing-input');
        if (!input) return;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
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

    _renderTargetWord() {
        const word = this._currentWord();
        const chars = [];
        const maxLen = Math.max(word.length, this.input.length);

        for (let i = 0; i < maxLen; i++) {
            const typed = this.input[i];
            const expected = word[i];
            if (typed === undefined) {
                chars.push(`<span class="typing-char typing-char--pending">${this._escape(expected)}</span>`);
            } else if (typed === expected) {
                chars.push(`<span class="typing-char typing-char--ok">${this._escape(typed)}</span>`);
            } else {
                chars.push(`<span class="typing-char typing-char--bad">${this._escape(typed)}</span>`);
            }
        }

        return chars.join('');
    },

    _renderWordStream() {
        return this.words.map((word, i) => {
            let cls = 'typing-word';
            if (i < this.currentIndex) cls += ' typing-word--done';
            else if (i === this.currentIndex) cls += ' typing-word--active';
            return `<span class="${cls}">${this._escape(word)}</span>`;
        }).join('');
    },

    _renderLog() {
        const boot = [
            '<div class="typing-line"><span class="typing-prompt">root@webgame:~$</span> ./typing-drill --words=12</div>',
            '<div class="typing-line typing-line--dim">loading random word stream... ready</div>'
        ];
        const recent = this.completed.slice(-5).map(word =>
            `<div class="typing-line"><span class="typing-prompt">guest@terminal:~$</span> type ${this._escape(word)} <span class="typing-ok">[OK]</span></div>`
        );
        return boot.concat(recent).join('');
    },

    render() {
        const sec = document.querySelector('[data-view="typing"]');
        if (!sec) return;

        const currentWord = this._currentWord();
        const hasMismatch = this.input.split('').some((ch, i) => ch !== currentWord[i]);
        const progress = `${Math.min(this.currentIndex + 1, this.words.length)}/${this.words.length}`;

        sec.innerHTML = `
            <div class="game-header">
                <div class="game-header-left">
                    <div class="game-title">终端打字</div>
                    <button class="back-btn" onclick="App.backToMenu()">← BACK</button>
                </div>
                <div class="mine-counter">
                    <div class="counter-label">TIME</div>
                    <div class="counter-value typing-time-value">${this._formatTime(this.elapsedMs)}</div>
                </div>
                <div class="mine-counter">
                    <div class="counter-label">BEST</div>
                    <div class="counter-value">${this.bestMs ? this._formatTime(this.bestMs) : '--'}</div>
                </div>
            </div>
            <div class="typing-terminal">
                <div class="typing-log">${this._renderLog()}</div>
                <div class="typing-word-stream">${this._renderWordStream()}</div>
                <div class="typing-target">
                    <div class="typing-target-label">TARGET ${progress}</div>
                    <div class="typing-target-word">${this._renderTargetWord()}</div>
                </div>
                <label class="typing-command${hasMismatch ? ' typing-command--error' : ''}" for="typing-input">
                    <span class="typing-prompt">guest@terminal:~$</span>
                    <span class="typing-command-name">type</span>
                    <input id="typing-input" class="typing-input" value="${this._escape(this.input)}" autocomplete="off" spellcheck="false" inputmode="latin" ${this.status === 'won' ? 'disabled' : ''}>
                    <span class="typing-caret"></span>
                </label>
            </div>
            <div class="typing-stats">
                <div>WORDS ${this.currentIndex}/${this.words.length}</div>
                <div>ERRORS ${this.errors}</div>
            </div>
            <div class="game-hint">输入当前英文单词后按 SPACE / ENTER | ESC 清空</div>
            ${this.status === 'won' ? `
            <div class="overlay">
                <div class="overlay-content win-overlay">
                    <h2>SESSION COMPLETE</h2>
                    <p>TIME: ${this._formatTime(this.elapsedMs)} | ERRORS: ${this.errors}</p>
                    <button class="pixel-btn" onclick="GameTyping.init()">再来一局</button>
                </div>
            </div>` : ''}
        `;

        setTimeout(() => this._focusInput(), 0);
    }
};
