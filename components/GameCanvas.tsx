
import React, { useEffect, useRef, useState } from 'react';
import { GamePhase } from '../types';

interface GameCanvasProps {
  phase: GamePhase;
  multiplier: number;
  recentCashOuts: number; // Counter of total cashouts in the round to trigger drops
  timeToNextRound: number; // Timestamp for next round start
  highQuality: boolean; // Toggle for realistic graphics
  isDarkMode: boolean; // Toggle for theme
}

interface Parachute {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface Ripple {
  r: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  drag: number;
  gravity?: number;
  growth?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ phase, multiplier, recentCashOuts, timeToNextRound, highQuality, isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parachutesRef = useRef<Parachute[]>([]);
  const pulseRipplesRef = useRef<Ripple[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevCashOutsRef = useRef<number>(0);
  const propellerAngleRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const crashStartTimeRef = useRef<number>(0);
  const planeFlashRef = useRef<number>(0); // Flash intensity 0-1
  
  // Store the plane's current position to spawn parachutes correctly
  const planePosRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  const [showTooltip, setShowTooltip] = useState(false);

  // Load Background Image
  useEffect(() => {
    const img = new Image();
    // Realistic NASA space image (Earth view from space)
    img.src = "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop";
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, []);

  // Reset logic & Trigger Crash Effects
  useEffect(() => {
    if (phase === GamePhase.IDLE) {
      parachutesRef.current = [];
      pulseRipplesRef.current = [];
      particlesRef.current = [];
      prevCashOutsRef.current = 0;
      // propellerAngleRef.current = 0; // Don't reset angle so it spins continuously if desired
      crashStartTimeRef.current = 0;
      planeFlashRef.current = 0;
    }
    if (phase === GamePhase.FLYING) {
        crashStartTimeRef.current = 0;
        particlesRef.current = [];
    }
    if (phase === GamePhase.CRASHED) {
         // Create explosion particles at the current plane position if HQ
         if (highQuality) {
            const px = planePosRef.current.x;
            const py = planePosRef.current.y;
            
            // 1. Fire/Smoke Burst
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 2;
                particlesRef.current.push({
                    x: px,
                    y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1.0,
                    color: Math.random() > 0.3 ? '#ef4444' : (Math.random() > 0.5 ? '#f59e0b' : '#64748b'), // Red, Amber, Slate
                    size: Math.random() * 6 + 4,
                    drag: 0.95
                });
            }
            
            // 2. High speed sparks
            for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 12 + 5;
                particlesRef.current.push({
                    x: px,
                    y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1.0,
                    color: '#fef08a', // Yellow-200
                    size: Math.random() * 3 + 1,
                    drag: 0.90
                });
            }

            // 3. Smoke Clouds (Subtle, expanding)
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                particlesRef.current.push({
                    x: px + (Math.random() - 0.5) * 20,
                    y: py + (Math.random() - 0.5) * 20,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1, // Slight upward drift
                    alpha: 0.4 + Math.random() * 0.3,
                    color: Math.random() > 0.5 ? '#64748b' : '#94a3b8', // Slate-500/400
                    size: Math.random() * 10 + 5,
                    drag: 0.95,
                    growth: 0.2, // Expand
                    gravity: -0.05 // Float up slightly
                });
            }

            // 4. Debris (Falling chunks)
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 4;
                particlesRef.current.push({
                    x: px,
                    y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1.0,
                    color: '#334155', // Slate-700
                    size: Math.random() * 4 + 2,
                    drag: 0.98,
                    gravity: 0.4 // Fall down
                });
            }
         }
    }
  }, [phase, highQuality]);

  // Check for new cashouts to spawn parachutes, flash plane, and trigger ripples
  useEffect(() => {
    if (phase === GamePhase.FLYING) {
      const diff = recentCashOuts - prevCashOutsRef.current;
      if (diff > 0) {
        // Trigger Flash
        planeFlashRef.current = 1.0;

        if (highQuality) {
            // Trigger Ripple (Visual pulse)
            pulseRipplesRef.current.push({ r: 40, alpha: 1.0 });

            // Spawn 'diff' number of parachutes
            for (let i = 0; i < diff; i++) {
              parachutesRef.current.push({
                id: Date.now() + i,
                x: planePosRef.current.x,
                y: planePosRef.current.y,
                vx: (Math.random() - 0.5) * 2, // Slight horizontal drift
                vy: 2 + Math.random() * 2, // Fall speed
                color: Math.random() > 0.5 ? '#10b981' : '#f59e0b' // Green or Amber
              });
            }
        }
      }
      prevCashOutsRef.current = recentCashOuts;
    }
  }, [recentCashOuts, phase, highQuality]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const padding = 50;
      const now = Date.now();

      // Decay flash
      if (planeFlashRef.current > 0) {
          planeFlashRef.current -= 0.05; // Slower decay for better visibility
          if (planeFlashRef.current < 0) planeFlashRef.current = 0;
      }

      // --- Background ---
      if (highQuality && bgImageRef.current && bgImageRef.current.complete) {
        // Draw image cover style
        const img = bgImageRef.current;
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            drawWidth = width;
            drawHeight = width / imgRatio;
            offsetX = 0;
            offsetY = (height - drawHeight) / 2;
        } else {
            drawHeight = height;
            drawWidth = height * imgRatio;
            offsetX = (width - drawWidth) / 2;
            offsetY = 0;
        }
        
        ctx.save();
        ctx.globalAlpha = 0.6; // Darken it a bit
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();
        
        // Add a dark overlay gradient for readability
        const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
        overlayGrad.addColorStop(0, isDarkMode ? 'rgba(5, 5, 5, 0.4)' : 'rgba(15, 23, 42, 0.3)');
        overlayGrad.addColorStop(1, isDarkMode ? 'rgba(5, 5, 5, 0.8)' : 'rgba(15, 23, 42, 0.7)');
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Low Quality / Lite Mode Background
        ctx.fillStyle = isDarkMode ? '#050505' : '#0f172a'; // Black or Slate-950
        ctx.fillRect(0, 0, width, height);
        
        // Simple Grid background pattern for Lite Mode
        ctx.save();
        ctx.strokeStyle = isDarkMode ? '#18181b' : '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<width; i+=40) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
        for(let i=0; i<height; i+=40) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
        ctx.stroke();
        ctx.restore();
      }

      // --- CALCULATE SCALES ---
      const maxVisibleMult = Math.max(2, multiplier * 1.1);
      const mapX = (val: number) => padding + ((val - 1) / (maxVisibleMult - 1)) * (width - 2 * padding);
      const mapY = (val: number) => (height - padding) - ((val - 1) / (maxVisibleMult - 1)) * (height - 2 * padding);

      // --- DRAW AXES & LABELS ---
      // Styles for labels (Updated Font to Rajdhani)
      ctx.font = 'bold 14px Rajdhani';
      ctx.fillStyle = isDarkMode ? '#71717a' : '#64748b'; // Zinc-500 / Slate-500
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Y-Axis (Multiplier) Labels & Grid
      let yStep = 0.2;
      if (maxVisibleMult > 2) yStep = 0.5;
      if (maxVisibleMult > 5) yStep = 1;
      if (maxVisibleMult > 10) yStep = 2;
      if (maxVisibleMult > 20) yStep = 5;
      if (maxVisibleMult > 50) yStep = 10;
      if (maxVisibleMult > 100) yStep = 50;
      if (maxVisibleMult > 500) yStep = 100;

      for (let v = 1 + yStep; v < maxVisibleMult; v += yStep) {
          const y = mapY(v);
          if (y > padding && y < height - padding) {
              // Label
              ctx.fillText(v.toFixed(1) + 'x', padding - 10, y);
              
              // Grid Line
              ctx.save();
              ctx.strokeStyle = highQuality ? (isDarkMode ? 'rgba(113, 113, 122, 0.1)' : 'rgba(148, 163, 184, 0.1)') : (isDarkMode ? '#27272a' : '#334155');
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(padding, y);
              ctx.lineTo(width - padding, y);
              ctx.stroke();
              ctx.restore();
          }
      }

      // X-Axis (Time) Labels & Grid
      // Calculate max time (t = ln(M) / 0.15)
      const maxTime = Math.log(maxVisibleMult) / 0.15;
      let tStep = 2; // seconds
      if (maxTime > 10) tStep = 5;
      if (maxTime > 30) tStep = 10;
      if (maxTime > 60) tStep = 20;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let t = tStep; t < maxTime; t += tStep) {
          // Calculate multiplier at time t: M = e^(0.15*t)
          const mAtT = Math.exp(0.15 * t);
          const x = mapX(mAtT);
          
          if (x > padding && x < width - padding) {
              // Label
              ctx.fillText(t + 's', x, height - padding + 10);
              
              // Grid Line
              ctx.save();
              ctx.strokeStyle = highQuality ? (isDarkMode ? 'rgba(113, 113, 122, 0.1)' : 'rgba(148, 163, 184, 0.1)') : (isDarkMode ? '#27272a' : '#334155');
              ctx.beginPath();
              ctx.moveTo(x, padding);
              ctx.lineTo(x, height - padding);
              ctx.stroke();
              ctx.restore();
          }
      }

      // Draw Main Axes
      ctx.strokeStyle = isDarkMode ? '#52525b' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding); // Top Y
      ctx.lineTo(padding, height - padding); // Origin
      ctx.lineTo(width - padding, height - padding); // Right X
      ctx.stroke();

      // --- IDLE STATE (Countdown) ---
      if (phase === GamePhase.IDLE) {
        const timeLeft = Math.max(0, Math.ceil((timeToNextRound - now) / 1000));
        
        ctx.save();
        
        // --- PROPELLER ANIMATION (Background) ---
        propellerAngleRef.current += 0.15; // Slow spin for idle
        
        ctx.translate(width / 2, height / 2);
        ctx.rotate(propellerAngleRef.current);
        
        // Draw Propeller Blades (Large, faded)
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)';
        for(let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(0, -60, 20, 100, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.rotate((Math.PI * 2) / 3);
        }
        
        // Center Hub
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        
        ctx.restore(); // Undo rotation/translation for text

        // Glow effect for Text
        if (highQuality) {
            ctx.shadowColor = '#f59e0b'; // Amber glow
            ctx.shadowBlur = 20;
        }

        ctx.font = '800 20px Rajdhani';
        ctx.fillStyle = isDarkMode ? '#e4e4e7' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText("NEXT ROUND IN", width / 2, height / 2 - 40);

        // Dynamic Color: Green > 3s, Red <= 3s
        ctx.font = '900 80px Rajdhani';
        ctx.fillStyle = timeLeft > 3 ? '#10b981' : '#ef4444'; 
        ctx.fillText(`${timeLeft}s`, width / 2, height / 2 + 40);
        
        // --- BOUNCING DOT PRELOADER ---
        ctx.shadowBlur = 0;
        const centerX = width / 2;
        const centerY = height / 2 + 80;
        const dotCount = 5;
        const spacing = 25;
        const startX = centerX - ((dotCount - 1) * spacing) / 2;

        for (let i = 0; i < dotCount; i++) {
            const offset = i * 0.5;
            // Sine wave bounce based on time
            const bounce = Math.sin((now / 150) + offset) * 10;
            // Opacity pulse
            const alpha = 0.5 + Math.sin((now / 150) + offset) * 0.5;

            ctx.beginPath();
            ctx.arc(startX + i * spacing, centerY + bounce, 8, 0, Math.PI * 2);
            ctx.fillStyle = timeLeft > 3 ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
            ctx.fill();
        }
        
        // Powered by Spribe Animation
        ctx.font = 'bold 12px Rajdhani';
        ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(now / 500) * 0.2})`;
        ctx.fillText("Powered by SPRIBE", width - 20, height - 20);

        ctx.restore();
        
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // --- PLANE & CURVE ---
      const curX = mapX(multiplier);
      const curY = mapY(multiplier);
      
      // Calculate Plane Position (Visual only, separated from graph line for animation)
      let planeX = curX;
      let planeY = curY;
      let planeRot = 0;

      if (phase === GamePhase.FLYING) {
          // Enhanced Bobbing effect - mixing sines for more natural turbulence (Only in HQ)
          if (highQuality) {
            planeY += Math.sin(now / 200) * 8 + Math.cos(now / 450) * 3;
            planeRot = -Math.PI / 12 + Math.sin(now / 300) * 0.1;
          } else {
            planeRot = -Math.PI / 12;
          }
      } else if (phase === GamePhase.CRASHED) {
          if (crashStartTimeRef.current === 0) crashStartTimeRef.current = now;
          const dt = (now - crashStartTimeRef.current) / 1000;
          
          // Freefall gravity: y = 1/2 * g * t^2
          planeY += 600 * (dt ** 2); 
          
          if (highQuality) {
              planeX += 50 * dt + Math.cos(dt * 15) * 10;
              planeRot = (Math.PI / 12) + (dt * 5) + Math.sin(dt * 10) * 0.5;
          } else {
              planeX += 100 * dt;
              planeRot = Math.PI / 4;
          }
      }

      // Update ref for parachutes (follow the plane)
      planePosRef.current = { x: planeX, y: planeY };

      // --- DRAW CURVE ---
      ctx.beginPath();
      ctx.moveTo(padding, height - padding); // Start
      
      // Bezier Control Point (Use the graph coordinates curX, curY, not plane coordinates)
      const cpX = (padding + curX) / 2;
      const cpY = curY; 

      ctx.quadraticCurveTo(cpX, height - padding, curX, curY);
      
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = phase === GamePhase.CRASHED ? '#991b1b' : '#f59e0b'; // Dark red if crashed, Amber if flying
      ctx.stroke();

      // Gradient Fill
      ctx.lineTo(curX, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, height - padding, 0, curY);
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.0)');
      gradient.addColorStop(1, phase === GamePhase.CRASHED ? 'rgba(153, 27, 27, 0.5)' : 'rgba(245, 158, 11, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // --- PARACHUTES (HQ Only) ---
      if (highQuality) {
          parachutesRef.current.forEach((p, index) => {
            // Update Physics
            p.y += p.vy;
            p.x += p.vx;

            // Draw Parachute
            if (p.y < height - padding) {
              ctx.save();
              ctx.translate(p.x, p.y);
              
              // Chute (Semi circle)
              ctx.beginPath();
              ctx.arc(0, -10, 10, Math.PI, 0);
              ctx.fillStyle = p.color;
              ctx.fill();
              
              // Strings
              ctx.beginPath();
              ctx.moveTo(-10, -10);
              ctx.lineTo(0, 5);
              ctx.moveTo(10, -10);
              ctx.lineTo(0, 5);
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.stroke();

              // Little Pilot
              ctx.beginPath();
              ctx.arc(0, 5, 3, 0, Math.PI * 2);
              ctx.fillStyle = '#fff';
              ctx.fill();

              ctx.restore();
            }
          });
      }

      // --- RIPPLES (CASH OUT VISUAL) (HQ Only) ---
      if (highQuality) {
          pulseRipplesRef.current.forEach((ripple) => {
              ripple.r += 2;      // Expand radius
              ripple.alpha -= 0.04; // Fade out

              if (ripple.alpha > 0) {
                  ctx.save();
                  ctx.translate(planeX, planeY); // Follow plane
                  ctx.beginPath();
                  ctx.arc(0, 0, ripple.r, 0, Math.PI * 2);
                  
                  // Emerald ring with slight fill
                  ctx.strokeStyle = `rgba(16, 185, 129, ${ripple.alpha})`; 
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  
                  ctx.fillStyle = `rgba(16, 185, 129, ${ripple.alpha * 0.1})`;
                  ctx.fill();
                  
                  ctx.restore();
              }
          });
          // Cleanup faded ripples
          pulseRipplesRef.current = pulseRipplesRef.current.filter(r => r.alpha > 0);
      }

      // --- DRAW PLANE (AVIATOR STYLE) ---
      const drawPlane = () => {
        const scale = 0.8;
        ctx.scale(scale, scale);

        // Flash Effect Glow
        if (planeFlashRef.current > 0 && highQuality) {
             ctx.shadowColor = 'white';
             ctx.shadowBlur = 30 * planeFlashRef.current;
        } else {
             ctx.shadowBlur = 0;
        }

        // 1. Rear Tail
        ctx.fillStyle = '#9a3412'; // Dark Amber
        ctx.beginPath();
        ctx.moveTo(-35, -5);
        ctx.lineTo(-45, -20);
        ctx.lineTo(-25, -5);
        ctx.fill();

        // 2. Main Body (Fuselage)
        ctx.fillStyle = '#f59e0b'; // Amber-500
        ctx.beginPath();
        ctx.ellipse(0, 0, 40, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 3. Cockpit window
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.beginPath();
        ctx.ellipse(5, -6, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Wings (Top)
        ctx.fillStyle = '#d97706'; // Amber-600
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(15, -4);
        ctx.lineTo(10, 10); // Perspective shift
        ctx.lineTo(-15, 10);
        ctx.fill();

        // Flash Overlay (Brighten entire plane)
        if (planeFlashRef.current > 0 && highQuality) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(255, 255, 255, ${planeFlashRef.current * 0.8})`;
            
            // Draw a bounding ellipse for the flash overlay
            ctx.beginPath();
            ctx.ellipse(0, 0, 50, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 5. Propeller
        // Spin fast when flying, slow down significantly when crashed
        if (phase === GamePhase.FLYING) {
             propellerAngleRef.current += 0.6; // Slightly slower to avoid stroboscopic freeze at 60hz
        } else if (phase === GamePhase.CRASHED) {
             // Stop propeller on crash
             propellerAngleRef.current += 0; 
        }
        
        ctx.save();
        ctx.translate(38, 0); // Front of plane
        ctx.rotate(propellerAngleRef.current);
        
        ctx.fillStyle = '#334155'; // Dark Grey
        ctx.fillRect(-2, -25, 4, 50); // Blade
        ctx.fillStyle = '#94a3b8'; // Light Tip
        ctx.fillRect(-2, -25, 4, 5);
        ctx.fillRect(-2, 20, 4, 5);
        
        // Center hub
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
      };

      ctx.save();
      // Translate to calculated plane position (which includes bobbing/falling)
      ctx.translate(planeX, planeY);
      ctx.rotate(planeRot);
      drawPlane();
      ctx.restore();

      // --- DRAW PARTICLES (EXPLOSION) (HQ Only) ---
      if (highQuality) {
          particlesRef.current.forEach(p => {
              p.x += p.vx;
              p.y += p.vy;
              // Apply Drag
              p.vx *= p.drag;
              p.vy *= p.drag;
              
              if (p.gravity) p.vy += p.gravity;
              if (p.growth) p.size += p.growth;

              p.alpha -= 0.02; // Fade out

              if (p.alpha > 0) {
                  ctx.save();
                  ctx.globalAlpha = p.alpha;
                  ctx.fillStyle = p.color;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();
              }
          });
          particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      }

      // Additional text overlay for CRASHED
      if (phase === GamePhase.CRASHED) {
         ctx.save();
         // Text stays at the graph tip so the user knows where it ended
         ctx.translate(curX, curY); 
         
         ctx.font = 'bold 16px Rajdhani';
         ctx.fillStyle = '#fff';
         ctx.textAlign = 'center';
         // Offset text above the crash point
         ctx.fillText("FLEW AWAY", 0, -50);
         
         ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [phase, multiplier, timeToNextRound, highQuality, isDarkMode]);

  const getMultiplierColorClass = (val: number, currentPhase: GamePhase) => {
    if (currentPhase === GamePhase.CRASHED) return 'text-rose-600';
    if (val < 2.0) return 'text-blue-400';
    if (val < 10.0) return 'text-purple-500';
    return 'text-amber-500';
  };

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border-2 shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-[#0B0E14] border-slate-800'}`}>
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="w-full h-full object-cover relative z-10"
      />
      
      {/* Center Big Multiplier */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 select-none flex flex-col items-center pointer-events-auto cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {phase !== GamePhase.IDLE && (
          <div className={`text-7xl md:text-9xl font-black font-hud tracking-tighter drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-transform duration-100 ${
            getMultiplierColorClass(multiplier, phase)
          } ${showTooltip ? 'scale-105' : 'scale-100'}`}>
            {multiplier.toFixed(2)}x
          </div>
        )}

        {/* Tooltip */}
        {showTooltip && phase !== GamePhase.IDLE && (
            <div className={`absolute top-full mt-4 p-4 rounded-xl border backdrop-blur-md shadow-2xl w-64 text-center z-50 animate-in fade-in slide-in-from-top-2 pointer-events-none
                ${isDarkMode ? 'bg-zinc-950/95 border-zinc-800' : 'bg-slate-900/95 border-slate-700'}`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 font-hud ${phase === GamePhase.CRASHED ? 'text-rose-500' : 'text-amber-400'}`}>
                    {phase === GamePhase.CRASHED ? 'Crash Point' : 'Live Multiplier'}
                </div>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-400'}`}>
                    {phase === GamePhase.CRASHED 
                        ? "The plane flew away at this point. Bets not cashed out are lost."
                        : "Multiplier increases exponentially. Cash out anytime to multiply your bet!"}
                </p>
                {phase === GamePhase.FLYING && (
                    <div className="mt-3 text-xs font-mono font-bold text-white bg-white/10 py-1.5 rounded border border-white/5 font-hud">
                        Win = Bet × {multiplier.toFixed(2)}
                    </div>
                )}
            </div>
        )}

        {phase === GamePhase.CRASHED && (
           <div className="text-center mt-2 text-rose-500 font-bold uppercase tracking-[0.2em] text-lg animate-pulse font-hud">
             Round Over
           </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;
