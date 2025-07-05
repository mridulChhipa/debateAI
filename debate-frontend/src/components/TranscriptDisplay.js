'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Brain, Zap } from 'lucide-react';

export default function TranscriptDisplay({
    messages,
    currentUserMessage,
    currentAiMessage,
    isAiSpeaking
}) {
    const scrollRef = useRef(null);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, currentUserMessage, currentAiMessage]);

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
        >
            <AnimatePresence>
                {messages.map((message, index) => (
                    <motion.div
                        key={`${message.type}-${message.id || index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex gap-3 ${message.type === 'user_message' ? 'flex-row-reverse' : ''
                            }`}
                    >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user_message'
                                ? 'bg-blue-600'
                                : 'bg-emerald-600'
                            }`}>
                            {message.type === 'user_message' ? (
                                <User className="w-4 h-4 text-white" />
                            ) : (
                                <Brain className="w-4 h-4 text-white" />
                            )}
                        </div>

                        {/* Message Content */}
                        <div className={`flex-1 max-w-xs ${message.type === 'user_message' ? 'text-right' : ''
                            }`}>
                            <div className={`inline-block p-3 rounded-2xl ${message.type === 'user_message'
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-gray-700 text-white rounded-bl-sm'
                                }`}>
                                <p className="text-sm leading-relaxed">{message.text}</p>
                            </div>

                            <div className={`mt-1 text-xs text-gray-500 ${message.type === 'user_message' ? 'text-right' : ''
                                }`}>
                                {formatTime(message.timestamp)}
                                {message.processing_time && (
                                    <span className="ml-2">
                                        ({(message.processing_time * 1000).toFixed(0)}ms)
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Current User Message (while processing) */}
            {currentUserMessage && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 flex-row-reverse"
                >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 max-w-xs text-right">
                        <div className="inline-block p-3 rounded-2xl bg-blue-600 text-white rounded-br-sm">
                            <p className="text-sm leading-relaxed">{currentUserMessage}</p>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 text-right">
                            Processing...
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Current AI Message (while streaming) */}
            {currentAiMessage && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                        {isAiSpeaking ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <Zap className="w-4 h-4 text-white" />
                            </motion.div>
                        ) : (
                            <Brain className="w-4 h-4 text-white" />
                        )}
                    </div>
                    <div className="flex-1 max-w-xs">
                        <div className="inline-block p-3 rounded-2xl bg-gray-700 text-white rounded-bl-sm">
                            <p className="text-sm leading-relaxed">{currentAiMessage}</p>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                            {isAiSpeaking ? (
                                <>
                                    <motion.div
                                        className="w-2 h-2 bg-green-500 rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                    <span>Speaking...</span>
                                </>
                            ) : (
                                <span>Generating audio...</span>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {messages.length === 0 && !currentUserMessage && !currentAiMessage && (
                <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Start the debate to see the conversation transcript</p>
                </div>
            )}
        </div>
    );
}
