'use client';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const RealtimeDebateConnection = forwardRef(({
    roomId,
    onStatusChange,
    onMessage,
    onStreamingUpdate,
    onRecordingChange,
    onAudioLevel
}, ref) => {
    const wsRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioLevelIntervalRef = useRef(null);

    useImperativeHandle(ref, () => ({
        startRecording: () => startRecording(),
        stopRecording: () => stopRecording(),
        startDebate: () => sendMessage({ type: 'start_debate' }),
        endDebate: () => sendMessage({ type: 'end_debate' }),
        disconnect: () => disconnect()
    }));

    useEffect(() => {
        if (roomId) {
            connectToRoom();
        }

        return () => {
            cleanup();
        };
    }, [roomId]);

    const connectToRoom = async () => {
        try {
            onStatusChange('connecting');

            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname; // Get hostname without port
            const wsUrl = `${protocol}//${host}:8000/ws/debate/${roomId}/`; // Use port 8000

            console.log('Connecting to WebSocket:', wsUrl); // Debug log
            // Create WebSocket connection
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('Connected to debate room:', roomId);
                onStatusChange('connected');

                // Request room status
                sendMessage({ type: 'get_room_status' });

                // Start heartbeat
                startHeartbeat();
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            wsRef.current.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                onStatusChange('disconnected');

                // Attempt to reconnect if not intentional
                if (event.code !== 1000) {
                    setTimeout(() => {
                        if (roomId) {
                            connectToRoom();
                        }
                    }, 3000);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                onStatusChange('error', null, 'Connection failed');
            };

        } catch (error) {
            console.error('Error connecting to room:', error);
            onStatusChange('error', null, error.message);
        }
    };

    const handleWebSocketMessage = (data) => {
        console.log('WebSocket message:', data.type, data);

        switch (data.type) {
            case 'connection_established':
                console.log('Connection established:', data);
                break;

            case 'room_status':
                onStatusChange('connected', {
                    id: data.room_id,
                    status: data.status,
                    current_turn: data.current_turn,
                    turn_number: data.turn_number,
                    is_recording: data.is_recording,
                    is_streaming_tts: data.is_streaming_tts,
                    ai_speaker: data.ai_speaker,
                    language: data.language
                });
                break;

            case 'processing_complete':
                // User message processed, AI response coming
                onMessage({
                    type: 'user_message',
                    ...data.user_message
                });
                onMessage({
                    type: 'ai_message',
                    ...data.ai_message
                });
                break;

            case 'ai_audio_stream_start':
                onStreamingUpdate({
                    type: 'ai_audio_stream_start',
                    stream_id: data.stream_id,
                    text: data.text,
                    estimated_duration: data.estimated_duration,
                    speaker: data.speaker
                });
                break;

            case 'ai_audio_chunk':
                handleAudioChunk(data);
                onStreamingUpdate({
                    type: 'ai_audio_chunk',
                    chunk_id: data.chunk_id,
                    audio_data: data.audio_data,
                    is_final: data.is_final,
                    total_chunks: data.total_chunks
                });
                break;

            case 'ai_audio_stream_error':
                console.error('AI audio stream error:', data.error);
                onStreamingUpdate({
                    type: 'ai_audio_stream_error',
                    error: data.error
                });
                break;

            case 'audio_buffering':
                // Show buffering status
                break;

            case 'recording_started':
                onRecordingChange(true);
                break;

            case 'recording_stopped':
                onRecordingChange(false);
                break;

            case 'debate_started':
                console.log('Debate started');
                break;

            case 'debate_ended':
                console.log('Debate ended:', data.result);
                break;

            case 'error':
                console.error('Debate error:', data.message);
                onStatusChange('error', null, data.message);
                break;

            case 'heartbeat':
                // Respond to server heartbeat
                sendMessage({ type: 'ping' });
                break;

            case 'pong':
                // Server responded to our ping
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    };

    const handleAudioChunk = async (chunkData) => {
        try {
            if (!chunkData.audio_data || chunkData.is_final) {
                return;
            }

            // Decode base64 audio data
            const audioData = atob(chunkData.audio_data);
            const audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
            }

            // Create audio blob and play
            const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };

            // Play audio chunk
            await audio.play();

        } catch (error) {
            console.error('Error playing audio chunk:', error);
        }
    };

    const startRecording = async () => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            // Setup audio context for level monitoring
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            // Start audio level monitoring
            startAudioLevelMonitoring();

            // Setup MediaRecorder
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);

                    // Send audio chunk to server
                    sendAudioChunk(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                // Stop audio level monitoring
                stopAudioLevelMonitoring();

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Send stop recording message
                sendMessage({ type: 'stop_recording' });
            };

            // Start recording with small chunks for real-time processing
            mediaRecorderRef.current.start(100); // 100ms chunks

            // Send start recording message
            sendMessage({ type: 'start_recording' });

        } catch (error) {
            console.error('Error starting recording:', error);
            onStatusChange('error', null, 'Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const sendAudioChunk = (audioBlob) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Convert blob to array buffer and send as binary
            audioBlob.arrayBuffer().then(buffer => {
                wsRef.current.send(buffer);
            });
        }
    };

    const startAudioLevelMonitoring = () => {
        const updateAudioLevel = () => {
            if (analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate average level
                const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                const normalizedLevel = Math.min(100, (average / 255) * 100);

                onAudioLevel(normalizedLevel);
            }
        };

        audioLevelIntervalRef.current = setInterval(updateAudioLevel, 50); // 20 FPS
    };

    const stopAudioLevelMonitoring = () => {
        if (audioLevelIntervalRef.current) {
            clearInterval(audioLevelIntervalRef.current);
            audioLevelIntervalRef.current = null;
        }
        onAudioLevel(0);
    };

    const sendMessage = (message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    };

    const startHeartbeat = () => {
        const heartbeatInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                sendMessage({ type: 'ping' });
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000); // Every 30 seconds
    };

    const disconnect = () => {
        cleanup();
    };

    const cleanup = () => {
        // Stop recording if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        // Stop audio level monitoring
        stopAudioLevelMonitoring();

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    // This component doesn't render anything
    return null;
});

RealtimeDebateConnection.displayName = 'RealtimeDebateConnection';

export default RealtimeDebateConnection;
