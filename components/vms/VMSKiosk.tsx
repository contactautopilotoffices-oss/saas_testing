'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Truck, Building2, ArrowRight, ArrowLeft, LogIn, LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CameraCapture from './CameraCapture';
import HostAutoComplete from './HostAutoComplete';

interface VMSKioskProps {
    propertyId: string;
    propertyName: string;
}

type Category = 'visitor' | 'vendor' | 'other';
type KioskStep = 'home' | 'category' | 'form' | 'success' | 'checkout' | 'checkout_success';

interface FormData {
    name: string;
    mobile: string;
    coming_from: string;
    whom_to_meet: string;
    photo_url: string;
}

const VMSKiosk: React.FC<VMSKioskProps> = ({ propertyId, propertyName }) => {
    const [step, setStep] = useState<KioskStep>('home');
    const [category, setCategory] = useState<Category>('visitor');
    const [formData, setFormData] = useState<FormData>({
        name: '',
        mobile: '',
        coming_from: '',
        whom_to_meet: '',
        photo_url: '',
    });
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
    const [visitorId, setVisitorId] = useState('');
    const [checkoutId, setCheckoutId] = useState('');
    const [checkoutName, setCheckoutName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset to home after 30 seconds of inactivity on success screens
    useEffect(() => {
        if (step === 'success' || step === 'checkout_success') {
            const timer = setTimeout(() => resetKiosk(), 30000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const resetKiosk = () => {
        setStep('home');
        setCategory('visitor');
        setFormData({ name: '', mobile: '', coming_from: '', whom_to_meet: '', photo_url: '' });
        setPhotoBlob(null);
        setVisitorId('');
        setCheckoutId('');
        setCheckoutName('');
        setError('');
    };

    const handlePhotoCapture = (imageUrl: string, blob: Blob) => {
        setFormData(prev => ({ ...prev, photo_url: imageUrl }));
        setPhotoBlob(blob);
    };

    const handleCheckin = async () => {
        if (!formData.name || !formData.whom_to_meet) {
            setError('Please fill all required fields');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // First create visitor log (without photo)
            const response = await fetch(`/api/vms/${propertyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category,
                    name: formData.name,
                    mobile: formData.mobile ? `+91${formData.mobile}` : null,
                    coming_from: formData.coming_from,
                    whom_to_meet: formData.whom_to_meet,
                    photo_url: null, // Will be updated after upload
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Check-in failed');
            }

            // Upload photo to Supabase Storage if exists
            if (photoBlob && data.visitor_id) {
                const photoFormData = new FormData();
                photoFormData.append('file', photoBlob, `${data.visitor_id}.webp`);
                photoFormData.append('visitor_id', data.visitor_id);

                await fetch(`/api/vms/${propertyId}/photos`, {
                    method: 'POST',
                    body: photoFormData,
                }).catch(console.error); // Non-blocking
            }

            setVisitorId(data.visitor_id);
            setStep('success');
        } catch (err: any) {
            console.error('Check-in error:', err);
            setError(err.message || 'Failed to check in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckout = async () => {
        if (!checkoutId) {
            setError('Please enter your Visitor ID');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(`/api/vms/${propertyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitor_id: checkoutId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Check-out failed');
            }

            setCheckoutName(data.visitor?.name || 'Visitor');
            setStep('checkout_success');
        } catch (err: any) {
            console.error('Check-out error:', err);
            setError(err.message || 'Visitor ID not found. Please check and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'home') {
        return (
            <div className="min-h-[700px] bg-[#0F172A] relative flex flex-col items-center justify-center p-8 overflow-hidden rounded-[2.5rem]">
                {/* Brand Mesh Gradient Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[100px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#0F172A]/80 backdrop-blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-12 w-full max-w-md relative z-10 border border-white/10"
                >
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20 rotate-3">
                            <User className="w-10 h-10 text-white -rotate-3" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Visitor Management</h1>
                        <p className="text-slate-400 font-bold mt-2 flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse" />
                            {propertyName}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <button
                            onClick={() => setStep('category')}
                            className="flex flex-col items-center justify-center p-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group"
                        >
                            <LogIn className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform" />
                            <span className="text-2xl font-black tracking-tight">IN</span>
                        </button>
                        <button
                            onClick={() => setStep('checkout')}
                            className="flex flex-col items-center justify-center p-10 bg-rose-500 hover:bg-rose-600 text-white rounded-[1.5rem] transition-all shadow-lg shadow-rose-500/20 active:scale-95 group"
                        >
                            <LogOut className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform" />
                            <span className="text-2xl font-black tracking-tight">OUT</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // CATEGORY SELECTION
    if (step === 'category') {
        return (
            <div className="min-h-[700px] bg-[#0F172A] relative flex flex-col items-center justify-center p-8 overflow-hidden rounded-[2.5rem]">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[100px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#0F172A]/80 backdrop-blur-3xl" />
                </div>
                <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md relative z-10">
                    <button
                        onClick={() => setStep('home')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Select Category</h2>

                    <div className="space-y-3 mb-8">
                        {[
                            { id: 'visitor', label: 'Visitor', icon: User, color: 'bg-primary', desc: 'General visitor' },
                            { id: 'vendor', label: 'Vendor', icon: Truck, color: 'bg-secondary', desc: 'Delivery or service' },
                            { id: 'other', label: 'Other', icon: Building2, color: 'bg-slate-500', desc: 'Interview, meeting, etc.' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id as Category)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${category === cat.id
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <div className={`w-12 h-12 ${cat.color} rounded-xl flex items-center justify-center text-white`}>
                                    <cat.icon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900">{cat.label}</p>
                                    <p className="text-xs text-slate-400">{cat.desc}</p>
                                </div>
                                {category === cat.id && (
                                    <Check className="w-5 h-5 text-indigo-600 ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setStep('form')}
                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        Continue <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    // VISITOR FORM
    if (step === 'form') {
        return (
            <div className="min-h-[700px] bg-[#0F172A] relative flex flex-col items-center justify-center p-8 overflow-hidden rounded-[2.5rem]">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
                </div>
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto relative z-10">
                    <button
                        onClick={() => setStep('category')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <h2 className="text-xl font-black text-slate-900 mb-6">Visitor Form</h2>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-indigo-500 focus:ring-0 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Mobile
                            </label>
                            <div className="flex">
                                <span className="px-3 py-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 font-medium">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                    placeholder="10 digit number"
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-900 font-medium focus:border-indigo-500 focus:ring-0 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Coming From
                            </label>
                            <input
                                type="text"
                                value={formData.coming_from}
                                onChange={(e) => setFormData(prev => ({ ...prev, coming_from: e.target.value }))}
                                placeholder="Company or address"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-indigo-500 focus:ring-0 transition-colors"
                            />
                        </div>

                        <HostAutoComplete
                            propertyId={propertyId}
                            value={formData.whom_to_meet}
                            onChange={(value) => setFormData(prev => ({ ...prev, whom_to_meet: value }))}
                        />

                        {/* Camera */}
                        <div className="pt-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                                Capture Photo
                            </label>
                            {formData.photo_url ? (
                                <div className="flex flex-col items-center">
                                    <img
                                        src={formData.photo_url}
                                        alt="Visitor"
                                        className="w-32 h-40 object-cover rounded-xl border-2 border-emerald-500 mb-2"
                                    />
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                                        className="text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        Retake
                                    </button>
                                </div>
                            ) : (
                                <CameraCapture onCapture={handlePhotoCapture} />
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleCheckin}
                        disabled={isSubmitting || !formData.name || !formData.whom_to_meet}
                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black mt-6 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" /> Confirm
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // CHECK-IN SUCCESS
    if (step === 'success') {
        return (
            <div className="min-h-[700px] bg-emerald-600 relative flex flex-col items-center justify-center p-8 overflow-hidden rounded-[2.5rem] text-white">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[100px]" />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center relative z-10"
                >
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">Welcome, {formData.name}!</h1>
                    <p className="text-emerald-100 text-lg mb-8">Your visit has been logged.</p>

                    <div className="bg-white/10 rounded-2xl p-6 mb-8">
                        <p className="text-sm text-emerald-100 mb-1">Your Visitor ID</p>
                        <p className="text-4xl font-black tracking-wider">{visitorId}</p>
                    </div>

                    <p className="text-emerald-100 text-sm mb-4">Please remember this ID for check-out.</p>

                    <button
                        onClick={resetKiosk}
                        className="px-8 py-3 bg-white text-emerald-600 rounded-xl font-black hover:bg-emerald-50 transition-all"
                    >
                        Done
                    </button>
                </motion.div>
            </div>
        );
    }

    // CHECKOUT SCREEN
    if (step === 'checkout') {
        return (
            <div className="min-h-[700px] bg-[#0F172A] relative flex flex-col items-center justify-center p-8 overflow-hidden rounded-[2.5rem]">
                <div className="absolute inset-0 z-0">
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[100px]" />
                </div>
                <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md relative z-10">
                    <button
                        onClick={() => setStep('home')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Visitor Check-Out</h2>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Enter Visitor ID
                        </label>
                        <input
                            type="text"
                            value={checkoutId}
                            onChange={(e) => setCheckoutId(e.target.value.toUpperCase())}
                            placeholder="e.g., PROP-00123"
                            className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold text-lg text-center tracking-wider focus:border-rose-500 focus:ring-0 transition-colors"
                        />
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={isSubmitting || !checkoutId}
                        className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogOut className="w-5 h-5" /> OUT
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // CHECKOUT SUCCESS
    if (step === 'checkout_success') {
        return (
            <div className="min-h-[700px] bg-rose-500 relative flex flex-col items-center justify-center p-8 overflow-hidden rounded-[2.5rem] text-white">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[100px]" />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center relative z-10"
                >
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LogOut className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">Goodbye, {checkoutName}!</h1>
                    <p className="text-rose-100 text-lg mb-8">Your visit has been completed.</p>

                    <button
                        onClick={resetKiosk}
                        className="px-8 py-3 bg-white text-rose-600 rounded-xl font-black hover:bg-rose-50 transition-all"
                    >
                        Done
                    </button>
                </motion.div>
            </div>
        );
    }

    return null;
};

export default VMSKiosk;
