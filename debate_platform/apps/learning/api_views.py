# apps/learning/api_views.py
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated  # Add this line
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    LearningCategory, LearningTopic, UserLearningProgress,
    LearningAchievement, UserLearningAchievement
)
from .serializers import (
    LearningCategorySerializer, LearningTopicSerializer,
    UserLearningProgressSerializer, LearningAchievementSerializer,
    UserLearningAchievementSerializer, LearningPathSerializer,
    TopicCompletionSerializer, LearningDashboardSerializer
)
from .services import AILearningEngine
import logging

logger = logging.getLogger('learning')

class LearningCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for learning categories"""
    queryset = LearningCategory.objects.filter(is_active=True)
    serializer_class = LearningCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class LearningTopicViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for learning topics"""
    serializer_class = LearningTopicSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = LearningTopic.objects.filter(is_active=True)
        
        # Filter by difficulty level if specified
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(difficulty_level=level)
        
        # Filter by category if specified
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        return queryset.select_related('category').prefetch_related('prerequisite_topics')
    
    @action(detail=True, methods=['post'])
    def start_topic(self, request, pk=None):
        """Start learning a topic"""
        topic = self.get_object()
        
        # Check if topic is unlocked
        serializer = self.get_serializer(topic)
        if not serializer.get_is_unlocked(topic):
            return Response({
                'success': False,
                'error': 'Topic is locked. Complete prerequisite topics first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update progress
        progress, created = UserLearningProgress.objects.get_or_create(
            user=request.user,
            topic=topic,
            defaults={'status': 'in_progress', 'started_at': timezone.now()}
        )
        
        if not created and progress.status == 'not_started':
            progress.status = 'in_progress'
            progress.started_at = timezone.now()
            progress.save()
        
        return Response({
            'success': True,
            'message': 'Topic started successfully',
            'progress': UserLearningProgressSerializer(progress).data
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def learning_dashboard(request):
    """Get comprehensive learning dashboard data"""
    try:
        ai_engine = AILearningEngine()
        
        # Get personalized learning path
        learning_path = ai_engine.get_personalized_learning_path(request.user)

        logger.info(f"Learning path result: {learning_path.get('success', False)}")
        logger.info(f"Recommended topics count: {len(learning_path.get('next_topics', []))}")
        
        if not learning_path['success']:
            return Response({
                'success': False,
                'error': learning_path.get('error', 'Failed to generate learning path')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Get user's recent achievements
        recent_achievements = UserLearningAchievement.objects.filter(
            user=request.user
        ).order_by('-earned_at')[:5]
        
        # Get learning categories
        categories = LearningCategory.objects.filter(is_active=True)
        
        dashboard_data = {
            'user_level': learning_path['current_level'],
            'current_level_progress': learning_path['progress_stats'],
            'recommended_topics': learning_path['next_topics'],
            'recent_achievements': UserLearningAchievementSerializer(recent_achievements, many=True).data,
            'learning_stats': {
                'total_time_spent': learning_path['progress_stats'].get('total_time_spent', 0),
                'level_completion': learning_path['level_completion_percentage'],
                'topics_completed': learning_path['progress_stats'].get('completed_topics', 0),
                'knowledge_gaps': learning_path['knowledge_state'].get('knowledge_gaps', [])
            },
            'categories': LearningCategorySerializer(categories, many=True, context={'request': request}).data,
            'ai_recommendations': learning_path['ai_recommendations']
        }

        logger.info(f"Final dashboard data - topics: {len(dashboard_data['recommended_topics'])}")
        
        return Response({
            'success': True,
            'data': dashboard_data
        })
        
    except Exception as e:
        logger.error(f'Error generating learning dashboard: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to load learning dashboard'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_topic(request):
    """Mark a learning topic as completed"""
    try:
        serializer = TopicCompletionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        topic_id = serializer.validated_data['topic_id']
        time_spent = serializer.validated_data.get('time_spent', 0)
        
        ai_engine = AILearningEngine()
        result = ai_engine.complete_topic(request.user, topic_id)
        
        if result['success']:
            # Update time spent if provided
            if time_spent > 0:
                progress = UserLearningProgress.objects.get(
                    user=request.user, 
                    topic_id=topic_id
                )
                progress.time_spent += time_spent
                progress.save()
            
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f'Error completing topic: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to complete topic'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def personalized_learning_path(request):
    """Get AI-generated personalized learning path"""
    try:
        ai_engine = AILearningEngine()
        learning_path = ai_engine.get_personalized_learning_path(request.user)
        
        if learning_path['success']:
            return Response({
                'success': True,
                'data': learning_path
            })
        else:
            return Response({
                'success': False,
                'error': learning_path.get('error', 'Failed to generate learning path')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f'Error generating learning path: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to generate learning path'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_progress(request):
    """Get user's learning progress across all topics"""
    try:
        level = request.query_params.get('level')
        category = request.query_params.get('category')
        
        progress_qs = UserLearningProgress.objects.filter(user=request.user)
        
        if level:
            progress_qs = progress_qs.filter(topic__difficulty_level=level)
        
        if category:
            progress_qs = progress_qs.filter(topic__category_id=category)
        
        progress_data = UserLearningProgressSerializer(
            progress_qs.select_related('topic', 'topic__category'), 
            many=True,
            context={'request': request}
        ).data
        
        return Response({
            'success': True,
            'progress': progress_data
        })
        
    except Exception as e:
        logger.error(f'Error fetching user progress: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to fetch progress'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_achievements(request):
    """Get user's learning achievements"""
    try:
        achievements = UserLearningAchievement.objects.filter(
            user=request.user
        ).select_related('achievement').order_by('-earned_at')
        
        return Response({
            'success': True,
            'achievements': UserLearningAchievementSerializer(achievements, many=True).data
        })
        
    except Exception as e:
        logger.error(f'Error fetching user achievements: {str(e)}')
        return Response({
            'success': False,
            'error': 'Failed to fetch achievements'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
