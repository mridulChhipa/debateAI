from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .api_views import (
    DebateTopicViewSet, 
    DebateSessionViewSet, 
    ArgumentViewSet, 
    RecentSessionsView, 
    voice_debate_view, 
    validate_audio_upload, 
    text_debate_view, 
    complete_debate_session,
    create_debate_topic,
)
router = DefaultRouter()
router.register(r'debate-topics', DebateTopicViewSet, basename='debate-topic')
router.register(r'debate-session', DebateSessionViewSet, basename='debate-session')

sessions_router = NestedDefaultRouter(router, r'debate-session', lookup='session')
sessions_router.register(r'arguments', ArgumentViewSet, basename='session-arguments')

urlpatterns = router.urls + sessions_router.urls + [
    path('recent-sessions/', RecentSessionsView.as_view(), name='recent-sessions'),
    path('voice-debate/', voice_debate_view, name='voice-debate'),
    path('text-debate/', text_debate_view, name='text-debate'),
    path('validate-audio/', validate_audio_upload, name='validate-audio'),
    path('complete-session/<int:session_id>/', complete_debate_session, name='complete-session'),
    path('create-topic/', create_debate_topic, name='create-topic'),
]
