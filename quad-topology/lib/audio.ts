"use client";

class AudioManager {
    private bgmAudio: HTMLAudioElement | null = null;
    private ctx: AudioContext | null = null;
    private muted: boolean = false;
    private bgmVolume: number = 0.5;
    private sfxVolume: number = 0.5;

    constructor() {
        if (typeof window !== 'undefined') {
            // this.bgmAudio = new Audio('/music/gameMusic.mp3');
            // this.bgmAudio.loop = true;
            // this.bgmAudio.volume = this.bgmVolume;
        }
    }

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.ctx;
    }

    setBGMVolume(vol: number) {
        this.bgmVolume = Math.max(0, Math.min(1, vol));
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.bgmVolume;
        }
    }

    getBGMVolume() {
        return this.bgmVolume;
    }

    setSFXVolume(vol: number) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
    }

    getSFXVolume() {
        return this.sfxVolume;
    }

    playBGM() {
        if (this.muted || !this.bgmAudio) return;

        // Play if not already playing
        if (this.bgmAudio.paused) {
            this.bgmAudio.play().catch(e => {
                console.warn("Autoplay prevented:", e);
            });
        }
    }

    playChord(frequencies: number[]) {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq / 2; // Octave down for pad
            osc.type = 'triangle'; // Softer than sine, richer

            // Envelope: Slow attack, Sustained, Slow Release
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.03 * this.bgmVolume, now + 1);
            gain.gain.setValueAtTime(0.03 * this.bgmVolume, now + 3);
            gain.gain.linearRampToValueAtTime(0, now + 4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 4);
        });
    }

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
    }

    playSFX(name: 'click' | 'connect' | 'win' | 'error') {
        if (this.muted) return;
        const ctx = this.getContext();
        // Ensure context is running (sometimes suspended by browser)
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const vol = this.sfxVolume; // Use SFX volume

        switch (name) {
            case 'click':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                gain.gain.setValueAtTime(0.1 * vol, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'connect':
                // "Pop" sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
                gain.gain.setValueAtTime(0.1 * vol, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'win':
                // Victory Fanfare: Sol-do-mi-sol-DO!
                // G4, C5, E5, G5, C6
                const winNotes = [392.00, 523.25, 659.25, 783.99, 1046.50];
                winNotes.forEach((freq, i) => {
                    this.playNote(freq, now + (i * 0.1), 0.2, 'square');
                });
                break;

            case 'error':
                // "Bwaa-bwaa" descending
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.3); // Slide down

                gain.gain.setValueAtTime(0.1 * vol, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);

                osc.start(now);
                osc.stop(now + 0.3);

                // Second tone for emphasis
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(150, now + 0.1);
                osc2.frequency.linearRampToValueAtTime(80, now + 0.4);
                gain2.gain.setValueAtTime(0, now + 0.1);
                gain2.gain.linearRampToValueAtTime(0.1 * vol, now + 0.15);
                gain2.gain.linearRampToValueAtTime(0, now + 0.4);
                osc2.start(now + 0.1);
                osc2.stop(now + 0.4);
                break;
        }
    }

    private playNote(freq: number, time: number, duration: number, type: OscillatorType = 'square') {
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = freq;
        osc.type = type;

        // Apply volume
        const peakGain = 0.05 * this.sfxVolume;

        gain.gain.setValueAtTime(peakGain, time);
        gain.gain.exponentialRampToValueAtTime(0.001 * this.sfxVolume, time + duration); // Scaled fade out

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.bgmAudio?.pause();
        } else {
            this.bgmAudio?.play().catch(() => { });
        }
        return this.muted;
    }
}

// Singleton instance
export const audioManager = new AudioManager();
