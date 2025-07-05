"use client";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    MicVocal, 
    StopCircle, 
    Loader2, 
    Trophy, 
    Lightbulb, 
    Volume2,
    Send,
    AlertCircle,
    Brain
} from "lucide-react";
import { submitVoiceDebate } from "@/lib/api";

export default function VoiceRecorder({ sessionId, onNewArgument }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready to record");
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [transcription, setTranscription] = useState(null);
    const [aiResponse, setAiResponse] = useState(null);
    const [gamification, setGamification] = useState(null);
    const [feedback, setFeedback] = useState(null);
    
    const mediaRecorder = useRef(null);
    const streamRef = useRef(null);
    const audioChunks = useRef([]);
    const audioPlayerRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Client-side audio validation function
    const validateAudioUpload = (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0) {
            return { valid: false, error: 'No audio recorded. Please try again.' };
        }

        if (audioBlob.size < 1000) { // Less than 1KB
            return { valid: false, error: 'Recording too short. Please speak for at least 2 seconds.' };
        }

        if (audioBlob.size > 10 * 1024 * 1024) { // More than 10MB
            return { valid: false, error: 'Recording too long. Please keep it under 10MB.' };
        }

        return { valid: true };
    };

    const startRecording = async () => {
        try {
            setStatus("Starting recording...");
            setError(null);
            setIsRecording(true);
            
            // Get media stream with enhanced audio settings
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });
            streamRef.current = stream;
            
            // Setup MediaRecorder with fallback options
            let options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/webm' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'audio/mp4' };
                }
            }
            
            mediaRecorder.current = new MediaRecorder(stream, options);
            audioChunks.current = [];
            
            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };
            
            mediaRecorder.current.onstop = async () => {
                await processRecording();
            };
            
            mediaRecorder.current.start(1000); // Collect data every second
            setStatus("Recording... Speak your argument clearly");
            
        } catch (error) {
            console.error("Error starting recording:", error);
            setError("Could not access microphone. Please check permissions and try again.");
            setIsRecording(false);
            setStatus("Ready to record");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            setStatus("Stopping recording...");
            setIsRecording(false);
            mediaRecorder.current.stop();
        }
        
        // Clean up stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const processRecording = async () => {
        try {
            setIsProcessing(true);
            setStatus("Processing your argument...");
            setError(null);
            
            // Create audio blob
            const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
            setAudioUrl(URL.createObjectURL(audioBlob));
            
            // Validate audio before submitting
            const validation = validateAudioUpload(audioBlob);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Submit to backend for processing
            setStatus("Converting speech to text...");
            const result = await submitVoiceDebate(sessionId, audioBlob);
            
            if (result.success) {
                setTranscription(result.student_transcript);
                setStatus("Generating AI response...");
                setAiResponse(result.ai_response_text);
                setGamification(result.gamification);
                setFeedback(result.feedback);
                
                // Update arguments list in parent component
                if (onNewArgument && result.arguments) {
                    onNewArgument([result.arguments.student, result.arguments.ai_opponent]);
                }
                
                // Play AI response if available
                if (result.ai_response_audio) {
                    setStatus("Playing AI response...");
                    await playAIResponse(result.ai_response_audio);
                }
                
                setStatus("Voice debate completed!");
            } else {
                throw new Error(result.error || "Failed to process voice debate");
            }
            
        } catch (error) {
            console.error("Error processing recording:", error);
            setError(error.message || "Failed to process your recording. Please try again.");
            setStatus("Ready to record");
        } finally {
            setIsProcessing(false);
        }
    };

    const playAIResponse = async (base64Audio) => {
        try {
            const audioData = `data:audio/wav;base64,${base64Audio}`;
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = audioData;
                await audioPlayerRef.current.play();
            }
        } catch (error) {
            console.error("Error playing AI response:", error);
        }
    };

    const resetRecorder = () => {
        setAudioUrl(null);
        setTranscription(null);
        setAiResponse(null);
        setGamification(null);
        setFeedback(null);
        setError(null);
        setStatus("Ready to record");
    };

    return (
        <div className="space-y-6">
            {/* Main Recording Interface */}
            <div className="flex flex-col items-center gap-4">
                <motion.button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`relative w-24 h-24 rounded-full font-bold shadow-2xl transition-all duration-300 flex items-center justify-center ${
                        isRecording
                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white scale-110"
                            : isProcessing
                            ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 hover:shadow-xl"
                    }`}
                    whileTap={{ scale: 0.95 }}
                    animate={isRecording ? { 
                        boxShadow: [
                            "0 0 0 0 rgba(239, 68, 68, 0.7)",
                            "0 0 0 20px rgba(239, 68, 68, 0)",
                        ]
                    } : {}}
                    transition={isRecording ? { 
                        boxShadow: { duration: 1.5, repeat: Infinity }
                    } : {}}
                >
                    {isProcessing ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : isRecording ? (
                        <StopCircle className="w-8 h-8" />
                    ) : (
                        <MicVocal className="w-8 h-8" />
                    )}
                </motion.button>
                
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {status}
                    </p>
                    {isRecording && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Click to stop recording
                        </p>
                    )}
                </div>
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl"
                    >
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">{error}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio Playback */}
            <AnimatePresence>
                {audioUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                    >
                        <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <audio controls src={audioUrl} className="flex-1" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transcription Display */}
            <AnimatePresence>
                {transcription && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl"
                    >
                        <h4 className="font-bold text-blue-700 dark:text-blue-200 mb-2 flex items-center gap-2">
                            <Send className="w-5 h-5" /> Your Argument (Transcribed)
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">{transcription}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Response Display */}
            <AnimatePresence>
                {aiResponse && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl"
                    >
                        <h4 className="font-bold text-green-700 dark:text-green-200 mb-2 flex items-center gap-2">
                            <Brain className="w-5 h-5" /> AI Opponent Response
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">{aiResponse}</p>
                        <audio ref={audioPlayerRef} className="w-full" controls />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gamification Results */}
            <AnimatePresence>
                {gamification && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl"
                    >
                        <h4 className="font-bold text-yellow-700 dark:text-yellow-200 mb-3 flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> Points Earned!
                        </h4>
                        <div className="space-y-2">
                            {gamification.points_breakdown?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300">{item.action}</span>
                                    <span className="text-yellow-700 dark:text-yellow-300 font-semibold">
                                        +{item.points} pts
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-yellow-200 dark:border-yellow-700 pt-2 mt-2 text-sm">
                                <div className="flex justify-between font-semibold">
                                    <span>Total Points:</span>
                                    <span>{gamification.user_total_points}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Level:</span>
                                    <span>{gamification.current_level}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-xl"
                    >
                        <h4 className="font-bold text-purple-700 dark:text-purple-200 mb-2 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5" /> AI Feedback (Score: {feedback.score}/10)
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 mb-2">{feedback.text}</p>
                        {feedback.fallacies && feedback.fallacies.length > 0 && (
                            <div className="text-sm text-purple-600 dark:text-purple-300">
                                <strong>Logical issues detected:</strong> {feedback.fallacies.join(", ")}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Button */}
            {(transcription || aiResponse) && (
                <motion.button
                    onClick={resetRecorder}
                    className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    Record Another Argument
                </motion.button>
            )}
        </div>
    );
}
