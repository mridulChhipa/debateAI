# apps/realtime_debate/api_views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import RealtimeDebateRoom, RealtimeDebateMessage
from .services import StreamingDebateManager
from debates.models import DebateTopic
import uuid
import logging

logger = logging.getLogger('realtime_debate')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_debate_room(request):
    """Create a new real-time debate room with streaming support"""
    try:
        topic_id = request.data.get('topic_id')
        user_stance = request.data.get('user_stance', 'for')
        language = request.data.get('language', 'en-IN')
        ai_speaker = request.data.get('ai_speaker', 'anushka')
        
        if not topic_id:
            return Response({
                'success': False,
                'error': 'topic_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate speaker choice
        valid_speakers = ['meera', 'anushka', 'krithika', 'karthik']
        if ai_speaker not in valid_speakers:
            ai_speaker = 'anushka'  # Default fallback
        
        # Get topic
        topic = get_object_or_404(DebateTopic, id=topic_id, created_by=request.user)
        
        # Determine AI stance (opposite of user)
        ai_stance = 'against' if user_stance == 'for' else 'for'
        
        # Create debate room
        room = RealtimeDebateRoom.objects.create(
            user=request.user,
            topic=topic,
            user_stance=user_stance,
            ai_stance=ai_stance,
            language=language,
            ai_speaker=ai_speaker,
            status='waiting'
        )
        
        # Initialize Redis session with streaming manager
        streaming_manager = StreamingDebateManager()
        session_result = streaming_manager.create_debate_session(str(room.id), request.user.id)
        
        if not session_result['success']:
            room.delete()
            return Response({
                'success': False,
                'error': 'Failed to initialize debate session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.info(f"Created streaming debate room {room.id} for user {request.user.username}")
        
        # Determine WebSocket URL based on environment
        websocket_protocol = 'wss' if request.is_secure() else 'ws'
        host = request.get_host().split(':')[0]  # Get hostname without port
        websocket_url = f'{websocket_protocol}://{host}:8000/ws/debate/{room.id}/'
        
        return Response({
            'success': True,
            'room': {
                'id': str(room.id),
                'topic': {
                    'id': topic.id,
                    'title': topic.title,
                    'description': topic.description
                },
                'user_stance': user_stance,
                'ai_stance': ai_stance,
                'language': language,
                'ai_speaker': ai_speaker,
                'status': room.status,
                'websocket_url': websocket_url,
                'streaming_enabled': True,
                'created_at': room.created_at.isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f'Error creating debate room: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to create debate room'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_debate_room(request, room_id):
    """Get debate room details with streaming info"""
    try:
        room = get_object_or_404(RealtimeDebateRoom, id=room_id, user=request.user)
        
        # Get recent messages with streaming info
        recent_messages = RealtimeDebateMessage.objects.filter(
            room=room
        ).order_by('-timestamp')[:10]
        
        # Get streaming manager for session data
        streaming_manager = StreamingDebateManager()
        session_data = streaming_manager.get_session_data(str(room.id))
        
        # Determine WebSocket URL
        websocket_protocol = 'wss' if request.is_secure() else 'ws'
        host = request.get_host()
        websocket_url = f'{websocket_protocol}://{host}/ws/debate/{room.id}/'
        
        return Response({
            'success': True,
            'room': {
                'id': str(room.id),
                'topic': {
                    'id': room.topic.id,
                    'title': room.topic.title,
                    'description': room.topic.description
                },
                'user_stance': room.user_stance,
                'ai_stance': room.ai_stance,
                'language': room.language,
                'ai_speaker': room.ai_speaker,
                'status': room.status,
                'current_turn': room.current_turn,
                'turn_number': room.turn_number,
                'duration': room.duration,
                'is_streaming_active': room.is_streaming_active,
                'created_at': room.created_at.isoformat(),
                'started_at': room.started_at.isoformat() if room.started_at else None,
                'websocket_url': websocket_url,
                'streaming_enabled': True
            },
            'session_data': session_data,
            'recent_messages': [
                {
                    'id': msg.id,
                    'speaker': msg.speaker,
                    'text': msg.text_content,
                    'timestamp': msg.timestamp.isoformat(),
                    'turn_number': msg.turn_number,
                    'is_streamed': msg.is_streamed,
                    'streaming_completed': msg.streaming_completed,
                    'stream_chunk_count': msg.stream_chunk_count,
                    'processing_time': msg.processing_time
                } for msg in reversed(recent_messages)
            ]
        })
        
    except Exception as e:
        logger.error(f'Error getting debate room: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to get debate room'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_debate_rooms(request):
    """List user's debate rooms with streaming info"""
    try:
        rooms = RealtimeDebateRoom.objects.filter(
            user=request.user
        ).order_by('-created_at')[:20]
        
        return Response({
            'success': True,
            'rooms': [
                {
                    'id': str(room.id),
                    'topic_title': room.topic.title,
                    'status': room.status,
                    'user_stance': room.user_stance,
                    'ai_stance': room.ai_stance,
                    'ai_speaker': room.ai_speaker,
                    'language': room.language,
                    'duration': room.duration,
                    'turn_number': room.turn_number,
                    'total_user_arguments': room.total_arguments_user,
                    'total_ai_arguments': room.total_arguments_ai,
                    'is_streaming_active': room.is_streaming_active,
                    'created_at': room.created_at.isoformat(),
                    'started_at': room.started_at.isoformat() if room.started_at else None,
                    'ended_at': room.ended_at.isoformat() if room.ended_at else None
                } for room in rooms
            ]
        })
        
    except Exception as e:
        logger.error(f'Error listing debate rooms: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to list debate rooms'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_streaming_tts(request):
    """Test endpoint for streaming TTS functionality"""
    try:
        text = request.data.get('text', 'Hello, this is a test of the streaming text to speech system.')
        language = request.data.get('language', 'en-IN')
        speaker = request.data.get('speaker', 'anushka')
        
        # Create a test room or use existing one
        room_id = request.data.get('room_id')
        if room_id:
            room = get_object_or_404(RealtimeDebateRoom, id=room_id, user=request.user)
        else:
            return Response({
                'success': False,
                'error': 'room_id is required for testing'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Start streaming test
        streaming_manager = StreamingDebateManager()
        import asyncio
        
        async def test_stream():
            await streaming_manager._stream_ai_response(
                str(room.id), text, language, speaker, 
                f"test_stream_{int(time.time())}", 0
            )
        
        # Run the streaming test
        import time
        asyncio.create_task(test_stream())
        
        return Response({
            'success': True,
            'message': 'Streaming TTS test started',
            'text': text,
            'language': language,
            'speaker': speaker,
            'room_id': str(room.id)
        })
        
    except Exception as e:
        logger.error(f'Error testing streaming TTS: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to test streaming TTS'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
