'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import FormattedTime12h from '@/components/FormattedTime';
import VoiceRecorder from '@/components/VoiceRecorder';

import {
    getDebateSession,
    getSessionArguments,
    getDebateTopics,
    submitTextDebate,
    completeDebateSession
} from '@/lib/api';

import {
    Mic,
    Send,
    Brain,
    User,
    MessageSquare,
    Clock,
    Trophy,
    Target,
    Sparkles,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Star
} from 'lucide-react';

export default function DebateSessionPage() {
    /* ──────────────────────────────────── state ──────────────────────────────────── */
    const { id } = useParams();
    const router = useRouter();

    const [session, setSession] = useState(null);
    const [topic, setTopic] = useState(null);

    const [argumentsList, setArguments] = useState([]);
    const [argumentText, setArgText] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    /* live-stats */
    const [points, setPoints] = useState(0);
    const [avgQuality, setAvgQuality] = useState(0);
    const [durationSec, setDurationSec] = useState(0);
    const [completing, setCompleting] = useState(false);

    const timerRef = useRef(null);

    /* ───────────────────────────── fetch session & topic ─────────────────────────── */
    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                /* fetch session & user topics in parallel */
                const [sess, topics] = await Promise.all([
                    getDebateSession(id),
                    getDebateTopics()
                ]);

                setSession(sess);
                setTopic(topics.find(t => t.id === sess.topic) || null);

                /* start timer */
                const start = new Date(sess.started_at || Date.now());
                timerRef.current = setInterval(() => {
                    setDurationSec(Math.floor((Date.now() - start.getTime()) / 1000));
                }, 1000);
            } catch {
                setError('Failed to load session');
            } finally {
                setLoading(false);
            }
        })();
        return () => clearInterval(timerRef.current);
    }, [id]);

    /* ─────────────────────────────── fetch arguments ────────────────────────────── */
    useEffect(() => {
        if (!id) return;

        const loadArgs = async () => {
            const args = await getSessionArguments(id);
            setArguments(args);
            updateStats(args);
        };

        loadArgs();
    }, [id]);

    /* ───────────────────────────────── helpers ──────────────────────────────────── */
    const updateStats = args => {
        const student = args.filter(a => a.speaker === 'student');
        const ai = args.filter(a => a.speaker === 'ai_opponent');

        /* points */
        let total = 0;
        let qSum = 0;
        student.forEach(a => {
            total += 10;                      // base
            if (a.argument_type === 'voice_argument') total += 10;
            if (a.quality_score) {
                total += Math.max(0, (a.quality_score - 5) * 2);
                qSum += a.quality_score;
            }
        });
        setPoints(total);
        setAvgQuality(student.length ? qSum / student.length : 0);
    };

    const formatDuration = sec => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    };

    /* ───────────────────── text argument submission handler ─────────────────────── */
    const handleSubmit = async e => {
        e.preventDefault();
        if (!argumentText.trim()) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await submitTextDebate(id, argumentText);
            if (!res.success) throw new Error(res.error);

            setArguments(prev => [...prev, res.arguments.student, res.arguments.ai_opponent]);
            updateStats([...argumentsList, res.arguments.student, res.arguments.ai_opponent]);

            setArgText('');
            if (res.ai_response_audio) {
                const audio = new Audio(`data:audio/wav;base64,${res.ai_response_audio}`);
                audio.play().catch(() => { });
            }
        } catch (err) {
            setError(err.message || 'Failed to submit argument');
        } finally {
            setSubmitting(false);
        }
    };

    /* ─────────────────────────── handle voice recorder push ─────────────────────── */
    const handleNewArgument = arg => {
        setArguments(prev => Array.isArray(arg) ? [...prev, ...arg] : [...prev, arg]);
        updateStats(Array.isArray(arg) ? [...argumentsList, ...arg] : [...argumentsList, arg]);
    };

    /* ───────────────────────────── complete session API ─────────────────────────── */
    const completeSession = async () => {
        setCompleting(true);
        setError(null);
        try {
            const res = await completeDebateSession(id);
            if (!res.success) throw new Error(res.error);
            sessionStorage.setItem('completedSession', JSON.stringify(res));
            router.push('/dashboard?completed=true');
        } catch (err) {
            setError(err.message || 'Failed to complete session');
        } finally {
            setCompleting(false);
        }
    };

    /* ────────────────────────────── guard screens ──────────────────────────────── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-blue-600" />
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500 mr-2" />
                {error}
            </div>
        );
    }

    /* counts & flags */
    const studentCount = argumentsList.filter(a => a.speaker === 'student').length;
    const aiCount = argumentsList.filter(a => a.speaker === 'ai_opponent').length;
    const completed = session.is_completed;

    /* ────────────────────────────────── JSX ────────────────────────────────────── */
    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">

            {/* header */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Dashboard
                    </Link>

                    <Mic className="w-7 h-7 text-blue-600 dark:text-blue-400" />

                    <div className="flex-1">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            {topic?.title || 'Debate'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{topic?.description}</p>
                    </div>
                </div>
            </div>

            {/* body */}
            <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">

                {/* left – arguments & forms */}
                <div className="lg:col-span-2 space-y-8">

                    {/* argument list */}
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-3 mb-6">
                            <MessageSquare className="w-6 h-6 text-purple-500" />
                            <h2 className="text-xl font-bold">Debate Arguments</h2>
                            <span className="ml-auto text-sm text-gray-500">{argumentsList.length}</span>
                        </div>

                        {argumentsList.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No arguments yet</div>
                        ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {argumentsList.map(a => (
                                    <div
                                        key={a.id}
                                        className={`rounded-2xl p-4 border ${a.speaker === 'student'
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700 ml-8'
                                                : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700 mr-8'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-600 dark:text-gray-400">
                                            {a.speaker === 'student' ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                                            {a.speaker === 'student' ? 'You' : 'AI'}
                                            <Clock className="w-3 h-3 ml-2" />
                                            <FormattedTime12h timestamp={a.timestamp} />
                                            {a.quality_score && (
                                                <span className="flex items-center gap-1 ml-2 text-yellow-600">
                                                    <Star className="w-3 h-3" /> {a.quality_score}/10
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-300">{a.content}</p>
                                        {a.feedback && (
                                            <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">
                                                <strong>AI Feedback:</strong> {a.feedback}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* text argument form */}
                    {!completed && (
                        <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex items-center gap-2 font-semibold">
                                    <Send className="w-5 h-5 text-indigo-500" />
                                    Make Your Argument
                                </div>

                                <textarea
                                    className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    rows={4}
                                    maxLength={1000}
                                    placeholder="Type your argument here..."
                                    value={argumentText}
                                    onChange={e => setArgText(e.target.value)}
                                    required
                                />

                                {error && <p className="text-sm text-red-500">{error}</p>}

                                <motion.button
                                    type="submit"
                                    disabled={submitting || !argumentText.trim()}
                                    whileTap={{ scale: 0.97 }}
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : 'Submit Argument'}
                                </motion.button>
                            </form>
                        </div>
                    )}

                    {/* voice recorder */}
                    {!completed && (
                        <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                            <VoiceRecorder sessionId={session.id} onNewArgument={handleNewArgument} />
                        </div>
                    )}
                </div>

                {/* right – live stats */}
                <div className="sticky top-24 space-y-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" /> Session Stats
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1">
                                    <Trophy className="w-4 h-4 text-yellow-600" /> Points
                                </span>
                                <span className="font-semibold">{points}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="flex items-center gap-1">
                                    <Target className="w-4 h-4 text-blue-600" /> Your Arguments
                                </span>
                                <span>{studentCount}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="flex items-center gap-1">
                                    <Brain className="w-4 h-4 text-green-600" /> AI Responses
                                </span>
                                <span>{aiCount}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-purple-600" /> Duration
                                </span>
                                <span>{formatDuration(durationSec)}</span>
                            </div>

                            {avgQuality > 0 && (
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-500" /> Avg Quality
                                    </span>
                                    <span>{avgQuality.toFixed(1)}/10</span>
                                </div>
                            )}
                        </div>

                        <motion.button
                            onClick={completeSession}
                            disabled={completing || completed || studentCount === 0}
                            whileTap={{ scale: 0.97 }}
                            className={`mt-6 w-full py-3 rounded-2xl font-bold ${completed
                                    ? 'bg-gray-400 cursor-default'
                                    : studentCount === 0
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                                }`}
                        >
                            {completed
                                ? 'Session Completed'
                                : completing
                                    ? 'Completing…'
                                    : 'Complete Session'}
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}
