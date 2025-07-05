from django.db import models
from django.contrib.auth.models import User

class DebateTopic(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced')
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    age_group = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_topics',
        null=True,  # Allow null for existing topics
        blank=True
    )
    
    def __str__(self):
        return f"{self.title} ({self.difficulty_level})"

class DebateSession(models.Model):
    SESSION_TYPES = [
        ('practice', 'Practice'),
        ('challenge', 'Challenge'),
        ('tournament', 'Tournament')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    topic = models.ForeignKey(DebateTopic, on_delete=models.CASCADE)
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default='practice')
    language = models.CharField(max_length=10, default='en-IN')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    final_score = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.topic.title}"

class Argument(models.Model):
    SPEAKER_CHOICES = [
        ('student', 'Student'),
        ('ai_opponent', 'AI Opponent')
    ]
    
    ARGUMENT_TYPES = [
        ('opening', 'Opening Statement'),
        ('rebuttal', 'Rebuttal'),
        ('counter_rebuttal', 'Counter Rebuttal'),
        ('closing', 'Closing Statement')
    ]
    
    session = models.ForeignKey(DebateSession, on_delete=models.CASCADE, related_name='arguments')
    speaker = models.CharField(max_length=20, choices=SPEAKER_CHOICES)
    content = models.TextField()
    argument_type = models.CharField(max_length=20, choices=ARGUMENT_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    quality_score = models.IntegerField(default=5, null=True, blank=True)
    feedback = models.TextField(blank=True)
    logical_fallacies = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.speaker} - {self.argument_type} ({self.session.id})"
