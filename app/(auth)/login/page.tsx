'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signInWithGoogle } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signIn(email, password);
            // REDIRECTION LOGIC: Master Admin routing
            if (email === 'masterooshi@gmail.com' || email === 'ranganathanlohitaksha@gmail.com') {
                router.push('/master');
            } else {
                router.push('/organizations');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed.');
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f4f6] p-4 font-sans">
            {/* Main Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[700px]"
            >

                {/* Left Side: Form */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-black">Autopilot</span>
                        </div>

                        <h1 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
                            Welcome Back to Smarter Management
                        </h1>
                        <p className="text-slate-500 font-medium">Log in to your command center</p>
                    </div>

                    {/* Social Logins */}
                    <div className="flex flex-col gap-3 mb-8">
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all group"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                            Sign in with Google
                        </button>
                        <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all group">
                            <img src="https://www.svgrepo.com/show/511330/apple-173.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Apple" />
                            Sign in with Apple
                        </button>
                    </div>

                    <div className="relative mb-8 text-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <span className="relative bg-white px-4 text-sm font-bold text-slate-400 uppercase tracking-widest">or email login</span>
                    </div>

                    {/* Form Fields */}
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email*</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#f28c33] focus:ring-4 focus:ring-orange-100 outline-none transition-all shadow-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 ml-1">Password*</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#f28c33] focus:ring-4 focus:ring-orange-100 outline-none transition-all shadow-sm font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-500 text-sm font-bold rounded-xl border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#f28c33] hover:bg-[#e07b22] text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group"
                        >
                            {loading ? 'Authenticating...' : 'Enter Dashboard'}
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <p className="text-center mt-8 text-slate-500 font-medium">
                        New here? <span className="text-slate-900 font-bold">Contact Sales for Access</span>
                    </p>
                </div>

                {/* Right Side: Visual/Branding */}
                <div className="hidden md:block w-1/2 p-6">
                    <div className="relative h-full w-full rounded-[24px] overflow-hidden bg-[#0a4d3c] flex flex-col items-center justify-center p-12 text-white">
                        {/* Abstract Background Elements */}
                        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#126b54] rounded-full blur-[100px] opacity-50"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#083a2d] rounded-full blur-[100px] opacity-50"></div>

                        {/* Glass Cards */}
                        <div className="z-10 w-full space-y-6">
                            {/* Card 1: Testimonial */}
                            <motion.div
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[24px] transform -rotate-2"
                            >
                                <p className="text-lg font-medium mb-6 leading-relaxed italic">
                                    "Autopilot transformed our operations. It's truly next-gen facility management."
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white/20">
                                        <img src="https://i.pravatar.cc/150?u=darsh" alt="User" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Darsh Chen</p>
                                        <p className="text-sm opacity-70">VP of Operations, Facility Co.</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 2: Growth Metric */}
                            <motion.div
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-zinc-950/40 backdrop-blur-md border border-white/10 p-8 rounded-[24px] transform translate-x-8"
                            >
                                <p className="text-sm font-semibold uppercase tracking-wider opacity-70 mb-2">Platform Power</p>
                                <h3 className="text-4xl font-bold mb-4">99.9%</h3>
                                <p className="text-lg font-medium text-emerald-400">System Availability</p>
                                <p className="text-sm opacity-70 mt-2">Zero downtime operations</p>

                                {/* Simple Sparkline Mockup */}
                                <div className="mt-6 h-12 w-full flex items-end gap-1">
                                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            transition={{ delay: 0.7 + (i * 0.1), duration: 0.5 }}
                                            key={i}
                                            className="flex-1 bg-emerald-500/40 rounded-t-sm"
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
