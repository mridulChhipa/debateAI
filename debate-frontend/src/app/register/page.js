'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

export default function Register() {
    const router = useRouter();
    const { login } = useAuth();
    const { isLoading: authLoading } = useAuthRedirect('guestOnly');   // ⬅️  redirect if already logged-in

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [ageGroup, setAgeGroup] = useState('13-15');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    /* ---------- show spinner while auth state is being checked ---------- */
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Checking authentication…</p>
                </div>
            </div>
        );
    }

    /* ------------------------- form submit ---------------------------- */
    const handleSubmit = async e => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setSubmitting(false);
            return;
        }

        try {
            /* 1️⃣  register user */
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/register/`,
                { username, email, password, age_group: ageGroup }
            );

            /* 2️⃣  auto-login */
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/token/`,
                { username, password }
            );

            const { access, refresh } = res.data;
            login(access, refresh);                                    // update global auth state
            axios.defaults.headers.common.Authorization = `Bearer ${access}`;

            router.push('/dashboard');                                 // go to dashboard
        } catch {
            setError('Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    /* --------------------------- JSX --------------------------- */
    return (
        <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-rose-100 via-blue-50 to-blue-200
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl
                      shadow-2xl p-8 border border-rose-100/60 dark:border-gray-700">
                {/* header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mb-2">
                        <LogOut className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-200">
                        Create Account
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Join us and start debating with AI!
                    </p>
                </div>

                {/* error */}
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50
                          dark:bg-red-900/30 rounded px-3 py-2">
                        {error}
                    </div>
                )}

                {/* form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* username */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Username
                        </label>
                        <input
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700
                         rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            autoFocus
                            placeholder="Choose a username"
                            disabled={submitting}
                        />
                    </div>

                    {/* email */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700
                         rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="Your email address"
                            disabled={submitting}
                        />
                    </div>

                    {/* password */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Password
                        </label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700
                         rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="Create a password"
                            disabled={submitting}
                        />
                    </div>

                    {/* confirm password */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700
                         rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm your password"
                            disabled={submitting}
                        />
                    </div>

                    {/* age group */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Age Group
                        </label>
                        <select
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700
                         rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={ageGroup}
                            onChange={e => setAgeGroup(e.target.value)}
                            required
                            disabled={submitting}
                        >
                            <option value="13-15">13-15</option>
                            <option value="15-17">15-17</option>
                            <option value="16-18">16-18</option>
                            <option value="18+">18+</option>
                        </select>
                    </div>

                    {/* submit */}
                    <button
                        type="submit"
                        className="w-full py-2 rounded-lg font-bold bg-gradient-to-r
                       from-blue-600 to-rose-500 hover:from-blue-700 hover:to-rose-600
                       text-white shadow-lg transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                        stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" d="M4 12a8 8 0 018-8v8z" fill="currentColor" />
                                </svg>
                                Registering…
                            </span>
                        ) : (
                            'Register'
                        )}
                    </button>
                </form>

                {/* footer link */}
                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Already have an account?{' '}
                    <a href="/login" className="text-blue-600 dark:text-blue-300 hover:underline font-medium">
                        Login
                    </a>
                </div>
            </div>
        </div>
    );
}
