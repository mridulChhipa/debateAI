'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();
    const { isLoading: authLoading } = useAuthRedirect('guestOnly'); // Add auth redirect check

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false); // Rename to avoid confusion

    // Show loading screen while checking authentication status
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-blue-50 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Checking authentication...</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await axios.post(
                (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/token/',
                { username, password }
            );

            const { access, refresh } = response.data;

            // Update global auth state using AuthContext
            login(access, refresh);

            // Set axios default header for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

            // Navigate to dashboard
            router.push('/dashboard');

        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.detail || 'Invalid username or password');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-blue-50 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-rose-100/60 dark:border-gray-700">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mb-2">
                        <LogIn className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-200">Sign in to DebateAI</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Welcome back! Please login to your account.</p>
                </div>

                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded px-3 py-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            autoComplete="username"
                            placeholder="Enter your username"
                            disabled={submitting} // Disable during submission
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            disabled={submitting} // Disable during submission
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-rose-500 hover:from-blue-700 hover:to-rose-600 text-white shadow-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                </svg>
                                Logging in...
                            </span>
                        ) : (
                            "Login"
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Don&apos;t have an account?{' '}
                    <a href="/register" className="text-blue-600 dark:text-blue-300 hover:underline font-medium">
                        Register
                    </a>
                </div>
            </div>
        </div>
    );
}
