'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Phone,
    PhoneOff,
    Volume2,
    VolumeX,
    Settings,
    Users,
    MessageSquare,
    MoreVertical,
    Brain,
    User
} from 'lucide-react';
import { createRealtimeDebateRoom, getDebateTopics } from '@/lib/api';

export default function RealtimeDebatePage() {
    const router = useRouter();
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [userStance, setUserStance] = useState('for');
    const [language, setLanguage] = useState('en-IN');
    const [aiSpeaker, setAiSpeaker] = useState('anushka');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTopics();
    }, []);

    const loadTopics = async () => {
        try {
            const topicsData = await getDebateTopics();
            setTopics(topicsData);
        } catch (err) {
            setError('Failed to load topics');
        }
    };

    const handleStartDebate = async () => {
        if (!selectedTopic) {
            setError('Please select a topic');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const roomData = {
                topic_id: selectedTopic.id,
                user_stance: userStance,
                language: language,
                ai_speaker: aiSpeaker
            };

            const result = await createRealtimeDebateRoom(roomData);

            if (result.success) {
                // Navigate to the debate room
                router.push(`/realtime-debate/room/${result.room.id}`);
            } else {
                setError(result.error || 'Failed to create debate room');
            }
        } catch (err) {
            setError(err.message || 'Failed to start debate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl">
                            <Users className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-red-600 via-pink-600 to-red-800 dark:from-red-400 dark:via-pink-400 dark:to-red-300 bg-clip-text text-transparent">
                            Live AI Debate
                        </span>
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                        Experience real-time voice debates with AI opponents
                    </p>
                </motion.div>

                {/* Setup Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
                >
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Topic Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Choose Debate Topic
                            </label>
                            <div className="grid gap-3">
                                {topics.map((topic) => (
                                    <motion.button
                                        key={topic.id}
                                        onClick={() => setSelectedTopic(topic)}
                                        className={`text-left p-4 rounded-xl border-2 transition-all ${selectedTopic?.id === topic.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                                            }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                                            {topic.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {topic.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full">
                                                {topic.difficulty_level}
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full">
                                                {topic.age_group}
                                            </span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Configuration Options */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* User Stance */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Your Position
                                </label>
                                <select
                                    value={userStance}
                                    onChange={(e) => setUserStance(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="for">For (Supporting)</option>
                                    <option value="against">Against (Opposing)</option>
                                </select>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Language
                                </label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="en-IN">English (India)</option>
                                    <option value="hi-IN">Hindi</option>
                                    <option value="ta-IN">Tamil</option>
                                    <option value="te-IN">Telugu</option>
                                    <option value="bn-IN">Bengali</option>
                                </select>
                            </div>

                            {/* AI Speaker */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    AI Voice
                                </label>
                                <select
                                    value={aiSpeaker}
                                    onChange={(e) => setAiSpeaker(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="anushka">Anushka (Female)</option>
                                    <option value="meera">Meera (Female)</option>
                                    <option value="krithika">Krithika (Female)</option>
                                    <option value="karthik">Karthik (Male)</option>
                                </select>
                            </div>
                        </div>

                        {/* Start Debate Button */}
                        <motion.button
                            onClick={handleStartDebate}
                            disabled={loading || !selectedTopic}
                            className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Creating Debate Room...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Start Live Debate
                                </span>
                            )}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Features Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {[
                        {
                            icon: Mic,
                            title: "Real-Time Voice",
                            description: "Speak naturally and get instant AI responses"
                        },
                        {
                            icon: Brain,
                            title: "Smart AI Opponent",
                            description: "Adaptive AI that responds to your arguments"
                        },
                        {
                            icon: Volume2,
                            title: "Streaming Audio",
                            description: "Hear AI responses as they're generated"
                        }
                    ].map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="text-center p-6 bg-white/50 dark:bg-gray-800/50 rounded-2xl"
                        >
                            <div className="inline-flex p-3 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl mb-4">
                                <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
