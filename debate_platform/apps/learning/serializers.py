# apps/learning/serializers.py
from rest_framework import serializers
from .models import (
    LearningCategory, LearningTopic, UserLearningProgress, 
    LearningAchievement, UserLearningAchievement, AIRecommendation
)

class LearningCategorySerializer(serializers.ModelSerializer):
    topics_count = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningCategory
        fields = ['id', 'name', 'description', 'icon', 'color', 'order', 'topics_count']
    
    def get_topics_count(self, obj):
        return obj.topics.filter(is_active=True).count()

class LearningTopicSerializer(serializers.ModelSerializer):
    category = LearningCategorySerializer(read_only=True)
    user_progress = serializers.SerializerMethodField()
    is_unlocked = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningTopic
        fields = [
            'id', 'title', 'description', 'content', 'content_type',
            'difficulty_level', 'estimated_duration', 'points_reward',
            'category', 'user_progress', 'is_unlocked', 'order'
        ]
    
    def get_user_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = UserLearningProgress.objects.get(user=request.user, topic=obj)
                return {
                    'status': progress.status,
                    'completion_percentage': progress.completion_percentage,
                    'time_spent': progress.time_spent,
                    'started_at': progress.started_at,
                    'completed_at': progress.completed_at
                }
            except UserLearningProgress.DoesNotExist:
                return {
                    'status': 'not_started',
                    'completion_percentage': 0,
                    'time_spent': 0,
                    'started_at': None,
                    'completed_at': None
                }
        return None
    
    def get_is_unlocked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check if all prerequisite topics are completed
            prerequisites = obj.prerequisite_topics.all()
            if not prerequisites.exists():
                return True
            
            completed_prerequisites = UserLearningProgress.objects.filter(
                user=request.user,
                topic__in=prerequisites,
                status='completed'
            ).count()
            
            return completed_prerequisites == prerequisites.count()
        return False

class UserLearningProgressSerializer(serializers.ModelSerializer):
    topic = LearningTopicSerializer(read_only=True)
    
    class Meta:
        model = UserLearningProgress
        fields = [
            'id', 'topic', 'status', 'completion_percentage', 
            'time_spent', 'attempts', 'best_score',
            'started_at', 'completed_at'
        ]

class LearningAchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningAchievement
        fields = [
            'id', 'name', 'description', 'achievement_type',
            'icon', 'badge_color', 'points_reward'
        ]

class UserLearningAchievementSerializer(serializers.ModelSerializer):
    achievement = LearningAchievementSerializer(read_only=True)
    
    class Meta:
        model = UserLearningAchievement
        fields = ['id', 'achievement', 'earned_at']

class AIRecommendationSerializer(serializers.ModelSerializer):
    recommended_topic = LearningTopicSerializer(read_only=True)
    
    class Meta:
        model = AIRecommendation
        fields = [
            'id', 'recommended_topic', 'recommendation_type',
            'reason', 'confidence_score', 'created_at'
        ]

class LearningPathSerializer(serializers.Serializer):
    """Serializer for AI-generated learning path response"""
    current_level = serializers.CharField()
    knowledge_state = serializers.DictField()
    next_topics = serializers.ListField()
    ai_recommendations = serializers.ListField()
    progress_stats = serializers.DictField()
    level_completion_percentage = serializers.FloatField()

class TopicCompletionSerializer(serializers.Serializer):
    """Serializer for topic completion request"""
    topic_id = serializers.IntegerField()
    time_spent = serializers.IntegerField(default=0)
    
class LearningDashboardSerializer(serializers.Serializer):
    """Serializer for learning dashboard data"""
    user_level = serializers.CharField()
    current_level_progress = serializers.DictField()
    recommended_topics = serializers.ListField()
    recent_achievements = UserLearningAchievementSerializer(many=True)
    learning_stats = serializers.DictField()
    categories = LearningCategorySerializer(many=True)
