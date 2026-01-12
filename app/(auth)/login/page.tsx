'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Building2, BarChart3, Ticket, Eye, EyeOff, Lock, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Feature cards for the animated showcase
const features = [
    {
        id: 1,
        title: 'Smart Ticketing',
        subtitle: 'AI-powered resolution',
        stat: '95%',
        statLabel: 'Faster Resolution',
        icon: Ticket,
        color: 'from-emerald-400 to-teal-500'
    }
];

function AuthContent() {
    const searchParams = useSearchParams();
    const initialMode = searchParams.get('mode');

    const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset-success' | 'update-password'>(
        initialMode === 'signup' ? 'signup' :
            initialMode === 'reset' ? 'update-password' : 'signin'
    );

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentFeature, setCurrentFeature] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { signIn, signUp, signInWithGoogle, resetPassword, signOut } = useAuth();
    const router = useRouter();

    // Memoize supabase client to prevent re-creation on every render
    const supabase = React.useMemo(() => createClient(), []);

    // Handle password reset token from URL (Supabase may use hash fragment OR code param)
    useEffect(() => {
        const handlePasswordResetSession = async () => {
            if (typeof window === 'undefined') return;

            // Method 1: Check URL hash for legacy token flow
            if (window.location.hash) {
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                if (accessToken && type === 'recovery') {
                    console.log('Password reset token detected in hash, setting session...');

                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (error) {
                        console.error('Failed to set recovery session:', error);
                        setError('Password reset link has expired. Please request a new one.');
                        setAuthMode('forgot');
                    } else {
                        console.log('Recovery session set successfully');
                        setAuthMode('update-password');
                        window.history.replaceState(null, '', window.location.pathname + '?mode=reset');
                    }
                    return;
                }
            }

            // Method 2: Check URL params for PKCE code flow  
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const type = urlParams.get('type');

            if (code && type === 'recovery') {
                console.log('Password reset PKCE code detected, exchanging...');

                const { error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    console.error('Failed to exchange recovery code:', error);
                    setError('Password reset link has expired or is invalid. Please request a new one.');
                    setAuthMode('forgot');
                } else {
                    console.log('Recovery code exchanged successfully');
                    setAuthMode('update-password');
                    window.history.replaceState(null, '', window.location.pathname + '?mode=reset');
                }
                return;
            }

            // Method 3: If mode=reset, check if we already have a valid session
            if (initialMode === 'reset') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    console.log('Already have session for password reset');
                    setAuthMode('update-password');
                } else {
                    console.log('No session found for password reset mode');
                    // Session might be loading, let Supabase handle it
                }
            }
        };

        handlePasswordResetSession();
    }, []); // Removed ALL dependencies to prevent loops -> only runs on mount

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (authMode === 'signup') {
                const data = await signUp(email, password, fullName);

                if (data?.session) {
                    console.log('Signup successful, session found. Redirecting...');
                    router.push('/onboarding');
                } else if (data?.user) {
                    console.log('Signup successful, but no session. Email confirmation likely required.');
                    setSuccess('Account created! Please check your email inbox to verify your account before logging in.');
                    // Don't redirect if there's no session, as onboarding requires a logged-in user
                } else {
                    throw new Error('Signup failed to return user data.');
                }
            } else if (authMode === 'signin') {
                const { data: { user: authUser }, error: signInError } = await signIn(email, password);
                if (signInError || !authUser) throw new Error(signInError?.message || 'Login failed');

                // ✅ Step 1: Fetch user FIRST (and ONLY user)
                const { data: userProfile, error: profileError } = await supabase
                    .from('users')
                    .select('id, is_master_admin')
                    .eq('id', authUser.id)
                    .single();

                if (profileError || !userProfile) {
                    console.error('Profile fetch error:', profileError);
                    throw new Error('User profile not found.');
                }

                // ✅ Step 2: HARD SHORT-CIRCUIT for master admin
                if (userProfile.is_master_admin) {
                    router.replace('/master');
                    return;
                }

                // ✅ Step 3: Now resolve organization membership (Strictly Org Super Admin first)
                const { data: orgMembership } = await supabase
                    .from('organization_memberships')
                    .select('organization_id, role')
                    .eq('user_id', userProfile.id)
                    .eq('role', 'org_super_admin')
                    .is('is_active', true) // Maintaining is_active check for safety
                    .maybeSingle(); // Changed to maybeSingle to avoid errors if not found

                if (orgMembership) {
                    router.replace(`/org/${orgMembership.organization_id}/dashboard`);
                    return;
                }

                // ✅ Step 4: Finally resolve property membership
                const { data: propMembership } = await supabase
                    .from('property_memberships')
                    .select('property_id, organization_id, role')
                    .eq('user_id', userProfile.id)
                    .is('is_active', true) // Maintaining is_active check
                    .maybeSingle();

                if (propMembership) {
                    const role = propMembership.role;
                    const pId = propMembership.property_id;

                    if (role === 'property_admin') {
                        router.replace(`/property/${pId}/dashboard`);
                    } else if (role === 'tenant') {
                        router.replace(`/property/${pId}/tenant`);
                    } else if (role === 'security') {
                        router.replace(`/property/${pId}/security`);
                    } else if (role === 'staff') {
                        router.replace(`/property/${pId}/staff`);
                    } else if (role === 'mst') {
                        router.replace(`/property/${pId}/mst`);
                    } else if (role === 'vendor') {
                        router.replace(`/property/${pId}/vendor`);
                    } else {
                        // Fallback for unknown roles
                        router.replace(`/property/${pId}/dashboard`);
                    }
                    return;
                }

                /* Nothing found */
                await signOut();
                throw new Error(
                    'Your account is not assigned to any organization or property.'
                );
            } else if (authMode === 'forgot') {
                await resetPassword(email);
                setAuthMode('reset-success');
            } else if (authMode === 'update-password') {
                if (password !== confirmPassword) throw new Error('Passwords do not match');

                // First verify we have a valid session
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    // Try to get session from onAuthStateChange
                    throw new Error('No active session. Please click the password reset link in your email again, or request a new one.');
                }

                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });

                if (updateError) throw updateError;

                // Sign out after password change to force re-login with new password
                await supabase.auth.signOut();

                setSuccess('Password updated successfully! Please sign in with your new password.');
                setAuthMode('signin');
            }
        } catch (err: any) {
            console.error('Auth action error:', err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed.');
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
                <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-bl from-emerald-200/40 via-teal-200/30 to-transparent blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[60%] bg-gradient-to-tr from-green-100/40 to-transparent blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 bg-white/70 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-emerald-500/10 w-full max-w-5xl overflow-hidden flex flex-col lg:flex-row min-h-[680px] border border-white/50"
            >
                <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-white">
                    <div className="flex items-center gap-2 mb-10">
                        <div className="w-10 h-10 bg-[#0a4d3c] rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                            {/* Triangle A Icon */}
                            <svg viewBox="0 0 32 40" fill="currentColor" className="h-5 text-white">
                                <path d="M0 40 L16 0 L32 40 L24 40 L16 16 L8 40 Z" />
                            </svg>
                        </div>
                        <span className="font-medium text-xl tracking-tight text-[#0a4d3c] flex items-center">
                            {/* Triangle A + UTOPILOT */}
                            <svg viewBox="0 0 16 20" fill="currentColor" className="h-5 -mr-0.5">
                                <path d="M0 20 L8 0 L16 20 L12 20 L8 8 L4 20 Z" />
                            </svg>
                            utopilot
                        </span>
                    </div>

                    <AnimatePresence mode="wait">
                        {authMode === 'reset-success' ? (
                            <motion.div
                                key="reset-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
                                className="text-center py-8"
                            >
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Mail className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 mb-4">Check your email</h2>
                                <p className="text-slate-500 font-medium mb-8">We've sent a password reset link to <span className="text-slate-900 font-bold">{email}</span>.</p>
                                <button onClick={() => setAuthMode('signin')} className="text-[#0a4d3c] font-black hover:underline" > Back to Sign In </button>
                            </motion.div>
                        ) : (
                            <motion.div key={authMode} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} >
                                <div className="mb-8">
                                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-2 leading-tight">
                                        {authMode === 'signup' ? 'Start Your Journey' : authMode === 'forgot' ? 'Reset Password' : authMode === 'update-password' ? 'New Password' : 'Welcome Back'}
                                    </h1>
                                    <p className="text-slate-500 font-medium font-sans">
                                        {authMode === 'signup' ? 'Create your account to get started' : authMode === 'forgot' ? 'Enter your email to receive a recovery link' : authMode === 'update-password' ? 'Secure your account with a new password' : 'Sign in to your command center'}
                                    </p>
                                </div>

                                {(authMode === 'signin' || authMode === 'signup') && (
                                    <div className="flex gap-2 mb-8 p-1 bg-slate-100 rounded-xl">
                                        <button onClick={() => setAuthMode('signin')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${authMode === 'signin' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`} > Sign In </button>
                                        <button onClick={() => setAuthMode('signup')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${authMode === 'signup' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`} > Sign Up </button>
                                    </div>
                                )}

                                <form className="space-y-4" onSubmit={handleAuthAction}>
                                    {authMode === 'signup' && (
                                        <div className="space-y-1 relative z-20">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Name*</label>
                                            <input type="text" placeholder="Enter your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#0a4d3c] focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium bg-slate-50/50 relative z-20 placeholder:text-slate-400 text-slate-900" />
                                        </div>
                                    )}

                                    {(authMode === 'signin' || authMode === 'signup' || authMode === 'forgot') && (
                                        <div className="space-y-1 relative z-20">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Email*</label>
                                            <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#0a4d3c] focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium bg-slate-50/50 relative z-20 placeholder:text-slate-400 text-slate-900" />
                                        </div>
                                    )}

                                    {(authMode === 'signin' || authMode === 'signup' || authMode === 'update-password') && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-sm font-bold text-slate-700">{authMode === 'update-password' ? 'New Password*' : 'Password*'}</label>
                                                {authMode === 'signin' && (<button type="button" onClick={() => setAuthMode('forgot')} className="text-xs font-bold text-[#0a4d3c] hover:underline">Forgot Password?</button>)}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter your password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#0a4d3c] focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium bg-slate-50/50 pr-10 relative z-20 placeholder:text-slate-400 text-slate-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="w-5 h-5" />
                                                    ) : (
                                                        <Eye className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {authMode === 'update-password' && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Confirm New Password*</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm your password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#0a4d3c] focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium bg-slate-50/50 pr-10 relative z-20 placeholder:text-slate-400 text-slate-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="w-5 h-5" />
                                                    ) : (
                                                        <Eye className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">{error}</div>}
                                    {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl border border-emerald-100">{success}</div>}

                                    <button type="submit" disabled={loading} className="w-full bg-[#f28c33] hover:bg-[#e07b22] text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group" >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (<> {authMode === 'signup' ? 'Create Account' : authMode === 'forgot' ? 'Send Reset Link' : authMode === 'update-password' ? 'Update Password' : 'Sign In'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> </>)}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="hidden lg:block w-1/2 p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#0a4d3c]">
                        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#126b54] rounded-full blur-3xl opacity-60" />
                        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#083a2d] rounded-full blur-3xl opacity-60" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-center items-center p-8">
                        <div className="w-full max-w-sm space-y-6">
                            <AnimatePresence mode="wait">
                                <motion.div key={currentFeature} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.5 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl" >
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg`}> <Ticket className="w-7 h-7 text-white" /> </div>
                                    <h3 className="text-white text-xl font-bold mb-1">95% Faster Resolution</h3>
                                    <p className="text-white/70 text-sm font-medium">Smart AI-powered ticketing for Autopilot Offices properties.</p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-emerald-50"><div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>}>
            <AuthContent />
        </Suspense>
    );
}
