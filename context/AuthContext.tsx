'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Mock User type compatible with basic usage
export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signUp: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Simulate initial load
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
            // Optionally could store mock token in localStorage to persist login across refreshes
            // but for now, fresh start every time is fine for UI testing
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUser({ uid: 'mock-user-123', email, displayName: 'Mock User', photoURL: null });
        setLoading(false);
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUser({ uid: 'mock-user-' + Date.now(), email, displayName: fullName, photoURL: null });
        setLoading(false);
    };

    const signOut = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setUser(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {loading ? (
                <div className="flex h-screen items-center justify-center bg-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

