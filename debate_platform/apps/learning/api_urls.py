# apps/learning/api_urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .api_views import (
    LearningCategoryViewSet, LearningTopicViewSet,
    learning_dashboard, complete_topic, personalized_learning_path,
    user_progress, user_achievements
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'categories', LearningCategoryViewSet, basename='learning-category')
router.register(r'topics', LearningTopicViewSet, basename='learning-topic')

# URL patterns
urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Custom API endpoints
    path('dashboard/', learning_dashboard, name='learning-dashboard'),
    path('complete-topic/', complete_topic, name='learning-complete-topic'),  # Updated name
    path('learning-path/', personalized_learning_path, name='learning-path'),
    path('progress/', user_progress, name='learning-user-progress'),  # Updated name
    path('achievements/', user_achievements, name='learning-user-achievements'),  # Updated name
]
