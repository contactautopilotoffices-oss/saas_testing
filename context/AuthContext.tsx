'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<any>; // Using any to avoid complex import of AuthResponse, or import types
    signUp: (email: string, password: string, fullName: string) => Promise<any>;
    signInWithGoogle: (propertyCode?: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const signIn = async (email: string, password: string) => {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        return result;
    };

    const signInWithGoogle = async (propertyCode?: string) => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/api/auth/callback`,
                queryParams: propertyCode ? { state: propertyCode } : {}
            }
        });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/api/auth/callback?next=/login?mode=reset`,
        });
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signInWithGoogle, signOut, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
