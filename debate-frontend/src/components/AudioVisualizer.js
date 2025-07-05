'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AudioVisualizer({ isActive, audioLevel, color = 'blue' }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const barsRef = useRef([]);

    const colorMap = {
        blue: { primary: '#3b82f6', secondary: '#1d4ed8', bg: '#1e3a8a' },
        emerald: { primary: '#10b981', secondary: '#059669', bg: '#065f46' },
        red: { primary: '#ef4444', secondary: '#dc2626', bg: '#991b1b' },
        purple: { primary: '#8b5cf6', secondary: '#7c3aed', bg: '#5b21b6' }
    };

    const colors = colorMap[color] || colorMap.blue;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const barCount = 20;

        // Initialize bars
        if (barsRef.current.length === 0) {
            barsRef.current = Array(barCount).fill(0).map(() => ({
                height: 0,
                targetHeight: 0,
                velocity: 0
            }));
        }

        const animate = () => {
            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;

            // Set canvas size
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // Clear canvas
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            if (isActive) {
                // Update bar heights based on audio level
                const normalizedLevel = audioLevel / 100;
                const barWidth = canvasWidth / barCount;

                barsRef.current.forEach((bar, index) => {
                    // Create pseudo-random pattern based on audio level
                    const variation = Math.sin(Date.now() * 0.01 + index) * 0.3 + 0.7;
                    bar.targetHeight = normalizedLevel * variation * canvasHeight * 0.8;

                    // Smooth animation
                    const diff = bar.targetHeight - bar.height;
                    bar.velocity += diff * 0.1;
                    bar.velocity *= 0.8; // Damping
                    bar.height += bar.velocity;

                    // Draw bar
                    const x = index * barWidth;
                    const barHeight = Math.max(2, bar.height);
                    const y = canvasHeight - barHeight;

                    // Gradient
                    const gradient = ctx.createLinearGradient(0, y, 0, canvasHeight);
                    gradient.addColorStop(0, colors.primary);
                    gradient.addColorStop(1, colors.secondary);

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
                });
            } else {
                // Fade out when not active
                barsRef.current.forEach((bar, index) => {
                    bar.targetHeight = 0;
                    bar.height *= 0.9;

                    if (bar.height > 1) {
                        const barWidth = canvasWidth / barCount;
                        const x = index * barWidth;
                        const barHeight = bar.height;
                        const y = canvasHeight - barHeight;

                        ctx.fillStyle = colors.bg;
                        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
                    }
                });
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, audioLevel, colors]);

    return (
        <div className="w-full h-16 bg-gray-900/50 rounded-lg overflow-hidden">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: 'block' }}
            />
        </div>
    );
}
