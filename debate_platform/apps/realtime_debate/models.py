# apps/realtime_debate/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class RealtimeDebateRoom(models.Model):
    """Real-time debate room for student vs AI"""
    
    ROOM_STATUS_CHOICES = [
        ('waiting', 'Waiting to Start'),
        ('active', 'Active Debate'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('error', 'Error State')
    ]
    
    STANCE_CHOICES = [
        ('for', 'For'),
        ('against', 'Against')
    ]
    
    SPEAKER_CHOICES = [
        ('meera', 'Meera'),
        ('anushka', 'Anushka'),
        ('krithika', 'Krithika'),
        ('karthik', 'Karthik')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='realtime_debate_rooms')
    topic = models.ForeignKey('debates.DebateTopic', on_delete=models.CASCADE)
    user_stance = models.CharField(max_length=20, choices=STANCE_CHOICES)
    ai_stance = models.CharField(max_length=20, choices=STANCE_CHOICES)
    
    status = models.CharField(max_length=20, choices=ROOM_STATUS_CHOICES, default='waiting')
    language = models.CharField(max_length=10, default='en-IN')
    ai_speaker = models.CharField(max_length=20, choices=SPEAKER_CHOICES, default='anushka')
    
    # Session Management
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # Debate Configuration
    max_duration = models.IntegerField(default=1800)  # 30 minutes
    turn_duration = models.IntegerField(default=120)  # 2 minutes per turn
    current_turn = models.CharField(max_length=20, choices=[('user', 'User'), ('ai', 'AI')], default='user')
    turn_number = models.IntegerField(default=1)
    
    # Analytics
    total_user_speaking_time = models.IntegerField(default=0)  # seconds
    total_ai_speaking_time = models.IntegerField(default=0)  # seconds
    total_arguments_user = models.IntegerField(default=0)
    total_arguments_ai = models.IntegerField(default=0)
    
    # Streaming specific fields
    is_streaming_active = models.BooleanField(default=False)
    current_stream_id = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return f"Debate Room {self.id} - {self.user.username} vs AI"
    
    @property
    def duration(self):
        if self.started_at and self.ended_at:
            return (self.ended_at - self.started_at).total_seconds()
        elif self.started_at:
            return (timezone.now() - self.started_at).total_seconds()
        return 0
    
    @property
    def is_active(self):
        return self.status == 'active'

class RealtimeDebateMessage(models.Model):
    """Individual messages/turns in a real-time debate"""
    
    MESSAGE_TYPES = [
        ('argument', 'Argument'),
        ('rebuttal', 'Rebuttal'),
        ('opening', 'Opening Statement'),
        ('closing', 'Closing Statement'),
        ('system', 'System Message')
    ]
    
    SPEAKER_CHOICES = [
        ('user', 'User'),
        ('ai', 'AI Assistant'),
        ('system', 'System')
    ]
    
    room = models.ForeignKey(RealtimeDebateRoom, on_delete=models.CASCADE, related_name='messages')
    speaker = models.CharField(max_length=20, choices=SPEAKER_CHOICES)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    
    # Content
    text_content = models.TextField()
    audio_duration = models.FloatField(null=True, blank=True)  # seconds
    
    # Streaming specific fields
    is_streamed = models.BooleanField(default=False)
    stream_chunk_count = models.IntegerField(default=0)
    streaming_completed = models.BooleanField(default=True)
    
    # Metadata
    turn_number = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    processing_time = models.FloatField(null=True, blank=True)  # AI response time
    
    # Analysis (for AI messages)
    confidence_score = models.FloatField(null=True, blank=True)
    argument_quality = models.IntegerField(null=True, blank=True)  # 1-10 scale
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.speaker} - Turn {self.turn_number} ({self.room.id})"

class RealtimeSessionManager(models.Model):
    """Session management for Redis and connection tracking"""
    
    room = models.OneToOneField(RealtimeDebateRoom, on_delete=models.CASCADE, related_name='session_manager')
    websocket_channel = models.CharField(max_length=100, null=True, blank=True)
    redis_session_key = models.CharField(max_length=100, unique=True)
    is_connected = models.BooleanField(default=False)
    connection_count = models.IntegerField(default=0)
    last_ping = models.DateTimeField(auto_now=True)
    
    # Audio Stream Management
    is_recording = models.BooleanField(default=False)
    is_playing_ai_response = models.BooleanField(default=False)
    current_audio_chunk_id = models.CharField(max_length=50, null=True, blank=True)
    
    # Streaming TTS Management
    is_streaming_tts = models.BooleanField(default=False)
    current_stream_session = models.CharField(max_length=100, null=True, blank=True)
    stream_chunks_sent = models.IntegerField(default=0)
    
    def __str__(self):
        return f"Session for {self.room.id}"

class AudioStreamChunk(models.Model):
    """Track individual audio stream chunks for debugging and analytics"""
    
    room = models.ForeignKey(RealtimeDebateRoom, on_delete=models.CASCADE, related_name='audio_chunks')
    message = models.ForeignKey(RealtimeDebateMessage, on_delete=models.CASCADE, related_name='audio_chunks')
    chunk_number = models.IntegerField()
    chunk_size = models.IntegerField()  # Size in bytes
    timestamp = models.DateTimeField(auto_now_add=True)
    processing_time = models.FloatField(null=True, blank=True)  # Time to generate chunk
    
    class Meta:
        ordering = ['chunk_number']
        unique_together = ('message', 'chunk_number')
    
    def __str__(self):
        return f"Chunk {self.chunk_number} for {self.message}"
