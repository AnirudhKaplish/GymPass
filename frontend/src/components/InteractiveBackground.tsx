'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  decay: number;
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  // 1. Mouse movements & smooth LERP for 3D Parallax Rotation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth: width, innerHeight: height } = window;
      // Map to range [-8, 8] degrees
      const rotY = ((e.clientX - width / 2) / (width / 2)) * 8;
      const rotX = ((e.clientY - height / 2) / (height / 2)) * -8;
      targetRotation.current = { x: rotX, y: rotY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // LERP loop
  useEffect(() => {
    let animId: number;
    const update = () => {
      setRotation((prev) => ({
        x: prev.x + (targetRotation.current.x - prev.x) * 0.08,
        y: prev.y + (targetRotation.current.y - prev.y) * 0.08,
      }));
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2. Custom Cursor Canvas Golden Dusty Trail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Track particles
    let particles: Particle[] = [];
    const mouse = { 
      x: -1000, 
      y: -1000, 
      lastX: -1000, 
      lastY: -1000, 
      active: false, 
      hoveringInteractive: false 
    };

    const handleCursorMove = (e: MouseEvent) => {
      mouse.active = true;
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Automated hit detection on DOM elements to check interactive states
      const el = document.elementFromPoint(e.clientX, e.clientY);
      let isInteractive = false;
      if (el) {
        const cursorStyle = window.getComputedStyle(el).cursor;
        isInteractive = !!(
          el.closest('button, a, input, select, textarea, [role="button"], .card-charcoal, .btn-red, .btn-gold, .btn-dark-red, tr.hover\\:bg-white\\/5') ||
          el.classList.contains('cursor-pointer') ||
          cursorStyle === 'pointer' ||
          cursorStyle === 'text'
        );
      }
      mouse.hoveringInteractive = isInteractive;

      // Only emit gold dust sparkles if not hovering over inputs, buttons, or cards
      if (!isInteractive && mouse.lastX !== -1000) {
        const dx = mouse.x - mouse.lastX;
        const dy = mouse.y - mouse.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Spawn particles proportional to speed
        const numParticles = Math.min(Math.floor(dist * 0.4) + 1, 6);
        for (let i = 0; i < numParticles; i++) {
          const angle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 0.6;
          const speed = Math.min(dist * 0.1 + Math.random() * 1.2, 2.5);

          particles.push({
            x: mouse.x + (Math.random() - 0.5) * 4,
            y: mouse.y + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.2,
            vy: Math.sin(angle) * speed - (Math.random() * 0.15 + 0.05), // upward drift
            size: Math.random() * 2.8 + 0.8, // gold dust particle size
            alpha: 1.0,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.015 // fade over 50-70 frames
          });
        }
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleCursorMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render gold particles tail (always active and decaying)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= p.decay;
        p.size *= 0.95; // shrink

        if (p.life <= 0 || p.size <= 0.2) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Golden dusty glow
        const r = 255;
        const g = 200 + Math.floor(Math.random() * 45); // 200 to 245
        const b = 70 + Math.floor(Math.random() * 30);  // 70 to 100
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life * 0.8})`;
        
        ctx.shadowBlur = p.size * 3.5;
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Draw custom cursor head if active AND not hovering over interactive items
      if (mouse.active && !mouse.hoveringInteractive && mouse.x > 0 && mouse.y > 0) {
        // Outer glowing gold aura
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 213, 74, 0.35)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD54A';
        ctx.fill();

        // Inner white-hot core dot
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#FFFFFF';
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleCursorMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* 3D Parallax Background Layer (Placed behind content via z-0) */}
      <div className="fixed inset-0 overflow-hidden bg-[#050505] z-0 select-none pointer-events-none">
        {/* Layer 1: Background dark gym silhouettes (Deep Parallax) */}
        <div 
          className="absolute inset-0 transition-transform duration-300 ease-out opacity-12 blur-[10px]"
          style={{
            transform: `translate3d(${rotation.y * -0.6}px, ${rotation.x * -0.6}px, -150px) scale(1.05)`,
          }}
        >
          <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 1920 1080">
            {/* Gym Wall Pillars */}
            <rect x="200" y="0" width="80" height="1080" fill="currentColor" opacity="0.15" />
            <rect x="700" y="0" width="80" height="1080" fill="currentColor" opacity="0.15" />
            <rect x="1200" y="0" width="80" height="1080" fill="currentColor" opacity="0.15" />
            <rect x="1700" y="0" width="80" height="1080" fill="currentColor" opacity="0.15" />
            
            {/* Workout Bench Silhouette (Left) */}
            <path d="M100 800 h350 v30 h-350 z M220 830 v150 h30 v-150 z M350 830 v150 h30 v-150 z" opacity="0.4" />
            
            {/* Treadmill Silhouette (Right) */}
            <path d="M1350 980 l180 -120 h220 v40 h-200 l-180 80 z M1530 860 v-250 h-50 v-30 h120 v280 z" opacity="0.35" />
            
            {/* Barbell plates outline (Deep Left) */}
            <circle cx="150" cy="900" r="60" opacity="0.3" />
            <circle cx="150" cy="900" r="45" opacity="0.4" />
          </svg>
        </div>

        {/* Layer 2: Gym Equipment closer silhouettes */}
        <div 
          className="absolute inset-0 transition-transform duration-300 ease-out opacity-15 blur-[4px]"
          style={{
            transform: `translate3d(${rotation.y * -1.2}px, ${rotation.x * -1.2}px, -70px) scale(1.02)`,
          }}
        >
          <svg className="w-full h-full text-[#FFD54A]" fill="currentColor" viewBox="0 0 1920 1080">
            {/* Cable Machine Crossover (Center Left) */}
            <path d="M450 200 h400 v50 h-30 v700 h30 v50 h-430 v-50 h30 v-700 h-30 z M650 250 v650 h50 v-650 z" opacity="0.18" />
            
            {/* Squat Rack (Right) */}
            <path d="M1100 150 h60 v850 h-60 z M1400 150 h60 v850 h-60 z M1050 200 h460 v40 h-460 z M1100 450 h360 v25 h-360 z" opacity="0.22" />
            <rect x="1130" y="440" width="300" height="45" rx="8" opacity="0.3" />
            <rect x="1100" y="420" width="30" height="85" rx="4" opacity="0.4" />
            <rect x="1430" y="420" width="30" height="85" rx="4" opacity="0.4" />

            {/* Dumbbells Rack Outline (Bottom center) */}
            <path d="M750 900 h420 v40 h-420 z M800 940 v60 h320 v-60 z" opacity="0.25" />
            <circle cx="780" cy="875" r="22" opacity="0.35" />
            <circle cx="840" cy="875" r="22" opacity="0.35" />
            <circle cx="900" cy="875" r="25" opacity="0.35" />
            <circle cx="965" cy="875" r="28" opacity="0.35" />
            <circle cx="1035" cy="875" r="30" opacity="0.35" />
          </svg>
        </div>

        {/* Layer 3: Floating Golden Particles */}
        <div 
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${rotation.y * 1.5}px, ${rotation.x * 1.5}px, 0px)`,
          }}
        >
          <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-[#FFD54A] opacity-50 animate-pulse blur-[1px]" />
          <div className="absolute top-[45%] left-[80%] w-2 h-2 rounded-full bg-[#FFD54A] opacity-35 animate-pulse blur-[1px] delay-1000" />
          <div className="absolute top-[75%] left-[25%] w-1 w-1 rounded-full bg-[#FFD54A] opacity-60 animate-pulse blur-[0.5px] delay-300" />
          <div className="absolute top-[15%] left-[65%] w-2.5 h-2.5 rounded-full bg-[#FFD54A] opacity-25 animate-pulse blur-[2px] delay-500" />
          <div className="absolute top-[85%] left-[70%] w-1.5 h-1.5 rounded-full bg-[#FFD54A] opacity-45 animate-pulse blur-[1px] delay-700" />
          <div className="absolute top-[35%] left-[45%] w-2 h-2 rounded-full bg-[#FFD54A] opacity-30 animate-pulse blur-[1.5px] delay-1500" />
        </div>
      </div>

      {/* Canvas for trail - Elevated to overlay on top of all page layers (z-[9999]) */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 z-[9999] mix-blend-screen pointer-events-none" 
      />
    </>
  );
}
