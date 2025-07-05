# apps/realtime_debate/services.py
import redis
import json
import asyncio
import base64
import tempfile
import os
import struct
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from sarvamai import AsyncSarvamAI, AudioOutput
from apps.sarvam_integration.services import SarvamAIService
from gamification.services import GamificationEngine
from .models import RealtimeDebateRoom, RealtimeDebateMessage, RealtimeSessionManager, AudioStreamChunk
import logging
import time

logger = logging.getLogger('realtime_debate')

class StreamingDebateManager:
    """Enhanced debate manager with streaming TTS and smart buffering"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host='redis-14243.crce206.ap-south-1-1.ec2.redns.redis-cloud.com',
            port=14243,
            decode_responses=True,
            username="default",
            password="4tuvX53iMP8zgDFAuQ2RJVe2uWuekPao",
            health_check_interval=30,
            socket_keepalive=True,
            socket_keepalive_options={},
            retry_on_timeout=True
        )
        # Use async client for streaming TTS
        self.sarvam_async_client = AsyncSarvamAI(
            api_subscription_key=settings.SARVAM_API_KEY
        )
        self.sarvam_service = SarvamAIService()  # Sync client for STT
        
        # Audio processing settings
        self.chunk_duration = 3.0  # Process every 3 seconds
        self.silence_threshold = 0.01
        self.max_buffer_chunks = 50  # Memory management
        self.audio_buffers = {}  # Per-room audio buffers
        
        # Streaming management
        self.active_streams = {}  # Track active TTS streams
    
    def create_debate_session(self, room_id: str, user_id: int) -> Dict[str, Any]:
        """Create a new debate session in Redis"""
        try:
            session_key = f"debate_session:{room_id}"
            
            session_data = {
                'room_id': room_id,
                'user_id': user_id,
                'created_at': timezone.now().isoformat(),
                'status': 'waiting',
                'current_turn': 'user',
                'turn_number': 1,
                'is_recording': False,
                'is_ai_responding': False,
                'is_streaming_tts': False,
                'connection_count': 0
            }
            
            # Store session in Redis with expiration
            self.redis_client.setex(
                session_key, 
                7200,  # 2 hours expiration
                json.dumps(session_data, default=str)
            )
            
            # Initialize audio buffer
            self.audio_buffers[room_id] = {
                'chunks': [],
                'last_activity': timezone.now(),
                'processing': False,
                'total_duration': 0.0
            }
            
            logger.info(f"Created debate session {room_id} for user {user_id}")
            
            return {
                'success': True,
                'session_key': session_key,
                'room_id': room_id,
                'session_data': session_data
            }
            
        except Exception as e:
            logger.error(f"Error creating debate session: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_session_data(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get session data from Redis"""
        try:
            session_key = f"debate_session:{room_id}"
            data = self.redis_client.get(session_key)
            
            if data:
                return json.loads(data)
            return None
            
        except Exception as e:
            logger.error(f"Error getting session data: {str(e)}")
            return None
    
    def update_session_data(self, room_id: str, updates: Dict[str, Any]) -> bool:
        """Update session data in Redis"""
        try:
            session_key = f"debate_session:{room_id}"
            current_data = self.get_session_data(room_id)
            
            if current_data:
                current_data.update(updates)
                current_data['last_updated'] = timezone.now().isoformat()
                
                self.redis_client.setex(
                    session_key,
                    7200,  # Reset expiration
                    json.dumps(current_data, default=str)
                )
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating session data: {str(e)}")
            return False
    
    async def process_audio_chunk(self, room_id: str, audio_data: bytes, chunk_id: str) -> Dict[str, Any]:
        """Process incoming audio with smart buffering + streaming response"""
        try:
            # Initialize buffer for room if not exists
            if room_id not in self.audio_buffers:
                self.audio_buffers[room_id] = {
                    'chunks': [],
                    'last_activity': timezone.now(),
                    'processing': False,
                    'total_duration': 0.0
                }
            
            buffer = self.audio_buffers[room_id]
            buffer['chunks'].append(audio_data)
            buffer['last_activity'] = timezone.now()
            buffer['total_duration'] += 0.1  # Estimate 100ms per chunk
            
            # Check if we should process (voice activity detection)
            should_process = self._should_process_buffer(room_id, audio_data)
            
            if should_process and not buffer['processing']:
                return await self._process_complete_utterance(room_id)
            
            return {
                'success': True,
                'type': 'buffering',
                'buffer_size': len(buffer['chunks']),
                'duration': buffer['total_duration'],
                'should_process': should_process
            }
            
        except Exception as e:
            logger.error(f"Error processing audio chunk: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _process_complete_utterance(self, room_id: str) -> Dict[str, Any]:
        """Process complete user utterance and stream AI response"""
        try:
            buffer = self.audio_buffers[room_id]
            
            if buffer['processing'] or not buffer['chunks']:
                return {'success': False, 'error': 'Already processing or empty buffer'}
            
            buffer['processing'] = True
            
            # Combine audio chunks
            combined_audio = b''.join(buffer['chunks'])
            chunk_count = len(buffer['chunks'])
            buffer['chunks'] = []  # Clear buffer
            buffer['total_duration'] = 0.0
            
            # Get room data
            room = await self._get_room(room_id)
            if not room:
                buffer['processing'] = False
                return {'success': False, 'error': 'Room not found'}
            
            # Step 1: Convert speech to text (traditional STT for accuracy)
            logger.info(f"Processing speech to text for room {room_id}")
            start_time = time.time()
            stt_result = await self._speech_to_text_async(combined_audio, room.language)
            stt_time = time.time() - start_time
            
            if not stt_result['success']:
                buffer['processing'] = False
                return stt_result
            
            user_text = stt_result['transcript'].strip()
            if not user_text:
                buffer['processing'] = False
                return {'success': False, 'error': 'Empty transcription'}
            
            # Step 2: Save user message
            user_message = await self._save_user_message(room, user_text, chunk_count, stt_time)
            
            # Step 3: Generate AI response text
            ai_start_time = time.time()
            ai_response_result = await self._generate_ai_response_text(room, user_text)
            ai_generation_time = time.time() - ai_start_time
            
            if not ai_response_result['success']:
                buffer['processing'] = False
                return ai_response_result
            
            ai_text = ai_response_result['response']
            
            # Step 4: Save AI message (before streaming starts)
            ai_message = await self._save_ai_message(room, ai_text, ai_generation_time)
            
            # Step 5: Start streaming AI response audio
            logger.info(f"Starting streaming TTS for room {room_id}")
            stream_id = f"stream_{room_id}_{int(time.time())}"
            
            # Start streaming in background task
            asyncio.create_task(
                self._stream_ai_response(room_id, ai_text, room.language, room.ai_speaker, stream_id, ai_message.id)
            )
            
            # Update session state
            self.update_session_data(room_id, {
                'is_streaming_tts': True,
                'current_stream_id': stream_id,
                'turn_number': room.turn_number + 1
            })
            
            buffer['processing'] = False
            
            return {
                'success': True,
                'user_message': {
                    'id': user_message.id,
                    'text': user_text,
                    'timestamp': user_message.timestamp.isoformat(),
                    'processing_time': stt_time
                },
                'ai_message': {
                    'id': ai_message.id,
                    'text': ai_text,
                    'timestamp': ai_message.timestamp.isoformat(),
                    'processing_time': ai_generation_time
                },
                'streaming_audio': True,
                'stream_id': stream_id
            }
            
        except Exception as e:
            if room_id in self.audio_buffers:
                self.audio_buffers[room_id]['processing'] = False
            logger.error(f"Error processing utterance: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _stream_ai_response(self, room_id: str, text: str, language: str, speaker: str, stream_id: str, message_id: int) -> None:
        """Stream AI response audio using Sarvam streaming TTS"""
        try:
            # Track this stream
            self.active_streams[stream_id] = {
                'room_id': room_id,
                'started_at': time.time(),
                'chunks_sent': 0,
                'total_chunks': 0
            }
            
            # Publish start of streaming
            await self._publish_to_room(room_id, 'ai_audio_stream_start', {
                'stream_id': stream_id,
                'text': text,
                'estimated_duration': len(text) * 0.08,  # Rough estimate: 80ms per character
                'speaker': speaker
            })
            
            chunk_count = 0
            stream_start_time = time.time()
            
            # Connect to streaming TTS
            async with self.sarvam_async_client.text_to_speech_streaming.connect(
                model="bulbul:v2"
            ) as ws:
                # Configure for the specified language and speaker
                await ws.configure(
                    target_language_code=language,
                    speaker=speaker
                )
                
                logger.debug(f"TTS configured for {language} with speaker {speaker}")
                
                # Send text for conversion
                await ws.convert(text)
                await ws.flush()
                
                # Stream audio chunks as they arrive
                async for message in ws:
                    if isinstance(message, AudioOutput):
                        chunk_count += 1
                        audio_chunk = base64.b64decode(message.data.audio)
                        
                        # Record chunk in database for analytics
                        await self._save_audio_chunk(message_id, chunk_count, len(audio_chunk), time.time() - stream_start_time)
                        
                        # Publish each audio chunk to room
                        await self._publish_to_room(room_id, 'ai_audio_chunk', {
                            'stream_id': stream_id,
                            'chunk_id': chunk_count,
                            'audio_data': message.data.audio,  # Base64 encoded
                            'chunk_size': len(audio_chunk),
                            'timestamp': time.time(),
                            'is_final': False
                        })
                        
                        # Update stream tracking
                        if stream_id in self.active_streams:
                            self.active_streams[stream_id]['chunks_sent'] = chunk_count
                        
                        logger.debug(f"Streamed audio chunk {chunk_count} to room {room_id}")
                
                # Send final chunk indicator
                await self._publish_to_room(room_id, 'ai_audio_chunk', {
                    'stream_id': stream_id,
                    'chunk_id': chunk_count + 1,
                    'audio_data': None,
                    'is_final': True,
                    'total_chunks': chunk_count,
                    'streaming_duration': time.time() - stream_start_time
                })
                
                # Update message as streaming completed
                await self._update_message_streaming_status(message_id, chunk_count, True)
                
                # Update session state
                self.update_session_data(room_id, {
                    'is_streaming_tts': False,
                    'current_stream_id': None,
                    'current_turn': 'user'  # Switch turn back to user
                })
                
                # Clean up stream tracking
                if stream_id in self.active_streams:
                    self.active_streams[stream_id]['total_chunks'] = chunk_count
                    del self.active_streams[stream_id]
                
                logger.info(f"Completed streaming {chunk_count} audio chunks for room {room_id}")
            
        except Exception as e:
            logger.error(f"Error streaming AI response: {str(e)}")
            
            # Clean up on error
            if stream_id in self.active_streams:
                del self.active_streams[stream_id]
            
            await self._publish_to_room(room_id, 'ai_audio_stream_error', {
                'stream_id': stream_id,
                'error': str(e)
            })
            
            # Update session state
            self.update_session_data(room_id, {
                'is_streaming_tts': False,
                'current_stream_id': None,
                'current_turn': 'user'
            })
    
    async def _speech_to_text_async(self, audio_data: bytes, language: str) -> Dict[str, Any]:
        """Async wrapper for STT processing"""
        try:
            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_file.write(audio_data)
                tmp_file_path = tmp_file.name
            
            try:
                # Run STT in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                stt_result = await loop.run_in_executor(
                    None, 
                    self.sarvam_service.speech_to_text,
                    tmp_file_path,
                    language
                )
                return stt_result
            finally:
                os.unlink(tmp_file_path)
                
        except Exception as e:
            logger.error(f"STT async error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _generate_ai_response_text(self, room, user_argument: str) -> Dict[str, Any]:
        """Generate AI response text"""
        try:
            # Build context from previous messages
            previous_messages = await self._get_recent_messages(room, limit=5)
            
            context = f"Debate Topic: {room.topic.title}\n"
            context += f"Your stance: {room.ai_stance}\n"
            context += f"Opponent's stance: {room.user_stance}\n\n"
            
            if previous_messages:
                context += "Previous conversation:\n"
                for msg in previous_messages:
                    speaker = "You" if msg.speaker == 'ai' else "Opponent"
                    context += f"{speaker}: {msg.text_content}\n"
            
            context += f"\nOpponent's latest argument: {user_argument}\n"
            context += f"Provide a strong counter-argument from the {room.ai_stance} perspective. Keep it concise and compelling."
            
            # Run AI generation in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.sarvam_service.create_debate_opponent_response,
                room.topic.title,
                user_argument,
                room.ai_stance,
                room.language
            )
            return result
            
        except Exception as e:
            logger.error(f"AI response generation error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _should_process_buffer(self, room_id: str, latest_audio: bytes) -> bool:
        """Determine if audio buffer should be processed using multiple signals"""
        buffer = self.audio_buffers[room_id]
        
        # Signal 1: Buffer duration exceeds threshold
        duration_trigger = buffer['total_duration'] > self.chunk_duration
        
        # Signal 2: Silence detected in latest chunk
        silence_trigger = self._detect_silence(latest_audio)
        
        # Signal 3: Buffer getting too large (memory management)
        size_trigger = len(buffer['chunks']) > self.max_buffer_chunks
        
        # Signal 4: No activity for too long (force processing)
        time_since_activity = (timezone.now() - buffer['last_activity']).total_seconds()
        timeout_trigger = time_since_activity > 5.0
        
        should_process = duration_trigger or silence_trigger or size_trigger or timeout_trigger
        
        if should_process:
            logger.debug(f"Processing buffer for {room_id}: duration={duration_trigger}, silence={silence_trigger}, size={size_trigger}, timeout={timeout_trigger}")
        
        return should_process
    
    def _detect_silence(self, audio_chunk: bytes) -> bool:
        """Enhanced silence detection using RMS analysis"""
        try:
            if len(audio_chunk) < 200:  # Too small to analyze reliably
                return False
            
            # Convert bytes to 16-bit integers
            audio_ints = struct.unpack(f'{len(audio_chunk)//2}h', audio_chunk[:len(audio_chunk)//2*2])
            
            # Calculate RMS (Root Mean Square) for volume level
            rms = (sum(x*x for x in audio_ints) / len(audio_ints)) ** 0.5
            
            # Normalize to 0-1 range (16-bit audio)
            normalized_rms = rms / 32768.0
            
            # Return True if below silence threshold
            is_silent = normalized_rms < self.silence_threshold
            
            if is_silent:
                logger.debug(f"Silence detected: RMS={normalized_rms:.4f} < threshold={self.silence_threshold}")
            
            return is_silent
            
        except Exception as e:
            logger.debug(f"Silence detection error: {str(e)}")
            return False  # If analysis fails, don't assume silence
    
    async def _publish_to_room(self, room_id: str, message_type: str, data: Dict[str, Any]) -> None:
        """Publish message to room via Redis"""
        try:
            channel = f"debate_room:{room_id}"
            message = {
                'type': message_type,
                'data': data,
                'timestamp': timezone.now().isoformat()
            }
            
            # Use async Redis publish
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.redis_client.publish,
                channel,
                json.dumps(message, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error publishing to room {room_id}: {str(e)}")
    
    def end_debate_session(self, room_id: str) -> Dict[str, Any]:
        """End debate session and clean up resources"""
        try:
            # Stop any active streams
            active_stream_ids = [sid for sid, stream in self.active_streams.items() if stream['room_id'] == room_id]
            for stream_id in active_stream_ids:
                del self.active_streams[stream_id]
            
            # Clean up audio buffer
            if room_id in self.audio_buffers:
                del self.audio_buffers[room_id]
            
            # Update room status (will be called from consumer)
            # Clean up Redis data
            session_key = f"debate_session:{room_id}"
            audio_stream_key = f"audio_stream:{room_id}"
            
            self.redis_client.delete(session_key)
            self.redis_client.delete(audio_stream_key)
            
            logger.info(f"Ended debate session {room_id}")
            
            return {'success': True, 'session_ended': True}
            
        except Exception as e:
            logger.error(f"Error ending debate session: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # Database helper methods
    async def _get_room(self, room_id: str):
        """Get room from database"""
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def get_room_sync():
            try:
                return RealtimeDebateRoom.objects.get(id=room_id)
            except RealtimeDebateRoom.DoesNotExist:
                return None
        
        return await get_room_sync()
    
    async def _save_user_message(self, room, text: str, chunk_count: int, processing_time: float):
        """Save user message to database"""
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def save_message():
            return RealtimeDebateMessage.objects.create(
                room=room,
                speaker='user',
                message_type='argument',
                text_content=text,
                turn_number=room.turn_number,
                audio_duration=chunk_count * 0.1,  # Estimate
                processing_time=processing_time,
                is_streamed=False,
                streaming_completed=True
            )
        
        return await save_message()
    
    async def _save_ai_message(self, room, text: str, generation_time: float):
        """Save AI message to database"""
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def save_message():
            return RealtimeDebateMessage.objects.create(
                room=room,
                speaker='ai',
                message_type='rebuttal',
                text_content=text,
                turn_number=room.turn_number,
                processing_time=generation_time,
                is_streamed=True,
                streaming_completed=False,  # Will be updated when streaming completes
                stream_chunk_count=0
            )
        
        return await save_message()
    
    async def _save_audio_chunk(self, message_id: int, chunk_number: int, chunk_size: int, processing_time: float):
        """Save audio chunk info for analytics"""
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def save_chunk():
            try:
                AudioStreamChunk.objects.create(
                    message_id=message_id,
                    chunk_number=chunk_number,
                    chunk_size=chunk_size,
                    processing_time=processing_time
                )
            except Exception as e:
                logger.debug(f"Error saving audio chunk: {str(e)}")
        
        await save_chunk()
    
    async def _update_message_streaming_status(self, message_id: int, total_chunks: int, completed: bool):
        """Update message streaming status"""
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def update_message():
            try:
                message = RealtimeDebateMessage.objects.get(id=message_id)
                message.stream_chunk_count = total_chunks
                message.streaming_completed = completed
                message.save()
            except RealtimeDebateMessage.DoesNotExist:
                logger.error(f"Message {message_id} not found for streaming status update")
        
        await update_message()
    
    async def _get_recent_messages(self, room, limit: int = 5):
        """Get recent messages for context"""
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def get_messages():
            return list(RealtimeDebateMessage.objects.filter(
                room=room
            ).order_by('-timestamp')[:limit])
        
        messages = await get_messages()
        return list(reversed(messages))  # Return in chronological order
