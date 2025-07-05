from django.contrib import admin

# apps/gamification/admin.py
# from django.contrib import admin
# from .models import Achievement, UserAchievement, PointsHistory, UserLevel

# @admin.register(Achievement)
# class AchievementAdmin(admin.ModelAdmin):
#     list_display = ['name', 'achievement_type', 'points_required', 'debates_required', 'is_active']
#     list_filter = ['achievement_type', 'is_active']
#     search_fields = ['name', 'description']

# @admin.register(UserAchievement)
# class UserAchievementAdmin(admin.ModelAdmin):
#     list_display = ['user', 'achievement', 'earned_at']
#     list_filter = ['achievement', 'earned_at']
#     search_fields = ['user__username', 'achievement__name']

# @admin.register(PointsHistory)
# class PointsHistoryAdmin(admin.ModelAdmin):
#     list_display = ['user', 'action', 'points_awarded', 'created_at']
#     list_filter = ['action', 'created_at']
#     search_fields = ['user__username']

# @admin.register(UserLevel)
# class UserLevelAdmin(admin.ModelAdmin):
#     list_display = ['level_number', 'level_name', 'min_points', 'max_points', 'badge_color']
#     ordering = ['level_number']
