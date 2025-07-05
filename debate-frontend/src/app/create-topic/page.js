'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Lightbulb,
    ArrowLeft,
    Save,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { createDebateTopic } from '@/lib/api';

export default function CreateTopicPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty_level: 'beginner',
        age_group: '13-15'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading topic creator...</p>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await createDebateTopic(formData);

            if (result.success) {
                setSuccess(true);

                if (result.gamification?.level_up) {
                    console.log(`Congratulations! You leveled up to ${result.gamification.current_level}!`);
                }

                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to create topic');
            }

        } catch (err) {
            setError(err.message || 'Failed to create topic');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6">
                        <ArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </Link>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
                            <Lightbulb className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            Create New Topic
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 ml-16">
                        Design a custom debate topic to practice your argumentation skills
                    </p>
                </motion.div>

                {/* Success Message */}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl text-center"
                    >
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <p className="text-green-700 dark:text-green-300 font-medium">
                            Topic created successfully! Redirecting to dashboard...
                        </p>
                    </motion.div>
                )}

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
                >
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl"
                        >
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-medium">{error}</span>
                            </div>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Topic Title */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Topic Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="e.g., Should artificial intelligence replace human teachers?"
                                required
                                maxLength={200}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                {formData.title.length}/200 characters
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description *
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                placeholder="Provide context and background for this debate topic..."
                                required
                                rows={4}
                                maxLength={500}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                {formData.description.length}/500 characters
                            </div>
                        </div>

                        {/* Difficulty Level & Age Group */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Difficulty Level
                                </label>
                                <select
                                    name="difficulty_level"
                                    value={formData.difficulty_level}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Target Age Group
                                </label>
                                <select
                                    name="age_group"
                                    value={formData.age_group}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="13-15">13-15 years</option>
                                    <option value="15-17">15-17 years</option>
                                    <option value="16-18">16-18 years</option>
                                    <option value="18+">18+ years</option>
                                </select>
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={loading}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                    Creating Topic...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" />
                                    Create Topic
                                </span>
                            )}
                        </motion.button>
                    </form>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-6"
                >
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-4">
                        Tips for Creating Great Debate Topics
                    </h3>
                    <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                        <li>Choose topics that have clear arguments on both sides</li>
                        <li>Make the question specific and focused</li>
                        <li>Ensure the topic is relevant to your target age group</li>
                        <li>Provide enough context in the description for informed debate</li>
                        <li>Consider current events and trending issues</li>
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}
