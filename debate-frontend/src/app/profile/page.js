'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Globe, Calendar, Save,
    Trophy, Target, TrendingUp, Shield, Camera
} from 'lucide-react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';        // ✨ route-guard
import { useAuth } from '@/components/AuthContext';        // ✨ correct path

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

export default function Profile() {
    const { isLoading: authLoading } = useAuthRedirect('authRequired');
    const router = useRouter();
    const { logout } = useAuth();                                 

    const [userData, setUserData] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    /* ---------- fetch profile ---------- */
    useEffect(() => {
        async function fetchProfile() {
            try {
                const token = getToken();
                const res = await axios.get(`${API_BASE}/auth/profile/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setUserData({
                    username: res.data.username,
                    email: res.data.email,
                    total_points: res.data.total_points,
                    current_level: res.data.current_level,
                    debates_completed: res.data.debates_completed,
                    first_name: res.data.first_name || '',
                    last_name: res.data.last_name || '',
                    age_group: res.data.age_group || '13-15',
                    preferred_language: res.data.preferred_language || 'en-IN'
                });
                setFetchError(null);
            } catch (e) {
                setFetchError('Failed to load profile data.');
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    /* ---------- form handlers ---------- */
    const handleChange = e => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
        if (success) setSuccess(false);
        if (updateError) setUpdateError(null);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        setUpdateError(null);
        setSuccess(false);

        try {
            const token = getToken();
            await axios.put(`${API_BASE}/auth/profile/`, userData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            setUpdateError('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    /* ---------- loading / auth check ---------- */
    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading profile…</p>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-red-600">{fetchError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    /* ---------- small helpers ---------- */
    const stats = [
        {
            title: 'Total Points',
            value: userData.total_points,
            icon: Trophy,
            gradient: 'from-yellow-400 to-orange-500',
            bg: 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
        },
        {
            title: 'Debates Completed',
            value: userData.debates_completed,
            icon: Target,
            gradient: 'from-green-400 to-emerald-500',
            bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
        },
        {
            title: 'Level',
            value: userData.current_level,
            icon: TrendingUp,
            gradient: 'from-blue-400 to-cyan-500',
            bg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
        }
    ];

    const languageOptions = [
        { value: 'en-IN', label: 'English', flag: '🇺🇸' },
        { value: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
        { value: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
        { value: 'te-IN', label: 'Telugu', flag: '🇮🇳' },
        { value: 'bn-IN', label: 'Bengali', flag: '🇮🇳' }
    ];

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="max-w-6xl mx-auto px-6 py-8">

                <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Profile Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your account settings and preferences
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                            <div className="text-center">
                                <div className="relative inline-block mb-6">
                                    <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-2xl">
                                        {(userData.first_name || userData.username)[0].toUpperCase()}
                                    </div>
                                    <button className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg">
                                        <Camera className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                                    {userData.first_name ? `${userData.first_name} ${userData.last_name}` : userData.username}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">@{userData.username}</p>
                                <span className="mt-4 inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                                    <Shield className="w-4 h-4 inline mr-1" />
                                    Verified User
                                </span>
                            </div>
                        </div>

                        {stats.map((s, i) => (
                            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                                className={`bg-gradient-to-br ${s.bg} rounded-2xl p-6 border border-gray-100 dark:border-gray-700`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{s.title}</p>
                                        <p className={`text-2xl font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>
                                            {s.value}
                                        </p>
                                    </div>
                                    <span className={`p-3 rounded-2xl bg-clip-padding bg-gradient-to-r ${s.gradient}`}>
                                        <s.icon className="w-5 h-5 text-white" />
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">Edit Profile</h2>

                            <AnimatePresence>
                                {success && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl text-green-600 dark:text-green-400">
                                        Profile updated successfully! 🎉
                                    </motion.div>
                                )}
                                {updateError && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-600 dark:text-red-400">
                                        {updateError}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-6">

                                <div>
                                    <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <Mail className="w-4 h-4" />Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={userData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                                        <input
                                            name="first_name"
                                            value={userData.first_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                                        <input
                                            name="last_name"
                                            value={userData.last_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <Calendar className="w-4 h-4" />Age Group
                                        </label>
                                        <select
                                            name="age_group"
                                            value={userData.age_group}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            {['13-15', '15-17', '16-18', '18+'].map(opt => (
                                                <option key={opt} value={opt}>{opt} years</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <Globe className="w-4 h-4" />Preferred Language
                                        </label>
                                        <select
                                            name="preferred_language"
                                            value={userData.preferred_language}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            {languageOptions.map(l => (
                                                <option key={l.value} value={l.value}>
                                                    {l.flag} {l.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* SUBMIT */}
                                <motion.button
                                    type="submit"
                                    disabled={saving}
                                    whileTap={{ scale: 0.97 }}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {saving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" d="M4 12a8 8 0 018-8v8z" fill="currentColor" />
                                            </svg>
                                            Saving…
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2"><Save className="w-5 h-5" />Save Changes</span>
                                    )}
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
