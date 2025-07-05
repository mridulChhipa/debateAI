from django.contrib.auth.models import User
from django.db import transaction
from .models import Achievement, UserAchievement, PointsHistory, UserLevel
from authentication.models import UserProfile
import logging

logger = logging.getLogger('gamification')

class GamificationEngine:
    """Handle points, levels, achievements, and gamification logic"""
    
    POINTS_CONFIG = {
        'argument_submitted': 10,
        'debate_completed': 50,
        'high_quality_argument': 25,  # Score > 7
        'fallacy_avoided': 15,
        'voice_debate': 20,
        'multilingual_debate': 30,
        'achievement_unlocked': 100,
    }
    
    @classmethod
    @transaction.atomic
    def award_points(cls, user, action, points_override=None, description="", debate_session=None):
        """Award points for user actions and handle level progression"""
        try:
            points = points_override or cls.POINTS_CONFIG.get(action, 0)
            
            # Create points history record
            points_record = PointsHistory.objects.create(
                user=user,
                action=action,
                points_awarded=points,
                description=description,
                debate_session=debate_session
            )
            
            # Update user profile
            profile = user.userprofile
            old_total = profile.total_points
            profile.total_points += points
            
            # Check for level up
            old_level = profile.current_level
            new_level_info = cls.calculate_level(profile.total_points)
            new_level = new_level_info['level_name']
            
            level_up = False
            if new_level != old_level:
                profile.current_level = new_level
                level_up = True
                
                # Award level achievement
                cls.check_level_achievements(user, new_level_info['level_number'])
                
                logger.info(f'User {user.username} leveled up from {old_level} to {new_level}')
            
            profile.save()
            
            # Check for other achievements
            new_achievements = cls.check_achievements(user, action, profile.total_points)
            
            return {
                'success': True,
                'points_awarded': points,
                'total_points': profile.total_points,
                'level_up': level_up,
                'old_level': old_level,
                'new_level': new_level,
                'new_achievements': new_achievements,
                'points_record_id': points_record.id
            }
            
        except Exception as e:
            logger.error(f'Error awarding points to {user.username}: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def calculate_level(cls, total_points):
        """Calculate user level based on total points"""
        try:
            level = UserLevel.objects.filter(
                min_points__lte=total_points,
                max_points__gte=total_points
            ).first()
            
            if level:
                return {
                    'level_name': level.level_name,
                    'level_number': level.level_number,
                    'min_points': level.min_points,
                    'max_points': level.max_points,
                    'badge_color': level.badge_color
                }
            else:
                # Default to beginner if no level found
                return {
                    'level_name': 'beginner',
                    'level_number': 1,
                    'min_points': 0,
                    'max_points': 499,
                    'badge_color': 'gray'
                }
        except Exception as e:
            logger.error(f'Error calculating level: {str(e)}')
            return {
                'level_name': 'beginner',
                'level_number': 1,
                'min_points': 0,
                'max_points': 499,
                'badge_color': 'gray'
            }
    
    @classmethod
    def check_achievements(cls, user, action, total_points):
        """Check and award achievements based on user actions and stats"""
        new_achievements = []
        
        try:
            # Get achievements user hasn't earned yet
            earned_achievement_ids = UserAchievement.objects.filter(
                user=user
            ).values_list('achievement_id', flat=True)
            
            available_achievements = Achievement.objects.filter(
                is_active=True
            ).exclude(id__in=earned_achievement_ids)
            
            # Check points-based achievements
            points_achievements = available_achievements.filter(
                achievement_type='points',
                points_required__lte=total_points
            )
            
            for achievement in points_achievements:
                user_achievement = UserAchievement.objects.create(
                    user=user,
                    achievement=achievement
                )
                new_achievements.append(achievement)
                
                # Award bonus points for achievement
                cls.award_points(user, 'achievement_unlocked', 
                               description=f"Unlocked: {achievement.name}")
            
            # Check debate-based achievements
            profile = user.userprofile
            debate_achievements = available_achievements.filter(
                achievement_type='debate',
                debates_required__lte=profile.debates_completed
            )
            
            for achievement in debate_achievements:
                user_achievement = UserAchievement.objects.create(
                    user=user,
                    achievement=achievement
                )
                new_achievements.append(achievement)
                
        except Exception as e:
            logger.error(f'Error checking achievements for {user.username}: {str(e)}')
        
        return new_achievements
    
    @classmethod
    def check_level_achievements(cls, user, level_number):
        """Award level-based achievements"""
        try:
            level_achievements = Achievement.objects.filter(
                achievement_type='level',
                points_required=level_number,
                is_active=True
            )
            
            for achievement in level_achievements:
                user_achievement, created = UserAchievement.objects.get_or_create(
                    user=user,
                    achievement=achievement
                )
                if created:
                    logger.info(f'Level achievement awarded: {achievement.name} to {user.username}')
                    
        except Exception as e:
            logger.error(f'Error checking level achievements: {str(e)}')
    
    @classmethod
    def get_user_stats(cls, user):
        """Get comprehensive gamification stats for a user"""
        try:
            profile = user.userprofile
            current_level_info = cls.calculate_level(profile.total_points)
            
            # Calculate next level info
            next_level = UserLevel.objects.filter(
                level_number__gt=current_level_info['level_number']
            ).first()
            
            if next_level:
                points_to_next = next_level.min_points - profile.total_points
                progress = (profile.total_points - current_level_info['min_points']) / (next_level.min_points - current_level_info['min_points'])
            else:
                points_to_next = 0
                progress = 1.0
            
            # Get recent achievements and points
            recent_achievements = UserAchievement.objects.filter(
                user=user
            ).order_by('-earned_at')[:5]
            
            recent_points = PointsHistory.objects.filter(
                user=user
            ).order_by('-created_at')[:10]
            
            return {
                'total_points': profile.total_points,
                'current_level': current_level_info['level_name'],
                'level_progress': progress,
                'next_level': next_level.level_name if next_level else 'Max Level',
                'points_to_next_level': max(0, points_to_next),
                'achievements_count': UserAchievement.objects.filter(user=user).count(),
                'recent_achievements': recent_achievements,
                'recent_points': recent_points,
            }
            
        except Exception as e:
            logger.error(f'Error getting user stats for {user.username}: {str(e)}')
            return None
