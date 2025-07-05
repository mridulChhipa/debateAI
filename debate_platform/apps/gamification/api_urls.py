# apps/gamification/api_urls.py
from django.urls import path
from .api_views import (
    UserAchievementsView,
    UserPointsHistoryView,
    gamification_stats,
    award_points_view
)

urlpatterns = [
    path('achievements/', UserAchievementsView.as_view(), name='user-achievements'),
    path('points-history/', UserPointsHistoryView.as_view(), name='points-history'),
    path('stats/', gamification_stats, name='gamification-stats'),
    path('award-points/', award_points_view, name='award-points'),
]
