'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Building2, UserCircle2, Bell, ShieldCheck, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

const OnboardingPage = () => {
    const [step, setStep] = useState(1);
    const router = useRouter();

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const content = {
        1: {
            title: "What's your primary role?",
            subtitle: "Customize your dashboard experience",
            icon: <UserCircle2 className="w-12 h-12 text-[#f28c33]" />,
            options: [
                { id: 'admin', label: 'Facility Manager', icon: ShieldCheck, desc: 'Manage tickets and staff' },
                { id: 'tenant', label: 'Tenant / Resident', icon: Home, desc: 'Raise requests and see updates' }
            ]
        },
        2: {
            title: "Activate Workspace Modules",
            subtitle: "Select the tools your team needs",
            icon: <Zap className="w-12 h-12 text-[#f28c33]" />,
            options: [
                { id: 'ticketing', label: 'Smart Ticketing', desc: 'AI-powered resolution' },
                { id: 'viewer', label: '2.5D Building Viewer', desc: 'Immersive navigation' },
                { id: 'analytics', label: 'Live Heatmaps', desc: 'Space usage data' }
            ]
        },
        3: {
            title: "Notification Preferences",
            subtitle: "How would you like to stay updated?",
            icon: <Bell className="w-12 h-12 text-[#f28c33]" />,
            options: [
                { id: 'push', label: 'Push Notifications', desc: 'Real-time mobile alerts' },
                { id: 'email', label: 'Email Digest', desc: 'Daily summary of activities' }
            ]
        }
    };

    const handleFinish = () => {
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">

            {/* Progress Bar */}
            <div className="w-full max-w-md mb-12 flex gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-[#f28c33]' : 'bg-zinc-800'}`} />
                ))}
            </div>

            <div className="w-full max-w-xl relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col items-center text-center space-y-8"
                    >
                        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl shadow-orange-900/10">
                            {content[step as keyof typeof content].icon}
                        </div>

                        <div>
                            <h1 className="text-4xl font-black text-white mb-3">
                                {content[step as keyof typeof content].title}
                            </h1>
                            <p className="text-zinc-500 text-lg font-medium">
                                {content[step as keyof typeof content].subtitle}
                            </p>
                        </div>

                        <div className="w-full space-y-4">
                            {content[step as keyof typeof content].options.map((option: any) => (
                                <button
                                    key={option.id}
                                    className="w-full p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl text-left hover:border-[#f28c33]/50 transition-all group flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-6">
                                        {option.icon && <option.icon className="w-8 h-8 text-zinc-600 group-hover:text-[#f28c33] transition-colors" />}
                                        <div>
                                            <p className="text-white font-bold text-xl">{option.label}</p>
                                            <p className="text-zinc-500 font-medium">{option.desc}</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="w-6 h-6 text-zinc-800 group-hover:text-[#f28c33] transition-colors" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-16 w-full max-w-xl flex justify-between items-center">
                <button
                    onClick={prevStep}
                    disabled={step === 1}
                    className={`flex items-center gap-2 font-bold transition-opacity ${step === 1 ? 'opacity-0' : 'text-zinc-500 hover:text-white'}`}
                >
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>

                {step < 3 ? (
                    <button
                        onClick={nextStep}
                        className="px-10 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-transform flex items-center gap-3 shadow-2xl shadow-white/10"
                    >
                        Continue <ArrowRight className="w-6 h-6" />
                    </button>
                ) : (
                    <button
                        onClick={handleFinish}
                        className="px-10 py-5 bg-[#f28c33] text-white font-black rounded-2xl hover:scale-105 transition-transform flex items-center gap-3 shadow-2xl shadow-orange-900/20"
                    >
                        Launch Dashboard <Zap className="w-6 h-6" />
                    </button>
                )}
            </div>

        </div>
    );
};

// Stub for Home icon if not imported from elsewhere
const Home = (props: any) => <Building2 {...props} />;

export default OnboardingPage;
