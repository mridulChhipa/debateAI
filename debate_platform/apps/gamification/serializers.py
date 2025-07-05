# apps/gamification/serializers.py
from rest_framework import serializers
from .models import Achievement, UserAchievement, PointsHistory, UserLevel

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'

class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'earned_at']

class PointsHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsHistory
        fields = ['id', 'action', 'points_awarded', 'description', 'created_at']

class UserLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLevel
        fields = '__all__'

class GamificationStatsSerializer(serializers.Serializer):
    total_points = serializers.IntegerField()
    current_level = serializers.CharField()
    level_progress = serializers.FloatField()
    next_level = serializers.CharField()
    points_to_next_level = serializers.IntegerField()
    achievements_count = serializers.IntegerField()
    recent_achievements = UserAchievementSerializer(many=True)
    recent_points = PointsHistorySerializer(many=True)
