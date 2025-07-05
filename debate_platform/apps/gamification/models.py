# apps/gamification/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Achievement(models.Model):
    ACHIEVEMENT_TYPES = [
        ('debate', 'Debate Achievement'),
        ('points', 'Points Achievement'),
        ('streak', 'Streak Achievement'),
        ('skill', 'Skill Achievement'),
        ('level', 'Level Achievement'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='fas fa-trophy')
    achievement_type = models.CharField(max_length=20, choices=ACHIEVEMENT_TYPES, default='debate')
    points_required = models.IntegerField(default=0)
    debates_required = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'achievement')
    
    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"

class PointsHistory(models.Model):
    ACTION_TYPES = [
        ('argument_submitted', 'Argument Submitted'),
        ('debate_completed', 'Debate Completed'),
        ('high_quality_argument', 'High Quality Argument'),
        ('fallacy_avoided', 'Fallacy Avoided'),
        ('voice_debate', 'Voice Debate'),
        ('multilingual_debate', 'Multilingual Debate'),
        ('achievement_unlocked', 'Achievement Unlocked'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='points_history')
    action = models.CharField(max_length=30, choices=ACTION_TYPES)
    points_awarded = models.IntegerField()
    description = models.CharField(max_length=200, blank=True)
    debate_session = models.ForeignKey('debates.DebateSession', on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.action} (+{self.points_awarded})"

class UserLevel(models.Model):
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
        ('master', 'Master'),
    ]
    
    level_name = models.CharField(max_length=20, choices=LEVEL_CHOICES, unique=True)
    min_points = models.IntegerField()
    max_points = models.IntegerField()
    level_number = models.IntegerField(unique=True)
    badge_color = models.CharField(max_length=20, default='blue')
    perks = models.TextField(blank=True, help_text="Comma-separated list of perks")
    
    class Meta:
        ordering = ['level_number']
    
    def __str__(self):
        return f"Level {self.level_number}: {self.level_name}"
