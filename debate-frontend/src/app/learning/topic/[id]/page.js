'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Clock,
    Trophy,
    CheckCircle,
    BookOpen,
    Play,
    Pause,
    RotateCcw,
    Award,
    Target,
    Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { getLearningTopic, completeLearningTopic } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function LearningTopicPage() {
    const { id } = useParams();
    const router = useRouter();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStudying, setIsStudying] = useState(false);
    const [timeSpent, setTimeSpent] = useState(0);
    const [completing, setCompleting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);

    useEffect(() => {
        loadTopic();
    }, [id]);

    useEffect(() => {
        let interval;
        if (isStudying) {
            interval = setInterval(() => {
                setTimeSpent(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isStudying]);

    const loadTopic = async () => {
        try {
            setLoading(true);
            const data = await getLearningTopic(id);
            setTopic(data);

            // Check if already completed
            if (data.user_progress?.status === 'completed') {
                setCompleted(true);
            }
        } catch (err) {
            setError('Failed to load learning topic');
        } finally {
            setLoading(false);
        }
    };

    const handleStartStudying = () => {
        setIsStudying(true);
    };

    const handlePauseStudying = () => {
        setIsStudying(false);
    };

    const handleCompleteLesson = async () => {
        try {
            setCompleting(true);
            const result = await completeLearningTopic(id, Math.floor(timeSpent / 60));

            if (result.success) {
                setCompleted(true);
                setCompletionResult(result);
                setIsStudying(false);
            }
        } catch (err) {
            console.error('Failed to complete lesson:', err);
        } finally {
            setCompleting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading learning content...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">{error}</div>
                    <Link href="/learning" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Back to Learning
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <Link href="/learning" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4">
                        <ArrowLeft className="w-5 h-5" />
                        Back to Learning Hub
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                                {topic?.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{topic?.estimated_duration} min</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Trophy className="w-4 h-4" />
                                    <span>{topic?.points_reward} points</span>
                                </div>
                                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                    {topic?.difficulty_level}
                                </div>
                            </div>
                        </div>

                        {/* Study Timer */}
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800 dark:text-white">
                                {formatTime(timeSpent)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                <AnimatePresence>
                    {completed && completionResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="mb-8 p-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl text-center"
                        >
                            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                                Lesson Completed! 🎉
                            </h2>
                            <p className="text-green-700 dark:text-green-300 mb-4">
                                You've successfully completed this learning topic.
                            </p>

                            <div className="flex justify-center gap-6 mb-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        +{completionResult.points_earned}
                                    </div>
                                    <div className="text-sm text-green-700 dark:text-green-300">Points Earned</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {Math.floor(timeSpent / 60)}m
                                    </div>
                                    <div className="text-sm text-green-700 dark:text-green-300">Time Spent</div>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/learning')}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                Continue Learning
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                    <div className="lg:col-span-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
                        >
                            <div className="prose prose-lg dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 mt-8">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 mt-6">{children}</h3>,
                                        h4: ({ children }) => <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 mt-4">{children}</h4>,
                                        p: ({ children }) => <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">{children}</ol>,
                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                                        em: ({ children }) => <em className="italic text-gray-800 dark:text-gray-200">{children}</em>,
                                        blockquote: ({ children }) => (
                                            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
                                                <div className="text-gray-700 dark:text-gray-300">{children}</div>
                                            </blockquote>
                                        ),
                                        code: ({ inline, children }) => {
                                            if (inline) {
                                                return <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>;
                                            }
                                            return (
                                                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4 overflow-x-auto">
                                                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>
                                                </pre>
                                            );
                                        }
                                    }}
                                >
                                    {topic?.content}
                                </ReactMarkdown>
                            </div>
                        </motion.div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="sticky top-32 space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Study Session</h3>

                                <div className="space-y-4">
                                    {!completed && (
                                        <>
                                            {!isStudying ? (
                                                <button
                                                    onClick={handleStartStudying}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                                                >
                                                    <Play className="w-5 h-5" />
                                                    Start Studying
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handlePauseStudying}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl transition-colors"
                                                >
                                                    <Pause className="w-5 h-5" />
                                                    Pause Study
                                                </button>
                                            )}

                                            <button
                                                onClick={handleCompleteLesson}
                                                disabled={completing || timeSpent < 300}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {completing ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Completing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-5 h-5" />
                                                        Complete Lesson
                                                    </>
                                                )}
                                            </button>

                                            {timeSpent < 300 && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                                    Study for at least 5 minute to complete
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {completed && (
                                        <div className="text-center py-4">
                                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                            <p className="text-green-600 dark:text-green-400 font-medium">
                                                Lesson Completed!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Topic Details</h3>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Category</span>
                                        <span className="font-medium text-gray-800 dark:text-white capitalize">
                                            {topic?.category?.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Difficulty</span>
                                        <span className="font-medium text-gray-800 dark:text-white capitalize">
                                            {topic?.difficulty_level}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Content Type</span>
                                        <span className="font-medium text-gray-800 dark:text-white capitalize">
                                            {topic?.content_type?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
