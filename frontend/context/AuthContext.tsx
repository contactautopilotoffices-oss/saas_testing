'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/frontend/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Cached membership data structure
interface UserMembership {
    org_id: string | null;
    org_name: string | null;
    org_role: string | null;
    properties: {
        id: string;
        name: string;
        code: string;
        role: string;
    }[];
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    membership: UserMembership | null;
    isMembershipLoading: boolean;
    // Auth actions
    signIn: (email: string, password: string) => Promise<any>;
    signUp: (email: string, password: string, fullName: string) => Promise<any>;
    signInWithGoogle: (propertyCode?: string, redirectPath?: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    // Cache helpers
    refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory cache to prevent duplicate fetches across components
const membershipCache = new Map<string, { data: UserMembership; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [membership, setMembership] = useState<UserMembership | null>(null);
    const [isMembershipLoading, setIsMembershipLoading] = useState(false);
    const fetchingRef = useRef(false); // Prevent duplicate fetches

    // Memoize supabase client to prevent recreation
    const supabase = useMemo(() => createClient(), []);

    // Fetch membership data ONCE after login with caching
    const fetchMembership = useCallback(async (userId: string) => {
        // Prevent duplicate parallel fetches
        if (fetchingRef.current) return;

        // Check cache first
        const cached = membershipCache.get(userId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setMembership(cached.data);
            return;
        }

        fetchingRef.current = true;
        setIsMembershipLoading(true);

        try {
            // Fetch org membership
            const { data: orgData } = await supabase
                .from('organization_memberships')
                .select(`
                    role,
                    organization:organizations (
                        id,
                        name
                    )
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

            // Fetch property memberships
            const { data: propData } = await supabase
                .from('property_memberships')
                .select(`
                    role,
                    property:properties (
                        id,
                        name,
                        code
                    )
                `)
                .eq('user_id', userId)
                .eq('is_active', true);

            const membershipData: UserMembership = {
                org_id: (orgData?.organization as any)?.id || null,
                org_name: (orgData?.organization as any)?.name || null,
                org_role: orgData?.role || null,
                properties: propData?.map((p: any) => ({
                    id: p.property?.id,
                    name: p.property?.name,
                    code: p.property?.code,
                    role: p.role
                })).filter((p: any) => p.id) || []
            };

            // Cache the result
            membershipCache.set(userId, { data: membershipData, timestamp: Date.now() });
            setMembership(membershipData);
        } catch (err) {
            console.error('Membership fetch error:', err);
        } finally {
            fetchingRef.current = false;
            setIsMembershipLoading(false);
        }
    }, [supabase]);

    const refreshMembership = useCallback(async () => {
        if (user?.id) {
            membershipCache.delete(user.id); // Clear cache
            await fetchMembership(user.id);
        }
    }, [user?.id, fetchMembership]);

    useEffect(() => {
        // Get initial session ONCE
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchMembership(session.user.id);
            }
            setIsLoading(false);
        });

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'SIGNED_IN' && session?.user) {
                fetchMembership(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setMembership(null);
                if (user?.id) membershipCache.delete(user.id);
            }

            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase, fetchMembership]);

    const signIn = useCallback(async (email: string, password: string) => {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        return result;
    }, [supabase]);

    const signInWithGoogle = useCallback(async (propertyCode?: string, redirectPath?: string) => {
        const url = new URL(`${window.location.origin}/api/auth/callback`);
        if (redirectPath) {
            url.searchParams.set('redirect', redirectPath);
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: url.toString(),
                queryParams: propertyCode ? { state: propertyCode } : {}
            }
        });
        if (error) throw error;
    }, [supabase]);

    const signUp = useCallback(async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        return data;
    }, [supabase]);

    const signOut = useCallback(async () => {
        if (user?.id) membershipCache.delete(user.id);
        await supabase.auth.signOut();
    }, [supabase, user?.id]);

    const resetPassword = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/api/auth/callback?next=/login?mode=reset`,
        });
        if (error) throw error;
    }, [supabase]);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        user,
        session,
        isLoading,
        membership,
        isMembershipLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshMembership
    }), [user, session, isLoading, membership, isMembershipLoading, signIn, signUp, signInWithGoogle, signOut, resetPassword, refreshMembership]);

    return (
        <AuthContext.Provider value={value}>
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
