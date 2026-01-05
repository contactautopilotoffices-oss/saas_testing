'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { UserPlus, Smartphone } from 'lucide-react';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { signUp } = useAuth();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // signUp stub
            await signUp(email, password, fullName);
            router.push('/organizations');
        } catch (err: any) {
            setError('Registration failed. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50 to-white -z-10" />

            <Card className="w-full max-w-md border-border/50 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-emerald-500" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-display font-black tracking-tight uppercase">Join Autopilot</CardTitle>
                    <CardDescription>
                        Create your account to start managing facilities.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="bg-slate-50/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-50/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-50/50"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md font-medium">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-400">
                        Already have an account? <a href="/login" className="text-slate-900 font-bold underline underline-offset-4">Log In</a>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                    Property OS Framework v0.1
                </CardFooter>
            </Card>
        </div>
    );
}
