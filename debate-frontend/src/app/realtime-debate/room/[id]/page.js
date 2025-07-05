'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Phone,
    PhoneOff,
    Volume2,
    VolumeX,
    MessageSquare,
    Settings,
    MoreVertical,
    Brain,
    User,
    Clock,
    AlertCircle,
    CheckCircle,
    Zap
} from 'lucide-react';
import RealtimeDebateConnection from '@/components/RealtimeDebateConnection';
import AudioVisualizer from '@/components/AudioVisualizer';
import TranscriptDisplay from '@/components/TranscriptDisplay';

export default function DebateRoomPage() {
    const { id } = useParams();
    const router = useRouter();

    // Connection state
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [room, setRoom] = useState(null);
    const [error, setError] = useState(null);

    // Debate state
    const [isDebateActive, setIsDebateActive] = useState(false);
    const [currentTurn, setCurrentTurn] = useState('user');
    const [turnNumber, setTurnNumber] = useState(1);

    // Audio state
    const [isMuted, setIsMuted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [volume, setVolume] = useState(100);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);

    // Messages and streaming
    const [messages, setMessages] = useState([]);
    const [currentUserMessage, setCurrentUserMessage] = useState('');
    const [currentAiMessage, setCurrentAiMessage] = useState('');
    const [streamingStatus, setStreamingStatus] = useState(null);

    // Audio processing
    const [audioBuffer, setAudioBuffer] = useState([]);
    const [audioLevel, setAudioLevel] = useState(0);

    // Session stats
    const [sessionDuration, setSessionDuration] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(null);

    const connectionRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        // Start session timer when debate becomes active
        if (isDebateActive && !sessionStartTime) {
            setSessionStartTime(Date.now());
            timerRef.current = setInterval(() => {
                setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isDebateActive, sessionStartTime]);

    const handleConnectionStatusChange = (status, roomData = null, errorMsg = null) => {
        setConnectionStatus(status);
        if (roomData) setRoom(roomData);
        if (errorMsg) setError(errorMsg);
    };

    const handleDebateMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    const handleStreamingUpdate = (streamData) => {
        setStreamingStatus(streamData);

        if (streamData.type === 'ai_audio_stream_start') {
            setIsAiSpeaking(true);
            setCurrentAiMessage(streamData.text);
        } else if (streamData.type === 'ai_audio_chunk' && streamData.is_final) {
            setIsAiSpeaking(false);
            setCurrentAiMessage('');
        }
    };

    const handleStartDebate = () => {
        if (connectionRef.current) {
            connectionRef.current.startDebate();
            setIsDebateActive(true);
        }
    };

    const handleEndDebate = () => {
        if (connectionRef.current) {
            connectionRef.current.endDebate();
            setIsDebateActive(false);
        }
    };

    const handleToggleRecording = () => {
        if (connectionRef.current) {
            if (isRecording) {
                connectionRef.current.stopRecording();
            } else {
                connectionRef.current.startRecording();
            }
            setIsRecording(!isRecording);
        }
    };

    const handleToggleMute = () => {
        setIsMuted(!isMuted);
        // Implement actual audio muting logic
    };

    const handleVolumeChange = (newVolume) => {
        setVolume(newVolume);
        // Implement actual volume control
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (connectionStatus === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/realtime-debate')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Back to Setup
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Hidden connection component */}
            <RealtimeDebateConnection
                ref={connectionRef}
                roomId={id}
                onStatusChange={handleConnectionStatusChange}
                onMessage={handleDebateMessage}
                onStreamingUpdate={handleStreamingUpdate}
                onRecordingChange={setIsRecording}
                onAudioLevel={setAudioLevel}
            />

            {/* Main Interface */}
            <div className="flex flex-col h-screen">
                {/* Header Bar */}
                <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                    connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                            <span className="text-sm text-gray-400 capitalize">{connectionStatus}</span>
                        </div>
                        {room && (
                            <>
                                <div className="text-sm text-gray-400">|</div>
                                <h2 className="font-semibold truncate max-w-md">{room.topic?.title}</h2>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(sessionDuration)}</span>
                        </div>
                        <button
                            onClick={() => router.push('/realtime-debate')}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex">
                    {/* Video/Avatar Area */}
                    <div className="flex-1 flex flex-col">
                        {/* Participants */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            {/* User Card */}
                            <motion.div
                                className="relative bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700"
                                animate={{
                                    borderColor: isRecording ? '#ef4444' : '#374151',
                                    scale: isRecording ? 1.02 : 1
                                }}
                            >
                                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                                    <div className="text-center">
                                        <div className="relative">
                                            <User className="w-20 h-20 mx-auto mb-4 text-white" />
                                            {isRecording && (
                                                <motion.div
                                                    className="absolute -inset-4 rounded-full border-2 border-red-500"
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">You</h3>
                                        <p className="text-blue-200 text-sm">
                                            {room?.user_stance === 'for' ? 'Supporting' : 'Opposing'}
                                        </p>
                                    </div>
                                </div>

                                {/* Audio Visualizer */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <AudioVisualizer
                                        isActive={isRecording}
                                        audioLevel={audioLevel}
                                        color="blue"
                                    />
                                </div>

                                {/* Recording Indicator */}
                                {isRecording && (
                                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        <span className="text-white text-sm font-medium">Recording</span>
                                    </div>
                                )}
                            </motion.div>

                            {/* AI Card */}
                            <motion.div
                                className="relative bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700"
                                animate={{
                                    borderColor: isAiSpeaking ? '#10b981' : '#374151',
                                    scale: isAiSpeaking ? 1.02 : 1
                                }}
                            >
                                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600">
                                    <div className="text-center">
                                        <div className="relative">
                                            <Brain className="w-20 h-20 mx-auto mb-4 text-white" />
                                            {isAiSpeaking && (
                                                <motion.div
                                                    className="absolute -inset-4 rounded-full border-2 border-green-500"
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">AI Opponent</h3>
                                        <p className="text-emerald-200 text-sm">
                                            {room?.ai_stance === 'for' ? 'Supporting' : 'Opposing'}
                                        </p>
                                    </div>
                                </div>

                                {/* AI Audio Visualizer */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <AudioVisualizer
                                        isActive={isAiSpeaking}
                                        audioLevel={isAiSpeaking ? 70 : 0}
                                        color="emerald"
                                    />
                                </div>

                                {/* Speaking Indicator */}
                                {isAiSpeaking && (
                                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600 px-3 py-1 rounded-full">
                                        <Zap className="w-3 h-3 text-white" />
                                        <span className="text-white text-sm font-medium">AI Speaking</span>
                                    </div>
                                )}

                                {/* Streaming Status */}
                                {streamingStatus && (
                                    <div className="absolute top-4 right-4 bg-gray-900/80 px-3 py-1 rounded-full">
                                        <span className="text-white text-xs">
                                            {streamingStatus.type === 'ai_audio_stream_start' ? 'Generating...' :
                                                streamingStatus.type === 'ai_audio_chunk' && !streamingStatus.is_final ?
                                                    `Chunk ${streamingStatus.chunk_id}` : 'Ready'}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Controls */}
                        <div className="p-6 bg-gray-800 border-t border-gray-700">
                            <div className="flex items-center justify-center gap-4">
                                {/* Microphone Control */}
                                <motion.button
                                    onClick={handleToggleRecording}
                                    disabled={!isDebateActive || isAiSpeaking}
                                    className={`p-4 rounded-full transition-all ${isRecording
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-600 hover:bg-gray-500'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    whileTap={{ scale: 0.95 }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {isRecording ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                                </motion.button>

                                {/* Volume Control */}
                                <motion.button
                                    onClick={handleToggleMute}
                                    className={`p-4 rounded-full transition-all ${isMuted
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-600 hover:bg-gray-500'
                                        }`}
                                    whileTap={{ scale: 0.95 }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                </motion.button>

                                {/* Start/End Debate */}
                                {!isDebateActive ? (
                                    <motion.button
                                        onClick={handleStartDebate}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full font-semibold transition-all"
                                        whileTap={{ scale: 0.95 }}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        Start Debate
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        onClick={handleEndDebate}
                                        className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all"
                                        whileTap={{ scale: 0.95 }}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <PhoneOff className="w-6 h-6" />
                                    </motion.button>
                                )}

                                {/* Settings */}
                                <motion.button
                                    className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 transition-all"
                                    whileTap={{ scale: 0.95 }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <Settings className="w-6 h-6" />
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Transcript */}
                    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="font-semibold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Live Transcript
                            </h3>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <TranscriptDisplay
                                messages={messages}
                                currentUserMessage={currentUserMessage}
                                currentAiMessage={currentAiMessage}
                                isAiSpeaking={isAiSpeaking}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
