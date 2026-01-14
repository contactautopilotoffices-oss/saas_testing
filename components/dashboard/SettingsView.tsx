'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Camera, Save, Loader2,
    Shield, Building, CheckCircle2, AlertCircle, Home
} from 'lucide-react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

interface RoleInfo {
    role: string;
    entityName: string;
    type: 'organization' | 'property';
}

export default function SettingsView() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [userRoles, setUserRoles] = useState<RoleInfo[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            // 1. Fetch User Profile
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (userError) throw userError;

            // 2. Fetch Organization Memberships
            const { data: orgMembers, error: orgError } = await supabase
                .from('organization_memberships')
                .select('role, organization:organizations(name)')
                .eq('user_id', user?.id);

            // 3. Fetch Property Memberships
            const { data: propMembers, error: propError } = await supabase
                .from('property_memberships')
                .select('role, property:properties(name)')
                .eq('user_id', user?.id);

            setProfile(userData);
            if (userData.user_photo_url) {
                setAvatarPreview(userData.user_photo_url);
            }

            // Process Roles
            const roles: RoleInfo[] = [];

            if (orgMembers) {
                orgMembers.forEach((m: any) => {
                    roles.push({
                        role: m.role,
                        entityName: m.organization?.name || 'Unknown Org',
                        type: 'organization'
                    });
                });
            }

            if (propMembers) {
                propMembers.forEach((m: any) => {
                    roles.push({
                        role: m.role,
                        entityName: m.property?.name || 'Unknown Property',
                        type: 'property'
                    });
                });
            }

            setUserRoles(roles);

        } catch (err) {
            console.error('Error fetching profile:', err);
            // Fallback
            if (user) {
                setProfile({
                    full_name: user.user_metadata?.full_name || '',
                    email: user.email,
                    phone: user.user_metadata?.phone || '',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Allow only JPG/JPEG format as requested
            const fileType = file.type;
            if (fileType !== 'image/jpeg' && fileType !== 'image/jpg') {
                showToast('Only JPG/JPEG formats are allowed', 'error');
                return;
            }

            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };


    const uploadAvatar = async (userId: string): Promise<string | null> => {
        if (!avatarFile) return null;

        try {
            // Add Compressor before storing
            const options = {
                maxSizeMB: 0.1, // 100KB
                maxWidthOrHeight: 512,
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(avatarFile, options);

            const filePath = `${userId}/profile.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('user-photos')
                .upload(filePath, compressedFile, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('user-photos').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (err) {
            console.error('Error uploading avatar:', err);
            throw err;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile) return;

        setIsSaving(true);
        try {
            let avatarUrl = profile.avatar_url;

            if (avatarFile) {
                const url = await uploadAvatar(user.id);
                if (url) avatarUrl = url;
            }

            // Update users table - Only use columns that exist
            const { error: dbError } = await supabase
                .from('users')
                .update({
                    full_name: profile.full_name,
                    phone: profile.phone,
                    user_photo_url: avatarUrl // Use the correct column
                })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.full_name,
                    avatar_url: avatarUrl,
                    user_photo_url: avatarUrl,
                    phone: profile.phone
                }
            });

            if (authError) throw authError;

            showToast('Profile updated successfully');
            fetchProfile();
        } catch (err: any) {
            console.error('Error saving profile:', err);
            showToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const formatRole = (role: string) => {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-slate-900">Account Settings</h1>
                <p className="text-slate-500 font-body mt-2">Manage your personal information and profile details.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Profile Section */}
                <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                    <h2 className="text-xl font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Profile Information
                    </h2>

                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 relative">
                                    {avatarPreview ? (
                                        <Image
                                            src={avatarPreview}
                                            alt="Profile"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <User className="w-16 h-16" />
                                        </div>
                                    )}

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    <Camera className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".jpg,.jpeg"
                            />
                            <p className="text-xs font-semibold text-slate-500">Allowed *.jpg, *.jpeg</p>
                        </div>

                        {/* Fields */}
                        <div className="flex-1 space-y-5 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={profile?.full_name || ''}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-900"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={profile?.phone || ''}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-900"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            value={profile?.email || ''}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                            Read Only
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium ml-1">
                                        Email address cannot be changed. Please contact support if you need to update it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Additional Info Section (Read Only) */}
                <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                    <h2 className="text-xl font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Account Roles & Memberships
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        {userRoles.length > 0 ? (
                            userRoles.map((role, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        {role.type === 'organization' ? (
                                            <Building className="w-5 h-5 text-indigo-500" />
                                        ) : (
                                            <Home className="w-5 h-5 text-emerald-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                {role.type}
                                            </p>
                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                                {formatRole(role.role)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {role.entityName}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-slate-500 text-sm">
                                No active memberships found.
                            </div>
                        )}
                    </div>
                </section>

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70 shadow-sm shadow-primary/20"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success'
                            ? 'bg-emerald-900 border-emerald-500/50 text-emerald-50'
                            : 'bg-rose-900 border-rose-500/50 text-rose-50'
                            }`}>
                            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
