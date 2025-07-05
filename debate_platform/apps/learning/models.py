# apps/learning/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class LearningCategory(models.Model):
    """Categories for organizing learning content (e.g., Argumentation, Logic, Rhetoric)"""
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='book-open')
    color = models.CharField(max_length=20, default='blue')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = "Learning Categories"
    
    def __str__(self):
        return self.name

class LearningTopic(models.Model):
    """Individual learning topics within categories"""
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced')
    ]
    
    CONTENT_TYPES = [
        ('text', 'Text Content'),
        ('video', 'Video'),
        ('interactive', 'Interactive Exercise'),
        ('quiz', 'Quiz'),
        ('practice', 'Practice Session')
    ]
    
    category = models.ForeignKey(LearningCategory, on_delete=models.CASCADE, related_name='topics')
    title = models.CharField(max_length=200)
    description = models.TextField()
    content = models.TextField()  # Main learning content
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='text')
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    prerequisite_topics = models.ManyToManyField('self', blank=True, symmetrical=False)
    estimated_duration = models.IntegerField(default=15)  # in minutes
    points_reward = models.IntegerField(default=10)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['difficulty_level', 'order', 'title']
    
    def __str__(self):
        return f"{self.title} ({self.difficulty_level})"

class UserLearningProgress(models.Model):
    """Track user's progress through learning topics"""
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('mastered', 'Mastered')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_progress')
    topic = models.ForeignKey(LearningTopic, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    completion_percentage = models.IntegerField(default=0)
    time_spent = models.IntegerField(default=0)  # in minutes
    attempts = models.IntegerField(default=0)
    best_score = models.IntegerField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('user', 'topic')
    
    def __str__(self):
        return f"{self.user.username} - {self.topic.title} ({self.status})"

class LearningAchievement(models.Model):
    """Achievements for learning milestones"""
    ACHIEVEMENT_TYPES = [
        ('level_completion', 'Level Completion'),
        ('category_mastery', 'Category Mastery'),
        ('streak', 'Learning Streak'),
        ('speed', 'Speed Learning'),
        ('perfectionist', 'Perfect Scores')
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    achievement_type = models.CharField(max_length=20, choices=ACHIEVEMENT_TYPES)
    icon = models.CharField(max_length=50, default='trophy')
    badge_color = models.CharField(max_length=20, default='gold')
    points_reward = models.IntegerField(default=50)
    criteria = models.JSONField(default=dict)  # Flexible criteria storage
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class UserLearningAchievement(models.Model):
    """Track user's earned learning achievements"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_achievements')
    achievement = models.ForeignKey(LearningAchievement, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'achievement')
    
    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"

class AIRecommendation(models.Model):
    """Store AI-generated learning recommendations"""
    RECOMMENDATION_TYPES = [
        ('next_topic', 'Next Topic'),
        ('review', 'Review Topic'),
        ('challenge', 'Challenge Topic'),
        ('prerequisite', 'Missing Prerequisite')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_recommendations')
    recommended_topic = models.ForeignKey(LearningTopic, on_delete=models.CASCADE)
    recommendation_type = models.CharField(max_length=20, choices=RECOMMENDATION_TYPES)
    reason = models.TextField()
    confidence_score = models.FloatField(default=0.8)
    is_accepted = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"AI Rec for {self.user.username}: {self.recommended_topic.title}"

