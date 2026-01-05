'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { MousePointer2, TrendingUp, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Premium Font Utility for "Söhne" feel (using Outfit variable)
const fontHeading = "font-outfit";
const fontUI = "font-inter";

// Visualization Component: Heatmap (Refined)
const OccupancyHeatmap = () => (
    <div className="mt-4">
        <div className="flex items-baseline gap-1 mb-3">
            {/* Dominant Signal: Big Number */}
            <span className={cn("text-5xl font-medium text-slate-900 tracking-tight leading-none", fontHeading)}>78%</span>
            <span className={cn("text-xs font-medium text-slate-500 uppercase tracking-widest ml-1", fontUI)}>Occupancy</span>
        </div>

        {/* Visual: Clean Abstract Grid */}
        <div className="grid grid-cols-6 gap-[3px] h-10 w-full opacity-100">
            {/* Row 1 - Abstract data patterns */}
            <div className="bg-slate-200 col-span-1 rounded-[1px]" />
            <div className="bg-orange-500 col-span-1 rounded-[1px]" />
            <div className="bg-orange-400 col-span-1 rounded-[1px]" />
            <div className="bg-slate-100 col-span-1 rounded-[1px]" />
            <div className="bg-emerald-400 col-span-1 rounded-[1px]" />
            <div className="bg-emerald-500 col-span-1 rounded-[1px]" />

            {/* Row 2 */}
            <div className="bg-red-300 col-span-1 rounded-[1px]" />
            <div className="bg-yellow-400 col-span-1 rounded-[1px]" />
            {/* Active zone indicator */}
            <div className="bg-white border border-slate-200 col-span-1 flex items-center justify-center rounded-[1px] relative overflow-hidden">
                <div className="w-full h-full bg-blue-500/10 absolute inset-0 animate-pulse" />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full z-10" />
            </div>
            <div className="bg-emerald-300 col-span-1 rounded-[1px]" />
            <div className="bg-yellow-200 col-span-1 rounded-[1px]" />
            <div className="bg-slate-200 col-span-1 rounded-[1px]" />
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className={cn("text-[11px] text-slate-500 font-medium", fontUI)}>342 Active</span>
            </div>
            <span className={cn("text-[11px] text-slate-400", fontUI)}>Level 28</span>
        </div>
    </div>
);

// Visualization Component: Ticket SLA (Infographic Style)
const TicketSLA = () => (
    <div className="mt-4">
        {/* Dominant Signal 1 */}
        <div className="flex justify-between items-start mb-6">
            <div>
                <div className={cn("text-5xl font-medium text-slate-900 tracking-tight leading-none", fontHeading)}>24</div>
                <div className={cn("text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1", fontUI)}>Open Tickets</div>
            </div>
            {/* Supporting Signal: Priority Pulse */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full border border-amber-100">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                <span className={cn("text-[10px] font-medium text-amber-700 uppercase tracking-wide", fontUI)}>High Prio</span>
            </div>
        </div>

        {/* Separator / Visual Structure */}
        <div className="w-full h-px bg-slate-100 mb-4" />

        {/* Dominant Signal 2: Visual Bar */}
        <div className="space-y-1.5">
            <div className="flex justify-between items-end">
                <span className={cn("text-[10px] font-semibold text-slate-400 uppercase tracking-widest", fontUI)}>SLA Compliance</span>
                <span className={cn("text-sm font-semibold text-emerald-600", fontHeading)}>95%</span>
            </div>
            {/* Custom Progress Bar - Architectural Style */}
            <div className="flex gap-[2px] h-1.5 w-full">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex-1 rounded-[1px]",
                            i < 19 ? "bg-emerald-500" : "bg-slate-200" // 95% filled
                        )}
                    />
                ))}
            </div>
        </div>
    </div>
);

