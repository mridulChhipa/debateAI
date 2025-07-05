# apps/realtime_debate/consumers.py
import json
import asyncio
import base64
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from .models import RealtimeDebateRoom, RealtimeDebateMessage, RealtimeSessionManager
from .services import StreamingDebateManager
import logging

logger = logging.getLogger('realtime_debate')

class DebateRoomConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time debate rooms with streaming TTS"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id = None
        self.room_group_name = None
        self.user = None
        self.streaming_manager = StreamingDebateManager()
        self.is_recording = False
        self.heartbeat_task = None
        
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Get room ID from URL
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'debate_room_{self.room_id}'
            self.user = self.scope['user']
            
            # Check if user is authenticated
            if not self.user.is_authenticated:
                await self.close(code=4001)
                return
            
            # Verify user has access to this room
            room = await self.get_room()
            if not room or room.user != self.user:
                await self.close(code=4003)
                return
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept WebSocket connection
            await self.accept()
            
            # Update session manager
            await self.update_session_connection(True)
            
            # Start heartbeat
            self.heartbeat_task = asyncio.create_task(self.heartbeat_loop())
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'room_id': self.room_id,
                'user_id': self.user.id,
                'message': 'Connected to debate room',
                'streaming_enabled': True
            }))
            
            # Send current room status
            await self.send_room_status()
            
            logger.info(f"User {self.user.username} connected to debate room {self.room_id}")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {str(e)}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            # Cancel heartbeat
            if self.heartbeat_task:
                self.heartbeat_task.cancel()
            
            if self.room_group_name:
                # Update session manager
                await self.update_session_connection(False)
                
                # Leave room group
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
                
                # Stop any ongoing recording
                if self.is_recording:
                    await self.stop_recording()
                
                logger.info(f"User {self.user.username if self.user else 'Unknown'} disconnected from room {self.room_id}")
                
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {str(e)}")
    
    async def receive(self, text_data=None, bytes_data=None):
        """Handle incoming WebSocket messages"""
        try:
            if text_data:
                # Handle text messages (control commands)
                await self.handle_text_message(text_data)
            elif bytes_data:
                # Handle binary data (audio chunks)
                await self.handle_audio_data(bytes_data)
                
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {str(e)}")
            await self.send_error("Failed to process message")
    
    async def handle_text_message(self, text_data):
        """Handle text-based control messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'start_recording':
                await self.start_recording()
            elif message_type == 'stop_recording':
                await self.stop_recording()
            elif message_type == 'start_debate':
                await self.start_debate()
            elif message_type == 'end_debate':
                await self.end_debate()
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            elif message_type == 'get_room_status':
                await self.send_room_status()
            elif message_type == 'stop_ai_stream':
                # Client requested to stop current AI stream
                await self.stop_ai_stream(data.get('stream_id'))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling text message: {str(e)}")
            await self.send_error("Failed to process command")
    
    async def handle_audio_data(self, bytes_data):
        """Handle incoming audio data with streaming response"""
        try:
            if not self.is_recording:
                logger.debug("Received audio data but not recording")
                return
            
            # Process with streaming manager
            chunk_id = f"{self.room_id}_{timezone.now().timestamp()}"
            result = await self.streaming_manager.process_audio_chunk(
                self.room_id, 
                bytes_data, 
                chunk_id
            )
            
            if result['success']:
                if result.get('type') == 'buffering':
                    # Send buffering status to show user we're receiving
                    await self.send(text_data=json.dumps({
                        'type': 'audio_buffering',
                        'buffer_size': result['buffer_size'],
                        'duration': result['duration'],
                        'chunk_id': chunk_id
                    }))
                elif result.get('streaming_audio'):
                    # Processing complete, AI will start streaming response
                    await self.send(text_data=json.dumps({
                        'type': 'processing_complete',
                        'user_message': result['user_message'],
                        'ai_message': result['ai_message'],
                        'streaming_audio': True,
                        'stream_id': result['stream_id']
                    }))
            else:
                await self.send_error(result.get('error', 'Processing failed'))
                
        except Exception as e:
            logger.error(f"Error handling audio data: {str(e)}")
            await self.send_error("Failed to process audio")
    
    async def start_recording(self):
        """Start audio recording session"""
        try:
            if self.is_recording:
                return
            
            room = await self.get_room()
            if not room or room.status != 'active':
                await self.send_error("Room is not active for recording")
                return
            
            # Check if AI is currently streaming
            session_data = self.streaming_manager.get_session_data(self.room_id)
            if session_data and session_data.get('is_streaming_tts'):
                await self.send_error("Please wait for AI to finish speaking")
                return
            
            self.is_recording = True
            
            # Update Redis session
            self.streaming_manager.update_session_data(self.room_id, {
                'is_recording': True,
                'current_speaker': 'user'
            })
            
            # Notify room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'recording_started',
                    'user_id': self.user.id
                }
            )
            
            logger.info(f"Started recording for user {self.user.username} in room {self.room_id}")
            
        except Exception as e:
            logger.error(f"Error starting recording: {str(e)}")
            await self.send_error("Failed to start recording")
    
    async def stop_recording(self):
        """Stop recording - processing happens automatically in streaming manager"""
        try:
            if not self.is_recording:
                return
            
            self.is_recording = False
            
            # Update Redis session
            self.streaming_manager.update_session_data(self.room_id, {
                'is_recording': False,
                'current_speaker': None
            })
            
            # Send confirmation
            await self.send(text_data=json.dumps({
                'type': 'recording_stopped',
                'message': 'Processing your argument...'
            }))
            
            logger.info(f"Stopped recording for user {self.user.username} in room {self.room_id}")
            
        except Exception as e:
            logger.error(f"Error stopping recording: {str(e)}")
            await self.send_error("Failed to stop recording")
    
    async def start_debate(self):
        """Start the debate session"""
        try:
            room = await self.get_room()
            if not room:
                await self.send_error("Room not found")
                return
            
            # Update room status
            await self.update_room_status('active')
            
            # Update Redis session
            self.streaming_manager.update_session_data(self.room_id, {
                'status': 'active',
                'started_at': timezone.now().isoformat(),
                'current_turn': 'user'
            })
            
            # Notify room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'debate_started',
                    'room_id': self.room_id,
                    'current_turn': 'user'
                }
            )
            
            logger.info(f"Debate started in room {self.room_id}")
            
        except Exception as e:
            logger.error(f"Error starting debate: {str(e)}")
            await self.send_error("Failed to start debate")
    
    async def end_debate(self):
        """End the debate session"""
        try:
            # End session in Redis and database
            result = self.streaming_manager.end_debate_session(self.room_id)
            
            # Update room status in database
            await self.update_room_status('completed')
            
            # Notify room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'debate_ended',
                    'room_id': self.room_id,
                    'result': result
                }
            )
            
            logger.info(f"Debate ended in room {self.room_id}")
            
        except Exception as e:
            logger.error(f"Error ending debate: {str(e)}")
            await self.send_error("Failed to end debate")
    
    async def stop_ai_stream(self, stream_id: str):
        """Stop current AI audio stream"""
        try:
            # This would require adding a stop mechanism to the streaming manager
            # For now, just log the request
            logger.info(f"Stream stop requested for {stream_id} in room {self.room_id}")
            
            await self.send(text_data=json.dumps({
                'type': 'stream_stop_acknowledged',
                'stream_id': stream_id
            }))
            
        except Exception as e:
            logger.error(f"Error stopping AI stream: {str(e)}")
    
    async def send_room_status(self):
        """Send current room status to client"""
        try:
            room = await self.get_room()
            session_data = self.streaming_manager.get_session_data(self.room_id)
            
            status_data = {
                'type': 'room_status',
                'room_id': self.room_id,
                'status': room.status if room else 'unknown',
                'current_turn': session_data.get('current_turn') if session_data else None,
                'turn_number': session_data.get('turn_number', 1) if session_data else 1,
                'is_recording': session_data.get('is_recording', False) if session_data else False,
                'is_streaming_tts': session_data.get('is_streaming_tts', False) if session_data else False,
                'ai_speaker': room.ai_speaker if room else 'anushka',
                'language': room.language if room else 'en-IN'
            }
            
            await self.send(text_data=json.dumps(status_data))
            
        except Exception as e:
            logger.error(f"Error sending room status: {str(e)}")
    
    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': error_message,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def heartbeat_loop(self):
        """Maintain connection with periodic heartbeat"""
        try:
            while True:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                await self.send(text_data=json.dumps({
                    'type': 'heartbeat',
                    'timestamp': timezone.now().isoformat()
                }))
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Heartbeat error: {str(e)}")
    
    # Group message handlers for streaming
    async def recording_started(self, event):
        """Handle recording started notification"""
        await self.send(text_data=json.dumps({
            'type': 'recording_started',
            'user_id': event['user_id']
        }))
    
    async def ai_audio_stream_start(self, event):
        """Handle AI audio stream start notification"""
        await self.send(text_data=json.dumps({
            'type': 'ai_audio_stream_start',
            'stream_id': event['data']['stream_id'],
            'text': event['data']['text'],
            'estimated_duration': event['data']['estimated_duration'],
            'speaker': event['data']['speaker']
        }))
    
    async def ai_audio_chunk(self, event):
        """Handle streaming audio chunk from AI"""
        await self.send(text_data=json.dumps({
            'type': 'ai_audio_chunk',
            'stream_id': event['data']['stream_id'],
            'chunk_id': event['data']['chunk_id'],
            'audio_data': event['data']['audio_data'],
            'chunk_size': event['data'].get('chunk_size', 0),
            'is_final': event['data']['is_final'],
            'total_chunks': event['data'].get('total_chunks', 0),
            'timestamp': event['data'].get('timestamp')
        }))
    
    async def ai_audio_stream_error(self, event):
        """Handle AI audio stream error"""
        await self.send(text_data=json.dumps({
            'type': 'ai_audio_stream_error',
            'stream_id': event['data']['stream_id'],
            'error': event['data']['error']
        }))
    
    async def debate_started(self, event):
        """Handle debate started notification"""
        await self.send(text_data=json.dumps({
            'type': 'debate_started',
            'room_id': event['room_id'],
            'current_turn': event['current_turn']
        }))
    
    async def debate_ended(self, event):
        """Handle debate ended notification"""
        await self.send(text_data=json.dumps({
            'type': 'debate_ended',
            'room_id': event['room_id'],
            'result': event['result']
        }))
    
    # Database helpers
    @database_sync_to_async
    def get_room(self):
        """Get room from database"""
        try:
            return RealtimeDebateRoom.objects.get(id=self.room_id)
        except RealtimeDebateRoom.DoesNotExist:
            return None
    
    @database_sync_to_async
    def update_room_status(self, status):
        """Update room status in database"""
        try:
            room = RealtimeDebateRoom.objects.get(id=self.room_id)
            room.status = status
            if status == 'active' and not room.started_at:
                room.started_at = timezone.now()
            elif status == 'completed' and not room.ended_at:
                room.ended_at = timezone.now()
            room.save()
            return True
        except RealtimeDebateRoom.DoesNotExist:
            return False
    
    @database_sync_to_async
    def update_session_connection(self, is_connected):
        """Update session connection status"""
        try:
            room = RealtimeDebateRoom.objects.get(id=self.room_id)
            session_manager, created = RealtimeSessionManager.objects.get_or_create(
                room=room,
                defaults={
                    'redis_session_key': f"debate_session:{self.room_id}",
                    'websocket_channel': self.channel_name
                }
            )
            
            session_manager.is_connected = is_connected
            session_manager.websocket_channel = self.channel_name if is_connected else None
            if is_connected:
                session_manager.connection_count += 1
            session_manager.save()
            
            return True
        except Exception as e:
            logger.error(f"Error updating session connection: {str(e)}")
            return False
