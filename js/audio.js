const Audio = {
    _ctx: null,
    _muted: false,
    _masterVolume: 0.55,

    _getCtx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._ctx.state === 'suspended') this._ctx.resume();
        return this._ctx;
    },

    _play(freq, duration, type, volume) {
        if (this._muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;
            const peak = (volume || 0.028) * this._masterVolume;
            const attack = Math.min(0.012, duration * 0.35);

            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(peak, now + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.02);
        } catch { /* audio not supported */ }
    },

    move()   { this._play(180, 0.05, 'sine', 0.020); },
    merge()  { this._play(392, 0.09, 'triangle', 0.026); },
    reveal() { this._play(300, 0.04, 'sine', 0.017); },
    flag()   { this._play(460, 0.05, 'sine', 0.018); },
    explode(){ this._play(95, 0.22, 'triangle', 0.030); },
    win()    { this._play(523,0.09,'sine',0.022);setTimeout(()=>this._play(659,0.09,'sine',0.020),90);setTimeout(()=>this._play(784,0.16,'sine',0.018),180); },
    lose()   { this._play(196,0.11,'triangle',0.023);setTimeout(()=>this._play(147,0.12,'triangle',0.021),130);setTimeout(()=>this._play(110,0.2,'triangle',0.019),260); },

    toggle() { this._muted = !this._muted; return this._muted; },
    isMuted() { return this._muted; }
};
