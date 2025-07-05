# apps/learning/services.py
from django.db import models
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from apps.sarvam_integration.services import SarvamAIService
from gamification.services import GamificationEngine
from .models import (
    LearningTopic, UserLearningProgress, LearningAchievement, 
    UserLearningAchievement, AIRecommendation, LearningCategory
)
import logging
from typing import Dict, List, Any
import json

logger = logging.getLogger('learning')

class AILearningEngine:
    """AI-powered learning recommendation and progression system"""
    
    def __init__(self):
        self.sarvam_service = SarvamAIService()
    
    @transaction.atomic
    def get_personalized_learning_path(self, user: User) -> Dict[str, Any]:
        """
        Generate a personalized learning path for the user based on their current level and progress
        """
        try:
            # Get user's current level from profile
            user_profile = user.userprofile
            current_level = user_profile.current_level
            
            # Get user's learning progress
            completed_topics = UserLearningProgress.objects.filter(
                user=user, 
                status='completed'
            ).select_related('topic')
            
            # Analyze current knowledge state
            knowledge_state = self._analyze_user_knowledge(user, current_level, completed_topics)
            
            # Generate AI recommendations
            ai_recommendations = self._generate_ai_recommendations(user, knowledge_state)
            
            # Get next recommended topics
            next_topics = self._get_next_topics(user, current_level, ai_recommendations)
            
            # Calculate progress statistics
            progress_stats = self._calculate_progress_stats(user, current_level)
            
            return {
                'success': True,
                'current_level': current_level,
                'knowledge_state': knowledge_state,
                'next_topics': next_topics,
                'ai_recommendations': ai_recommendations,
                'progress_stats': progress_stats,
                'level_completion_percentage': self._calculate_level_completion(user, current_level)
            }
            
        except Exception as e:
            logger.error(f'Error generating learning path for user {user.username}: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def _analyze_user_knowledge(self, user: User, current_level: str, completed_topics) -> Dict[str, Any]:
        """Analyze what the user has learned and their knowledge gaps"""
        
        # Map user level to assumed prior knowledge
        level_mapping = {
            'beginner': [],
            'intermediate': ['beginner'],
            'advanced': ['beginner', 'intermediate']
        }
        
        # Get topics user should know based on their level
        assumed_levels = level_mapping.get(current_level, [])
        assumed_topics = LearningTopic.objects.filter(
            difficulty_level__in=assumed_levels,
            is_active=True
        ) if assumed_levels else LearningTopic.objects.none()
        
        # Get actually completed topics
        completed_topic_ids = [progress.topic.id for progress in completed_topics]
        
        # Categorize knowledge
        categories_progress = {}
        for category in LearningCategory.objects.filter(is_active=True):
            category_topics = LearningTopic.objects.filter(
                category=category,
                difficulty_level=current_level,
                is_active=True
            )
            
            completed_in_category = [
                topic for topic in category_topics 
                if topic.id in completed_topic_ids
            ]
            
            categories_progress[category.name] = {
                'total': category_topics.count(),
                'completed': len(completed_in_category),
                'percentage': (len(completed_in_category) / category_topics.count() * 100) if category_topics.count() > 0 else 0
            }
        
        return {
            'current_level': current_level,
            'assumed_prior_knowledge': assumed_levels,
            'completed_topics_count': len(completed_topics),
            'categories_progress': categories_progress,
            'knowledge_gaps': self._identify_knowledge_gaps(user, current_level)
        }
    
    def _generate_ai_recommendations(self, user: User, knowledge_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Use Sarvam AI to generate personalized learning recommendations"""
        
        try:
            # Prepare context for AI
            context = f"""
            User Learning Profile:
            - Current Level: {knowledge_state['current_level']}
            - Completed Topics: {knowledge_state['completed_topics_count']}
            - Category Progress: {json.dumps(knowledge_state['categories_progress'], indent=2)}
            
            Learning Categories Available:
            1. Argumentation Structure - Building logical arguments
            2. Evidence and Research - Finding and using credible sources
            3. Logical Fallacies - Identifying and avoiding reasoning errors
            4. Rhetoric and Persuasion - Effective communication techniques
            5. Critical Thinking - Analyzing and evaluating arguments
            6. Debate Formats - Understanding different debate styles
            """
            
            questions = [
                {
                    "id": "recommendations",
                    "text": "Based on this user's learning profile, recommend the next 3-5 learning topics they should focus on. Consider their current level and progress. Provide recommendations in JSON format with topic, reason, priority, and category for each.",
                    "type": "long answer"
                }
            ]
            
            # Try to get AI recommendations
            ai_response = self.sarvam_service.text_analytics(context, questions)
            
            if ai_response['success']:
                # Parse AI response into structured recommendations
                answers = ai_response['data'].get('answers', [])
                if answers:
                    response_text = answers[0].get('response', '')
                    recommendations = self._parse_ai_recommendations(response_text)
                else:
                    recommendations = []
            else:
                logger.warning(f"AI recommendations failed: {ai_response.get('error')}")
                recommendations = []
            
            # If AI fails, use fallback recommendations
            if not recommendations:
                recommendations = self._get_fallback_recommendations(user, knowledge_state)
            
            # Store AI recommendations in database
            self._store_ai_recommendations(user, recommendations)
            
            return recommendations
            
        except Exception as e:
            logger.error(f'Error generating AI recommendations: {str(e)}')
            return self._get_fallback_recommendations(user, knowledge_state)

    def _parse_ai_recommendations(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse AI response into structured recommendations"""
        recommendations = []
        
        try:
            lines = ai_response.split('\n')
            current_rec = {}
            
            for line in lines:
                line = line.strip()
                if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                    if current_rec:
                        recommendations.append(current_rec)
                    current_rec = {}
                    if 'Topic:' in line:
                        current_rec['topic'] = line.split('Topic:')[1].strip()
                elif 'Reason:' in line:
                    current_rec['reason'] = line.split('Reason:')[1].strip()
                elif 'Priority:' in line:
                    current_rec['priority'] = line.split('Priority:')[1].strip().lower()
                elif 'Category:' in line:
                    current_rec['category'] = line.split('Category:')[1].strip()
            
            if current_rec:
                recommendations.append(current_rec)
                
        except Exception as e:
            logger.error(f'Error parsing AI recommendations: {str(e)}')
        
        return recommendations
    
    # apps/learning/services.py - Update the _get_fallback_recommendations method

    def _get_fallback_recommendations(self, user: User, knowledge_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Provide fallback recommendations if AI fails"""
        current_level = knowledge_state['current_level']
        
        # Get completed topic IDs
        completed_topic_ids = UserLearningProgress.objects.filter(
            user=user, status='completed'
        ).values_list('topic_id', flat=True)
        
        # Get next topics for current level that aren't completed
        next_topics = LearningTopic.objects.filter(
            difficulty_level=current_level,
            is_active=True
        ).exclude(id__in=completed_topic_ids).order_by('order', 'id')[:5]
        
        recommendations = []
        priority_map = ['high', 'medium', 'medium', 'low', 'low']
        
        for i, topic in enumerate(next_topics):
            recommendations.append({
                'topic': topic.title,
                'reason': f'Continue building your {current_level} level skills in {topic.category.name}',
                'priority': priority_map[i] if i < len(priority_map) else 'low',
                'category': topic.category.name,
                'topic_id': topic.id
            })
        
        # If no topics for current level, suggest easier level
        if not recommendations:
            easier_levels = {
                'advanced': 'intermediate',
                'intermediate': 'beginner'
            }
            
            easier_level = easier_levels.get(current_level)
            if easier_level:
                easier_topics = LearningTopic.objects.filter(
                    difficulty_level=easier_level,
                    is_active=True
                ).exclude(id__in=completed_topic_ids).order_by('order', 'id')[:3]
                
                for topic in easier_topics:
                    recommendations.append({
                        'topic': topic.title,
                        'reason': f'Build foundation skills before advancing to {current_level} level',
                        'priority': 'high',
                        'category': topic.category.name,
                        'topic_id': topic.id
                    })
        
        return recommendations

    def _get_next_topics(self, user: User, current_level: str, ai_recommendations: List[Dict]) -> List[Dict[str, Any]]:
        """Get the actual learning topics to display to user"""
        
        # Get completed topics
        completed_topic_ids = UserLearningProgress.objects.filter(
            user=user, status='completed'
        ).values_list('topic_id', flat=True)
        
        # Get topics for current level that aren't completed
        available_topics = LearningTopic.objects.filter(
            difficulty_level=current_level,
            is_active=True
        ).exclude(id__in=completed_topic_ids).select_related('category')
        
        # Match AI recommendations to actual topics
        recommended_topics = []
        for topic in available_topics[:8]:  # Limit to 8 topics
            # Check if this topic matches any AI recommendation
            ai_match = next(
                (rec for rec in ai_recommendations if rec.get('topic', '').lower() in topic.title.lower()),
                None
            )
            
            topic_data = {
                'id': topic.id,
                'title': topic.title,
                'description': topic.description,
                'category': topic.category.name,
                'category_color': topic.category.color,
                'category_icon': topic.category.icon,
                'estimated_duration': topic.estimated_duration,
                'points_reward': topic.points_reward,
                'ai_recommended': bool(ai_match),
                'ai_reason': ai_match.get('reason', '') if ai_match else '',
                'priority': ai_match.get('priority', 'medium') if ai_match else 'medium'
            }
            recommended_topics.append(topic_data)
        
        # Sort by AI recommendation priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommended_topics.sort(key=lambda x: (
            0 if x['ai_recommended'] else 1,
            priority_order.get(x['priority'], 1)
        ))
        
        return recommended_topics
    
    def _calculate_progress_stats(self, user: User, current_level: str) -> Dict[str, Any]:
        """Calculate detailed progress statistics"""
        
        # Total topics for current level
        total_topics = LearningTopic.objects.filter(
            difficulty_level=current_level, is_active=True
        ).count()
        
        # Completed topics
        completed_count = UserLearningProgress.objects.filter(
            user=user, 
            topic__difficulty_level=current_level,
            status='completed'
        ).count()
        
        # In progress topics
        in_progress_count = UserLearningProgress.objects.filter(
            user=user,
            topic__difficulty_level=current_level,
            status='in_progress'
        ).count()
        
        # Total time spent learning
        total_time = UserLearningProgress.objects.filter(
            user=user
        ).aggregate(total=models.Sum('time_spent'))['total'] or 0
        
        return {
            'current_level': current_level,
            'total_topics': total_topics,
            'completed_topics': completed_count,
            'in_progress_topics': in_progress_count,
            'completion_percentage': (completed_count / total_topics * 100) if total_topics > 0 else 0,
            'total_time_spent': total_time,
            'topics_remaining': total_topics - completed_count
        }
    
    def _calculate_level_completion(self, user: User, current_level: str) -> float:
        """Calculate what percentage of current level is completed"""
        total_topics = LearningTopic.objects.filter(
            difficulty_level=current_level, is_active=True
        ).count()
        
        completed_topics = UserLearningProgress.objects.filter(
            user=user,
            topic__difficulty_level=current_level,
            status='completed'
        ).count()
        
        return (completed_topics / total_topics * 100) if total_topics > 0 else 0
    
    def _identify_knowledge_gaps(self, user: User, current_level: str) -> List[str]:
        """Identify areas where user needs more learning"""
        gaps = []
        
        for category in LearningCategory.objects.filter(is_active=True):
            category_topics = LearningTopic.objects.filter(
                category=category,
                difficulty_level=current_level,
                is_active=True
            )
            
            completed_in_category = UserLearningProgress.objects.filter(
                user=user,
                topic__in=category_topics,
                status='completed'
            ).count()
            
            completion_rate = (completed_in_category / category_topics.count()) if category_topics.count() > 0 else 0
            
            if completion_rate < 0.5:  # Less than 50% completed
                gaps.append(category.name)
        
        return gaps
    
    def _store_ai_recommendations(self, user: User, recommendations: List[Dict]) -> None:
        """Store AI recommendations in database"""
        try:
            # Clear old recommendations
            AIRecommendation.objects.filter(
                user=user,
                expires_at__lt=timezone.now()
            ).delete()
            
            # Store new recommendations
            for rec in recommendations:
                if 'topic_id' in rec:
                    AIRecommendation.objects.create(
                        user=user,
                        recommended_topic_id=rec['topic_id'],
                        recommendation_type='next_topic',
                        reason=rec.get('reason', ''),
                        confidence_score=0.8,
                        expires_at=timezone.now() + timezone.timedelta(days=7)
                    )
        except Exception as e:
            logger.error(f'Error storing AI recommendations: {str(e)}')
    
    @transaction.atomic
    def complete_topic(self, user: User, topic_id: int) -> Dict[str, Any]:
        """Mark a topic as completed and award points/achievements"""
        try:
            topic = LearningTopic.objects.get(id=topic_id, is_active=True)
            
            # Get or create progress record
            progress, created = UserLearningProgress.objects.get_or_create(
                user=user,
                topic=topic,
                defaults={
                    'started_at': timezone.now(),
                    'status': 'in_progress'
                }
            )
            
            # Mark as completed
            progress.status = 'completed'
            progress.completion_percentage = 100
            progress.completed_at = timezone.now()
            progress.save()
            
            # Award points through gamification system
            gamification_result = GamificationEngine.award_points(
                user=user,
                action='argument_submitted',  # Reuse existing action or create new one
                points_override=topic.points_reward,
                description=f'Completed learning topic: "{topic.title}"'
            )
            
            # Check for level completion
            level_completion = self._check_level_completion(user, topic.difficulty_level)
            
            # Check for achievements
            new_achievements = self._check_learning_achievements(user)
            
            logger.info(f'Topic completed by {user.username}: {topic.title}')
            
            return {
                'success': True,
                'topic_completed': topic.title,
                'points_earned': topic.points_reward,
                'level_completion': level_completion,
                'gamification': gamification_result,
                'new_achievements': new_achievements
            }
            
        except LearningTopic.DoesNotExist:
            return {'success': False, 'error': 'Topic not found'}
        except Exception as e:
            logger.error(f'Error completing topic: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def _check_level_completion(self, user: User, level: str) -> Dict[str, Any]:
        """Check if user has completed their current level"""
        completion_percentage = self._calculate_level_completion(user, level)
        
        if completion_percentage >= 100:
            # User completed current level
            return {
                'level_completed': True,
                'current_level': level,
                'ready_for_next_level': True,
                'completion_percentage': completion_percentage
            }
        
        return {
            'level_completed': False,
            'current_level': level,
            'completion_percentage': completion_percentage,
            'topics_remaining': self._get_remaining_topics_count(user, level)
        }
    
    def _check_learning_achievements(self, user: User) -> List[Dict[str, Any]]:
        """Check and award learning-specific achievements"""
        new_achievements = []
        
        try:
            # Check for level completion achievements
            for level in ['beginner', 'intermediate', 'advanced']:
                completion = self._calculate_level_completion(user, level)
                if completion >= 100:
                    achievement_name = f"{level.capitalize()} Level Master"
                    
                    # Check if already earned
                    if not UserLearningAchievement.objects.filter(
                        user=user,
                        achievement__name=achievement_name
                    ).exists():
                        # Create achievement if doesn't exist
                        achievement, created = LearningAchievement.objects.get_or_create(
                            name=achievement_name,
                            defaults={
                                'description': f'Completed all {level} level learning topics',
                                'achievement_type': 'level_completion',
                                'points_reward': 100
                            }
                        )
                        
                        # Award achievement
                        UserLearningAchievement.objects.create(
                            user=user,
                            achievement=achievement
                        )
                        
                        new_achievements.append({
                            'name': achievement.name,
                            'description': achievement.description,
                            'points': achievement.points_reward
                        })
        
        except Exception as e:
            logger.error(f'Error checking learning achievements: {str(e)}')
        
        return new_achievements
    
    def _get_remaining_topics_count(self, user: User, level: str) -> int:
        """Get count of remaining topics for a level"""
        total = LearningTopic.objects.filter(
            difficulty_level=level, is_active=True
        ).count()
        
        completed = UserLearningProgress.objects.filter(
            user=user,
            topic__difficulty_level=level,
            status='completed'
        ).count()
        
        return total - completed
