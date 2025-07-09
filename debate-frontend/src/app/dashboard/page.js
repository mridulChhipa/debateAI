'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    createDebateSession,
    getDebateTopics,
    getProfile,
    getRecentSessions
} from '@/lib/api';
import {
    Trophy,
    Target,
    TrendingUp,
    Lightbulb,
    Clock,
    PlayCircle,
    BookOpen,
    AlertCircle,
    ExternalLink,
    Plus
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

export default function Dashboard() {
    const router = useRouter();
    const { isLoading: authLoading } = useAuthRedirect('authRequired');

    const [topics, setTopics] = useState([]);
    const [profile, setProfile] = useState(null);
    const [recentSessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileError, setProfErr] = useState(null);

    useEffect(() => {
        if (authLoading) return;

        (async () => {
            setLoading(true);
            try {
                const [tRes, pRes, sRes] = await Promise.allSettled([
                    getDebateTopics(),
                    getProfile(),
                    getRecentSessions()
                ]);

                if (tRes.status === 'fulfilled') setTopics(tRes.value);

                if (pRes.status === 'fulfilled') {
                    setProfile(pRes.value);
                    setProfErr(null);
                } else {
                    if (pRes.reason?.response?.status === 401) {
                        router.push('/login');
                        return;
                    }
                    setProfErr('Could not load profile');
                    setProfile({
                        username: 'User',
                        total_points: 0,
                        debates_completed: 0,
                        current_level: 'beginner'
                    });
                }

                if (sRes.status === 'fulfilled') setSessions(sRes.value);
                else setSessions([]);

                setError(null);
            } catch {
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        })();
    }, [authLoading, router]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('completed') === 'true') {
            sessionStorage.removeItem('completedSession');
            window.history.replaceState({}, '', '/dashboard');
        }
    }, []);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const handleStartDebate = async topicId => {
        try {
            const res = await createDebateSession(topicId);
            // API returns { success, session:{ id,… } }
            const sessionId = res.session?.id ?? res.id;
            router.push(`/debate/${sessionId}`);
        } catch (e) {
            setError(e.message || 'Could not start debate');
        }
    };

    const stats = [
        {
            title: 'Total Points',
            value: profile.total_points,
            icon: Trophy,
            grad: 'from-yellow-400 to-orange-500'
        },
        {
            title: 'Debates Completed',
            value: profile.debates_completed,
            icon: Target,
            grad: 'from-green-400 to-emerald-500'
        },
        {
            title: 'Current Level',
            value: profile.current_level,
            icon: TrendingUp,
            grad: 'from-blue-400 to-cyan-500'
        }
    ];

    console.log(recentSessions);
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="max-w-7xl mt-20 mx-auto px-6 py-8">

                {/* profile error banner */}
                {profileError && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl text-yellow-700 dark:text-yellow-300"
                    >
                        <AlertCircle className="w-5 h-5 inline mr-1" />
                        {profileError} – showing defaults
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Welcome, {profile.username}!
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        Ready to enhance your debate skills with AI-powered practice?
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            {stats.map((s, i) => (
                                <motion.div
                                    key={s.title}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 + i * 0.1 }}
                                    className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition group cursor-pointer bg-gradient-to-br ${s.grad}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700/70 dark:text-gray-300/80">{s.title}</p>
                                            <p className="text-3xl font-bold text-white drop-shadow-sm">
                                                {typeof s.value === 'string'
                                                    ? s.value.charAt(0).toUpperCase() + s.value.slice(1)
                                                    : s.value}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white/20 group-hover:scale-110 transition">
                                            <s.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                                    <Lightbulb className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Your Topics</h2>
                                <Link href="/create-topic" className='ml-auto'>
                                    <motion.div
                                        className="relative inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group"
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                        <Plus className="w-4 h-4 relative z-10 group-hover:rotate-180 transition-transform duration-300" />
                                        <span className="relative z-10">Create Topic</span>
                                    </motion.div>
                                </Link>

                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                {topics.length === 0 ? (
                                    <div className="col-span-2 text-center py-12">
                                        <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">No topics yet. Create one!</p>
                                    </div>
                                ) : (
                                    topics.map((t, i) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + i * 0.05 }}
                                            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-md hover:shadow-lg transition overflow-hidden"
                                        >
                                            <div className="p-6 space-y-4">
                                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                                    {t.title}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 line-clamp-2">{t.description}</p>

                                                <div className="flex items-center justify-between">
                                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
                                                        {t.difficulty_level}
                                                    </span>
                                                    <button
                                                        onClick={() => handleStartDebate(t.id)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
                                                    >
                                                        <PlayCircle className="w-4 h-4" />
                                                        Start
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg p-6 sticky top-24">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    Recent Sessions
                                </h3>
                            </div>

                            {recentSessions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No sessions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentSessions.map((s, i) => (
                                        <motion.div
                                            key={s.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + i * 0.05 }}
                                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <h4 className="font-semibold text-gray-800 dark:text-white text-sm">
                                                    {s.title}
                                                </h4>
                                                <Link href={`/debate/${s.id}`}>
                                                    <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                                                </Link>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">{s.date}</span>
                                                <div className="flex items-center gap-2">
                                                    {s.score && (
                                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                                            {s.score}/100
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`px-2 py-0.5 rounded ${s.status === 'Completed'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                            }`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
