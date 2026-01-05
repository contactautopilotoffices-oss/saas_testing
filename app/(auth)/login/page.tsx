'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Lock, Smartphone } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { signIn } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signIn(email, password);
            router.push('/organizations');
        } catch (err: any) {
            setError('Invalid credentials. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 to-white -z-10" />

            <Card className="w-full max-w-md border-border/50 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-display font-medium">Welcome Back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the facility OS.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
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
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading} variant="action">
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1">
                            <Button variant="outline" disabled className="relative">
                                <Smartphone className="mr-2 h-4 w-4" />
                                Phone Number (Coming Soon)
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center text-xs text-muted-foreground">
                    <p>Protected by Autopilot Identity</p>
                </CardFooter>
            </Card>
        </div>
    );
}
