# apps/gamification/api_views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Achievement, UserAchievement, PointsHistory
from .serializers import (
    AchievementSerializer, 
    UserAchievementSerializer, 
    PointsHistorySerializer,
    GamificationStatsSerializer
)
from .services import GamificationEngine
import logging

logger = logging.getLogger('gamification')

class UserAchievementsView(generics.ListAPIView):
    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserAchievement.objects.filter(
            user=self.request.user
        ).order_by('-earned_at')

class UserPointsHistoryView(generics.ListAPIView):
    serializer_class = PointsHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PointsHistory.objects.filter(
            user=self.request.user
        ).order_by('-created_at')

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def gamification_stats(request):
    """Get comprehensive gamification stats for the authenticated user"""
    try:
        stats = GamificationEngine.get_user_stats(request.user)
        if stats:
            serializer = GamificationStatsSerializer(stats)
            return Response(serializer.data)
        else:
            return Response(
                {'error': 'Unable to fetch gamification stats'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    except Exception as e:
        logger.error(f'Error in gamification_stats view: {str(e)}')
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def award_points_view(request):
    """Award points to user (for testing or admin purposes)"""
    try:
        action = request.data.get('action')
        points = request.data.get('points')
        description = request.data.get('description', '')
        
        if not action:
            return Response(
                {'error': 'Action is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = GamificationEngine.award_points(
            user=request.user,
            action=action,
            points_override=points,
            description=description
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f'Error in award_points_view: {str(e)}')
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
