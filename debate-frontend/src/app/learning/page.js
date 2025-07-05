'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Brain,
    Trophy,
    Target,
    TrendingUp,
    Clock,
    Star,
    CheckCircle,
    PlayCircle,
    Lightbulb,
    Award,
    Zap,
    ArrowRight,
    Lock,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { getLearningDashboard, startLearningTopic } from '@/lib/api';

export default function LearningDashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [startingTopic, setStartingTopic] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await getLearningDashboard();
            if (data.success) {
                setDashboardData(data.data);
            } else {
                setError(data.error || 'Failed to load learning dashboard');
            }
        } catch (err) {
            setError('Failed to load learning dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleStartTopic = async (topicId) => {
        try {
            setStartingTopic(topicId);
            const result = await startLearningTopic(topicId);
            if (result.success) {
                // Navigate to learning topic page
                window.location.href = `/learning/topic/${topicId}`;
            }
        } catch (err) {
            console.error('Failed to start topic:', err);
        } finally {
            setStartingTopic(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading your learning journey...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">{error}</div>
                    <button
                        onClick={loadDashboardData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const filteredTopics = selectedCategory === 'all'
        ? dashboardData?.recommended_topics || []
        : dashboardData?.recommended_topics?.filter(topic =>
            topic.category.toLowerCase() === selectedCategory.toLowerCase()
        ) || [];

    return (
        <div className="min-h-screen pt-18 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                AI Learning Hub
                            </h1>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                Personalized learning powered by artificial intelligence
                            </p>
                        </div>
                    </div>

                    {/* Current Level Badge */}
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full">
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Current Level: {dashboardData?.user_level?.charAt(0).toUpperCase() + dashboardData?.user_level?.slice(1)}
                            </span>
                        </div>
                        <div className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full">
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                Progress: {Math.round(dashboardData?.learning_stats?.level_completion || 0)}% Complete
                            </span>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Progress Overview */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            {[
                                {
                                    title: "Topics Completed",
                                    value: dashboardData?.learning_stats?.topics_completed || 0,
                                    icon: CheckCircle,
                                    gradient: "from-green-400 to-emerald-500",
                                    bgGradient: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                                },
                                {
                                    title: "Time Spent",
                                    value: `${Math.round((dashboardData?.learning_stats?.total_time_spent || 0) / 60)}h`,
                                    icon: Clock,
                                    gradient: "from-blue-400 to-cyan-500",
                                    bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
                                },
                                {
                                    title: "Level Progress",
                                    value: `${Math.round(dashboardData?.learning_stats?.level_completion || 0)}%`,
                                    icon: TrendingUp,
                                    gradient: "from-purple-400 to-pink-500",
                                    bgGradient: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
                                }
                            ].map((stat, index) => (
                                <motion.div
                                    key={stat.title}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgGradient} p-6 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                {stat.title}
                                            </p>
                                            <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                                                {stat.value}
                                            </p>
                                        </div>
                                        <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} group-hover:scale-110 transition-transform duration-300`}>
                                            <stat.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* AI Recommendations Section */}
                        {dashboardData?.ai_recommendations?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-700"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl">
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                        AI Recommendations
                                    </h3>
                                    <div className="ml-auto px-3 py-1 bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">
                                        Powered by Sarvam AI
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {dashboardData.ai_recommendations.slice(0, 3).map((rec, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                                            <div className="p-1 bg-yellow-500 rounded-full mt-1">
                                                <Lightbulb className="w-3 h-3 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white">{rec.topic}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{rec.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Learning Topics */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                        Recommended for You
                                    </h2>
                                </div>

                                {/* Category Filter */}
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-md">
                                    {['all', ...new Set(dashboardData?.recommended_topics?.map(t => t.category) || [])].map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(category)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {category === 'all' ? 'All' : category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                {filteredTopics.length === 0 ? (
                                    <div className="col-span-2 text-center py-12">
                                        <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400 text-lg">No topics available in this category.</p>
                                    </div>
                                ) : (
                                    filteredTopics.map((topic, index) => (
                                        <motion.div
                                            key={topic.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 + index * 0.1 }}
                                            className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                            <div className="relative p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg bg-${topic.category_color}-100 dark:bg-${topic.category_color}-900/30`}>
                                                            <BookOpen className={`w-5 h-5 text-${topic.category_color}-600 dark:text-${topic.category_color}-400`} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                {topic.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {topic.category}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {topic.ai_recommended && (
                                                        <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                                                            AI Pick
                                                        </div>
                                                    )}
                                                </div>

                                                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                                    {topic.description}
                                                </p>

                                                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{topic.estimated_duration} min</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Trophy className="w-4 h-4" />
                                                        <span>{topic.points_reward} pts</span>
                                                    </div>
                                                </div>

                                                {topic.ai_recommended && topic.ai_reason && (
                                                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                                            <strong>AI Insight:</strong> {topic.ai_reason}
                                                        </p>
                                                    </div>
                                                )}

                                                <motion.button
                                                    onClick={() => handleStartTopic(topic.id)}
                                                    disabled={startingTopic === topic.id}
                                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50"
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {startingTopic === topic.id ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Starting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlayCircle className="w-5 h-5" />
                                                            Start Learning
                                                        </>
                                                    )}
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="lg:col-span-1 space-y-6"
                    >
                        {/* Recent Achievements */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                                    <Award className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recent Achievements</h3>
                            </div>

                            {dashboardData?.recent_achievements?.length > 0 ? (
                                <div className="space-y-3">
                                    {dashboardData.recent_achievements.slice(0, 3).map((achievement, index) => (
                                        <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                                                <Trophy className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white text-sm">
                                                    {achievement.achievement.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(achievement.earned_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                    <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Complete topics to earn achievements!</p>
                                </div>
                            )}
                        </div>

                        {/* Knowledge Gaps */}
                        {dashboardData?.learning_stats?.knowledge_gaps?.length > 0 && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-700 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                                        <Target className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200">Focus Areas</h3>
                                </div>
                                <div className="space-y-2">
                                    {dashboardData.learning_stats.knowledge_gaps.map((gap, index) => (
                                        <div key={index} className="px-3 py-2 bg-orange-100 dark:bg-orange-800/30 rounded-lg">
                                            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">{gap}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Learning Categories */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Learning Categories</h3>
                            <div className="space-y-3">
                                {dashboardData?.categories?.map((category, index) => (
                                    <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 bg-${category.color}-100 dark:bg-${category.color}-900/30 rounded-lg`}>
                                                <BookOpen className={`w-4 h-4 text-${category.color}-600 dark:text-${category.color}-400`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white text-sm">{category.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{category.topics_count} topics</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