export default function HeroSection() {
    const [isNight, setIsNight] = useState(false);

    // NOTE: Removed click state 'activeCard' in favor of CSS group-hover for smoother performance and "Hover" requirement.
    // However, if we want complex exit animations, we can use state. 
    // Given the requirement "change click to hover", CSS or simple state is fine.
    // Let's use State for AnimatePresence support on hover.

    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            setIsNight(hour >= 18 || hour < 6);
        };

        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className={cn("relative h-screen w-full overflow-hidden bg-slate-950", fontUI)}>
            {/* Main Image */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                    {/* 
                      NOTE: User requested higher res images. 
                      Since I cannot generate 4K images, I am using the best available 'quality={100}' 
                      and using a slight scale animation to keep it alive.
                     */}
                    <motion.div
                        key={isNight ? 'night' : 'day'}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.5 }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={isNight ? "/landing-hero-night.jpg" : "/landing-hero-day.jpg"}
                            alt="Modern Office Building"
                            fill
                            className="object-cover object-center"
                            priority
                            quality={100}
                        />
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/20 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-12 lg:p-16">
                <header className="flex justify-between items-center w-full pointer-events-auto">
                    <div className={cn("text-white font-bold text-xl tracking-wider", fontHeading)}>AUTOPILOT</div>
                    <div className="flex gap-6 items-center">
                        <Link href="/login" className="text-white/60 hover:text-white text-sm transition-colors font-medium">Log In</Link>
                        <Link href="/signup">
                            <button className="px-5 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-sm text-xs font-semibold transition-all uppercase tracking-widest hover:border-white/20">
                                Sign Up
                            </button>
                        </Link>
                    </div>
                </header>

                <div className="max-w-3xl mt-auto mb-20 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, delay: 0.5 }}
                    >
                        <h1 className={cn("text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[0.9] mb-8 tracking-tighter", fontHeading)}>
                            Where Autonomy <br />
                            <span className="font-semibold text-white/95">Meets Operations.</span>
                        </h1>
                        <div className="flex items-center gap-4 text-white/60 text-sm md:text-base tracking-wide pl-2 border-l border-white/20">
                            The building is the interface.
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-8 right-8 md:right-12 flex items-center gap-3 text-white/30 text-[10px] uppercase tracking-[0.2em] pointer-events-none"
                >
                    <MousePointer2 className="w-3 h-3" />
                    Interact to explore
                </motion.div>
            </div>

            {/* Anchored Interaction Nodes */}
            <div className="absolute inset-0 z-30 pointer-events-none">

                {/* Node 1: Occupancy (Heatmap) */}
                <div
                    className="absolute top-[30%] left-[55%] pointer-events-auto interaction-node group"
                    onMouseEnter={() => setHoveredCard(1)}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    {/* Anchor - Pulsing */}
                    <div className={`w-3 h-3 border border-white/60 rounded-full cursor-pointer transition-all duration-500 ${hoveredCard === 1 ? 'bg-white scale-125 shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'bg-white/20 hover:bg-white/50'}`}>
                        <div className="absolute inset-0 bg-white/40 rounded-full animate-ping opacity-0 group-hover:opacity-30" />
                    </div>

                    {/* Card */}
                    <AnimatePresence>
                        {hoveredCard === 1 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                className="absolute top-[-50px] left-[50px]"
                            >
                                <div className="absolute top-10 left-[-50px] w-[50px] h-[1px] bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
                                {/* Translucent Glass Background - Apple Style */}
                                {/* Apple Glass: ~60-70% opacity white, high blur, saturation boost for vibrancy */}
                                <GlassCard className="p-5 w-72 bg-white/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-2xl rounded-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded-sm bg-white/40">
                                                <TrendingUp size={12} className="text-slate-600" />
                                            </div>
                                            <span className={cn("text-[10px] font-bold text-slate-600 uppercase tracking-widest", fontUI)}>Live Insight</span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]" />
                                    </div>
                                    <OccupancyHeatmap />
                                </GlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Node 2: Tickets & SLA */}
                <div
                    className="absolute top-[65%] left-[62%] pointer-events-auto interaction-node group"
                    onMouseEnter={() => setHoveredCard(2)}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <div className={`w-3 h-3 border border-white/60 rounded-full cursor-pointer transition-all duration-500 ${hoveredCard === 2 ? 'bg-white scale-125 shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'bg-white/20 hover:bg-white/50'}`}>
                        <div className="absolute inset-0 bg-white/40 rounded-full animate-ping opacity-0 group-hover:opacity-30" />
                    </div>

                    <AnimatePresence>
                        {hoveredCard === 2 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                className="absolute top-[-80px] left-[50px]"
                            >
                                <div className="absolute top-20 left-[-50px] w-[50px] h-[1px] bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
                                {/* Translucent Glass Background - Apple Style */}
                                <GlassCard className="p-5 w-72 bg-white/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-2xl rounded-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded-sm bg-white/40">
                                                <Zap size={12} className="text-slate-600" />
                                            </div>
                                            <span className={cn("text-[10px] font-bold text-slate-600 uppercase tracking-widest", fontUI)}>System State</span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgb(245,158,11)]" />
                                    </div>
                                    <TicketSLA />
                                </GlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </section>
    );
}
