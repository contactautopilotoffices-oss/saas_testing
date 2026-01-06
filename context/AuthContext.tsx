'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: (propertyCode?: string) => Promise<void>;
    signOut: () => Promise<void>;
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
        // DEVELOPMENT BYPASS: Allow Master Admin credentials for testing
        if ((email === 'masterooshi@gmail.com' || email === 'ranganathanlohitaksha@gmail.com') && password === 'panda1234%') {
            console.log('Master Admin bypass triggered');
            // In a real app, we'd still want a session. 
            // For now, we'll let the Supabase call proceed but handle the error for this specific user if it fails
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    // If Supabase fails (user doesn't exist), we can set a mock user state manually 
                    // but Supabase's auth state is managed internally. 
                    // Better to just tell the user to create the user in Supabase dashboard.
                    throw error;
                }
            } catch (err) {
                throw err;
            }
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signInWithGoogle, signOut }}>
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
