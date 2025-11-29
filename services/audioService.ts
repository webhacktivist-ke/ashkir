
import { GamePhase } from '../types';

class AudioService {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineLFO: OscillatorNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private isMuted: boolean = true;
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;
    
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.initialized = true;
        this.isMuted = false;
        
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    } catch (e) {
        console.error("Audio init failed", e);
    }
  }
  
  toggleMute() {
      if (!this.initialized) {
          this.init();
          return false; 
      }
      this.isMuted = !this.isMuted;
      
      if (this.isMuted) {
          this.stopEngine();
          if (this.ctx?.state === 'running') this.ctx.suspend();
      } else {
          if (this.ctx?.state === 'suspended') this.ctx.resume();
      }
      
      return this.isMuted;
  }
  
  startEngine() {
    if (!this.ctx || this.isMuted) return;
    this.stopEngine(); // Ensure no duplicates

    const t = this.ctx.currentTime;
    
    // --- 1. Futuristic Drone (Sawtooth + Lowpass) ---
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth'; 
    this.engineOsc.frequency.setValueAtTime(100, t); // Base drone pitch
    
    // Filter to make it sound like a synth/pad
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.Q.value = 5;

    // LFO for throbbing effect
    this.engineLFO = this.ctx.createOscillator();
    this.engineLFO.type = 'sine';
    this.engineLFO.frequency.setValueAtTime(8, t); 
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 100; // Filter modulation depth

    // Engine Main Gain
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, t);
    this.engineGain.gain.linearRampToValueAtTime(0.1, t + 1); 

    // --- 2. High Harmonic Drone (Music-like) ---
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'triangle';
    this.droneOsc.frequency.setValueAtTime(200, t); // Harmonic
    
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, t);
    this.droneGain.gain.linearRampToValueAtTime(0.05, t + 2);

    // Connections
    this.engineLFO.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    
    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);
    
    this.engineOsc.start(t);
    this.engineLFO.start(t);
    this.droneOsc.start(t);
  }

  updateEngine(multiplier: number) {
    if (!this.ctx || this.isMuted) return;
    
    // Pitch up the drone slightly as it flies
    if (this.engineOsc) {
        const targetFreq = 100 + (multiplier * 20); 
        this.engineOsc.frequency.setTargetAtTime(Math.min(targetFreq, 400), this.ctx.currentTime, 0.1);
    }
    
    // Harmonic pitch up
    if (this.droneOsc) {
         const targetFreq = 200 + (multiplier * 30);
         this.droneOsc.frequency.setTargetAtTime(Math.min(targetFreq, 800), this.ctx.currentTime, 0.1);
    }

    // Faster LFO pulse
    if (this.engineLFO) {
        const targetRate = 8 + (multiplier * 1.5);
        this.engineLFO.frequency.setTargetAtTime(Math.min(targetRate, 25), this.ctx.currentTime, 0.1);
    }
  }

  stopEngine() {
    const t = this.ctx?.currentTime || 0;
    
    if (this.engineOsc) {
      this.engineGain?.gain.setTargetAtTime(0, t, 0.2);
      this.engineOsc.stop(t + 0.3);
      this.engineOsc = null;
    }

    if (this.engineLFO) {
        this.engineLFO.stop(t + 0.3);
        this.engineLFO = null;
    }
    
    if (this.droneOsc) {
        this.droneGain?.gain.setTargetAtTime(0, t, 0.2);
        this.droneOsc.stop(t + 0.3);
        this.droneOsc = null;
    }
  }

  playCashout() {
    if (!this.ctx || this.isMuted) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // "Ka-ching" / Coin sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t); 
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playBetPlaced() {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(600, t);
    gain1.gain.setValueAtTime(0.05, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc1.start(t);
    osc1.stop(t + 0.1);
  }

  playCrash() {
    this.stopEngine();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Sci-fi crash downer
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.5);
  }
}

export const audioManager = new AudioService();
