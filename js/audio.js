const Audio = {
    _ctx: null,
    _muted: false,

    _getCtx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._ctx.state === 'suspended') this._ctx.resume();
        return this._ctx;
    },

    _play(freq, duration, type) {
        if (this._muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type || 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch { /* audio not supported */ }
    },

    move()   { this._play(200, 0.06); },
    merge()  { this._play(440, 0.1); },
    reveal() { this._play(330, 0.04); },
    flag()   { this._play(550, 0.06); },
    explode(){ this._play(80, 0.35, 'sawtooth'); },
    win()    { this._play(523,0.08);setTimeout(()=>this._play(659,0.08),80);setTimeout(()=>this._play(784,0.15),160); },
    lose()   { this._play(200,0.12);setTimeout(()=>this._play(140,0.12),130);setTimeout(()=>this._play(90,0.25),260); },

    toggle() { this._muted = !this._muted; return this._muted; },
    isMuted() { return this._muted; }
};
