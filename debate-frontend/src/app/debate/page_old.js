"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceRecorder from "@/components/VoiceRecorder";
import {
    getDebateSession,
    getSessionArguments,
    submitTextDebate,
    getDebateTopics,
    completeDebateSession,
} from "@/lib/api";

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
    Star,
    TrendingUp
} from "lucide-react";
import Link from "next/link";
import FormattedTime12h from "@/components/FormattedTime";

const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

export default function DebateSessionPage() {
    const { id } = useParams();
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [topicDetails, setTopicDetails] = useState(null); // Add this state
    const [argumentsList, setArgumentsList] = useState([]);
    const [argumentText, setArgumentText] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Dynamic session stats
    const [sessionPoints, setSessionPoints] = useState(0);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [averageQuality, setAverageQuality] = useState(0);
    const [completing, setCompleting] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        const loadSessionData = async () => {
            try {
                setLoading(true);

                // Fetch session and topics in parallel
                const [sessionData, topicsData] = await Promise.all([
                    getDebateSession(id),
                    getDebateTopics()
                ]);

                setSession(sessionData);
                console.log(sessionData, topicsData)
                // Find the matching topic
                const matchingTopic = topicsData.find(topic => topic.id === sessionData.topic);
                setTopicDetails(matchingTopic);

                setError(null);
            } catch (err) {
                setError("Failed to load session data");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadSessionData();
        }
    }, [id]);

    useEffect(() => {
        setLoading(true);
        getDebateSession(id, getToken())
            .then((data) => {
                setSession(data);
                // Set session start time (use session creation time or current time)
                const startTime = data.started_at ? new Date(data.started_at) : new Date();
                setSessionStartTime(startTime);
            })
            .catch(() => setError("Failed to load session"))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        getSessionArguments(id, getToken())
            .then((args) => {
                setArgumentsList(args);
                calculateSessionStats(args);
            })
            .catch(() => setError("Failed to load arguments"));
    }, [id]);

    // Real-time duration timer
    useEffect(() => {
        if (sessionStartTime) {
            timerRef.current = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now - sessionStartTime) / 1000); // seconds
                setSessionDuration(diff);
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }
    }, [sessionStartTime]);

    const calculateSessionStats = (argList) => {
        const studentArgs = argList.filter(arg => arg.speaker === 'student');

        // Calculate points based on arguments and quality scores
        let totalPoints = 0;
        let totalQuality = 0;
        let qualityCount = 0;

        // let total_words = 0;

        studentArgs.forEach(arg => {
            // Base points per argument
            totalPoints += 10;

            // Bonus points for quality
            if (arg.quality_score) {
                const qualityBonus = Math.max(0, (arg.quality_score - 5) * 2);
                totalPoints += qualityBonus;
                totalQuality += arg.quality_score;
                qualityCount++;
            }


            // Bonus for voice arguments
            if (arg.argument_type === 'voice_argument') {
                totalPoints += 10;
            }
        });

        setSessionPoints(totalPoints);
        setAverageQuality(qualityCount > 0 ? (totalQuality / qualityCount) : 0);
    };

    const formatDuration = (seconds) => {
        const units = [
            { label: 'year', seconds: 365 * 24 * 60 * 60 },
            { label: 'month', seconds: 30 * 24 * 60 * 60 },
            { label: 'week', seconds: 7 * 24 * 60 * 60 },
            { label: 'day', seconds: 24 * 60 * 60 },
            { label: 'hour', seconds: 60 * 60 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 }
        ];

        for (const { label, seconds: unitSeconds } of units) {
            if (seconds >= unitSeconds) {
                const value = Math.floor(seconds / unitSeconds);
                return `${value} ${label}${value !== 1 ? 's' : ''}`;
            }
        }

        return '0 seconds';
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!argumentText.trim()) return;

        setSubmitting(true);
        setError(null);

        try {
            // Submit text argument for processing
            const result = await submitTextDebate(id, argumentText);

            if (result.success) {
                // Directly update arguments list using setArgumentsList
                if (result.arguments) {
                    setArgumentsList((prev) => [
                        ...prev,
                        result.arguments.student,
                        result.arguments.ai_opponent
                    ]);
                }

                // Clear the input
                setArgumentText("");

                // Show AI response audio if available
                if (result.ai_response_audio) {
                    const audioData = `data:audio/wav;base64,${result.ai_response_audio}`;
                    const audio = new Audio(audioData);
                    audio.play().catch(err => console.error('Audio play failed:', err));
                }

                // Optional: Show success feedback with gamification results
                if (result.gamification && result.gamification.level_up) {
                    console.log(`Congratulations! You leveled up to ${result.gamification.current_level}!`);
                }

            } else {
                throw new Error(result.error || "Failed to submit argument");
            }

        } catch (error) {
            console.error("Text argument submission error:", error);
            setError(error.message || "Failed to submit argument. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };


    const handleCompleteSession = async () => {
        setCompleting(true);
        setError(null);

        try {
            // Call API to mark session as completed
            const result = await completeDebateSession(id);

            if (result.success) {
                // Store completion data in sessionStorage for dashboard display
                sessionStorage.setItem('completedSession', JSON.stringify({
                    sessionStats: result.session_stats,
                    gamification: result.gamification,
                    completedAt: new Date().toISOString()
                }));

                // Redirect to dashboard with success parameter
                router.push('/dashboard?completed=true');
            } else {
                throw new Error(result.error || "Failed to complete session");
            }

        } catch (error) {
            console.error("Session completion error:", error);
            setError(error.message || "Failed to complete session. Please try again.");
        } finally {
            setCompleting(false);
        }
    };


    const handleNewArgument = (args) => {
        if (Array.isArray(args)) {
            // Handle multiple arguments
            setArgumentsList(prev => [...prev, ...args]);
        } else {
            // Handle single argument (for text submissions)
            setArgumentsList(prev => [...prev, args]);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                        <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-pulse"></div>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400">Loading debate session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-600 dark:text-gray-400">Session not found</p>
                </div>
            </div>
        );
    }

    const studentArgumentsCount = argumentsList.filter(arg => arg.speaker === 'student').length;
    const aiArgumentsCount = argumentsList.filter(arg => arg.speaker === 'ai_opponent').length;
    const sessionCompleted = Boolean(session?.is_completed);
    const startTime = new Date(session?.started_at);
    const endTime = sessionCompleted && session.completed_at
        ? new Date(session.completed_at)
        : new Date();           // live timer while open

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Header Section */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-100">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-green-700 dark:text-green-400">Live Session</span>
                            </div>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4"
                    >

                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                {topicDetails.title}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{topicDetails.description}</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Success Message */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl"
                        >
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Argument submitted successfully!</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Debate Arguments</h2>
                                <div className="ml-auto px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {argumentsList.length} arguments
                                </div>
                            </div>

                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                <AnimatePresence>
                                    {argumentsList.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-12"
                                        >
                                            <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400 text-lg">No arguments yet</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm">Start the debate by making your first argument!</p>
                                        </motion.div>
                                    ) : (
                                        argumentsList.map((arg, index) => (
                                            <motion.div
                                                key={arg.id}
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${arg.speaker === "student"
                                                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700 ml-8"
                                                    : "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 mr-8"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-2 rounded-xl ${arg.speaker === "student"
                                                        ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                                                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                                                        }`}>
                                                        {arg.speaker === "student" ? (
                                                            <User className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <Brain className="w-5 h-5 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-bold text-gray-800 dark:text-white">
                                                                {arg.speaker === "student" ? "You" : "AI Opponent"}
                                                            </span>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <Clock className="w-3 h-3" />
                                                                <span><FormattedTime12h timestamp={arg.timestamp} /></span>
                                                            </div>
                                                            {arg.quality_score && (
                                                                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                                                    <Star className="w-3 h-3 text-yellow-500" />
                                                                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                                                                        {arg.quality_score}/10
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                                            {arg.content}
                                                        </p>
                                                        {arg.feedback && (
                                                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                                                    <strong>AI Feedback:</strong> {arg.feedback}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                        {!sessionCompleted && (<>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
                            >
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                                            <Send className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Make Your Argument</h3>
                                    </div>

                                    <div className="relative">
                                        <textarea
                                            className="w-full px-6 py-4 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                            value={argumentText}
                                            onChange={(e) => setArgumentText(e.target.value)}
                                            placeholder="Type your argument here... Be clear, logical, and persuasive!"
                                            required
                                            rows={4}
                                            maxLength={1000}
                                        />
                                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                            <span className={`text-xs ${argumentText.length > 900 ? 'text-red-500' :
                                                argumentText.length > 700 ? 'text-yellow-500' :
                                                    'text-gray-400'
                                                }`}>
                                                {argumentText.length}/1000
                                            </span>
                                            {argumentText.trim() && (
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>

                                    <motion.button
                                        type="submit"
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        disabled={submitting || !argumentText.trim()}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                                </svg>
                                                Analyzing & Generating AI Response...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <Send className="w-5 h-5" />
                                                Submit Argument
                                            </span>
                                        )}
                                    </motion.button>

                                    {/* Error Display */}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-600 dark:text-red-400 text-sm"
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                </form>

                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl">
                                        <Mic className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Voice Debate</h3>
                                    <div className="ml-auto px-3 py-1 bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium">
                                        AI Powered
                                    </div>
                                </div>
                                <VoiceRecorder
                                    sessionId={session.id}
                                    onNewArgument={handleNewArgument}
                                />
                            </motion.div>
                        </>)}
                        {sessionCompleted && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                This debate is closed – further arguments are disabled.
                            </p>
                        )}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-1 space-y-6"
                    >
                        {/* Session Stats */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 sticky top-32">
                            {/* Header with Session Status */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Session Stats</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
                                </div>
                            </div>

                            {/* Main Stats Grid */}
                            <div className="space-y-4">
                                {/* Points with Progress Bar */}
                                <motion.div
                                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 border border-yellow-200 dark:border-yellow-700"
                                    animate={{ scale: sessionPoints > 0 ? [1, 1.02, 1] : 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Session Points</span>
                                        </div>
                                        <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                                            {sessionPoints}
                                        </span>
                                    </div>
                                    <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                                        <motion.div
                                            className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((sessionPoints / 200) * 100, 100)}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                        />
                                    </div>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                        {200 - sessionPoints > 0 ? `${200 - sessionPoints} points to next milestone` : 'Milestone reached!'}
                                    </p>
                                </motion.div>

                                {/* Arguments Counter */}
                                <motion.div
                                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Your Arguments</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                            {studentArgumentsCount}
                                        </span>
                                        {studentArgumentsCount > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex items-center gap-1"
                                            >
                                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                                <div className="w-1 h-1 bg-blue-500 rounded-full animation-delay-100"></div>
                                                <div className="w-1 h-1 bg-blue-500 rounded-full animation-delay-200"></div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* AI Responses Counter */}
                                <motion.div
                                    className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">AI Responses</span>
                                    </div>
                                    <span className="text-xl font-bold text-green-700 dark:text-green-300">
                                        {aiArgumentsCount}
                                    </span>
                                </motion.div>

                                {/* Duration with Real-time Update */}
                                <motion.div
                                    className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700"
                                    key={Math.floor(sessionDuration / 60)} // Re-animate every minute
                                    animate={{
                                        boxShadow: ["0 0 0 0 rgba(168, 85, 247, 0.4)", "0 0 0 4px rgba(168, 85, 247, 0)", "0 0 0 0 rgba(168, 85, 247, 0)"]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Duration</span>
                                    </div>
                                    <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                                        {formatDuration(sessionCompleted ? (endTime - startTime) / 1000 : sessionDuration)}
                                    </span>
                                </motion.div>

                                {/* Average Quality with Visual Indicator */}
                                <AnimatePresence>
                                    {averageQuality > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Avg Quality</span>
                                                </div>
                                                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                                                    {averageQuality.toFixed(1)}/10
                                                </span>
                                            </div>

                                            {/* Quality Stars Visualization */}
                                            <div className="flex items-center gap-1">
                                                {[...Array(10)].map((_, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0.3 }}
                                                        animate={{
                                                            opacity: index < averageQuality ? 1 : 0.3,
                                                            scale: index < averageQuality ? 1 : 0.8
                                                        }}
                                                        transition={{ delay: index * 0.1 }}
                                                    >
                                                        <Star
                                                            className={`w-3 h-3 ${index < averageQuality
                                                                ? 'text-amber-500 fill-amber-500'
                                                                : 'text-gray-300 dark:text-gray-600'
                                                                }`}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>

                                            {/* Quality Message */}
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                                {
                                                    averageQuality >= 8 ? "Excellent arguments! 🎉" :
                                                        averageQuality >= 6 ? "Good quality arguments! 👍" :
                                                            averageQuality >= 4 ? "Keep improving! 💪" :
                                                                "Focus on evidence and structure 📚"
                                                }
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Engagement Metrics */}
                                {(studentArgumentsCount > 0 || aiArgumentsCount > 0) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700"
                                    >
                                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Engagement</h4>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Response Rate</span>
                                            <span className="font-medium text-gray-800 dark:text-white">
                                                {studentArgumentsCount > 0 ? Math.round((aiArgumentsCount / studentArgumentsCount) * 100) : 0}%
                                            </span>
                                        </div>


                                    </motion.div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Session Progress</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {studentArgumentsCount}/3 arguments
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <motion.div
                                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((studentArgumentsCount / 3) * 100, 100)}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                                {sessionCompleted &&
                                    <motion.button
                                        disabled={sessionCompleted}
                                        className={`w-full py-4 font-bold rounded-2xl transition-all duration-300 transform shadow-lg ${studentArgumentsCount >= 3
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:scale-105 hover:shadow-xl'
                                            : studentArgumentsCount > 0
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-105'
                                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            } disabled:opacity-50 disabled:transform-none`}
                                        whileTap={{ scale: completing ? 1 : 0.98 }}
                                        whileHover={{ scale: studentArgumentsCount > 0 && !completing ? 1.02 : 1 }}
                                    >

                                        <span className="flex items-center justify-center gap-2">
                                            <Trophy className="w-5 h-5" />
                                            Completed
                                        </span>
                                    </motion.button>
                                }
                                {!sessionCompleted &&
                                    <motion.button
                                        onClick={handleCompleteSession}
                                        disabled={completing || studentArgumentsCount === 0}
                                        className={`w-full py-4 font-bold rounded-2xl transition-all duration-300 transform shadow-lg ${studentArgumentsCount >= 3
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:scale-105 hover:shadow-xl'
                                            : studentArgumentsCount > 0
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-105'
                                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            } disabled:opacity-50 disabled:transform-none`}
                                        whileTap={{ scale: completing ? 1 : 0.98 }}
                                        whileHover={{ scale: studentArgumentsCount > 0 && !completing ? 1.02 : 1 }}
                                    >
                                        {completing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                                </svg>
                                                Completing Session...
                                            </span>
                                        ) : studentArgumentsCount >= 3 ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Trophy className="w-5 h-5" />
                                                Complete & Get Results
                                            </span>
                                        ) : studentArgumentsCount > 0 ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Target className="w-5 h-5" />
                                                Complete Early
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <MessageSquare className="w-5 h-5" />
                                                Make Your First Argument
                                            </span>
                                        )}
                                    </motion.button>
                                }

                                {/* Helpful Messages */}
                                <AnimatePresence>
                                    {studentArgumentsCount === 0 && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center"
                                        >
                                            💡 Start by making your first argument above
                                        </motion.p>
                                    )}

                                    {studentArgumentsCount > 0 && studentArgumentsCount < 3 && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-xs text-blue-600 dark:text-blue-400 mt-3 text-center"
                                        >
                                            🚀 {3 - studentArgumentsCount} more argument{3 - studentArgumentsCount !== 1 ? 's' : ''} for optimal results
                                        </motion.p>
                                    )}

                                    {studentArgumentsCount >= 3 && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-xs text-green-600 dark:text-green-400 mt-3 text-center"
                                        >
                                            ✨ Excellent! Ready for comprehensive results
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                    </motion.div>
                </div>
            </div>
        </div>
    );
}
