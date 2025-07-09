from rest_framework import viewsets, permissions, mixins, generics, status
from .models import DebateTopic, DebateSession, Argument
from .serializers import DebateTopicSerializer, DebateSessionSerializer, ArgumentSerializer
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
import logging
from django.db import models  # Add this line

logger = logging.getLogger('debates')

class DebateTopicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DebateTopicSerializer
    permission_classes = [permissions.IsAuthenticated]  # Change from AllowAny to IsAuthenticated

    def get_queryset(self):
        # Only return topics created by the authenticated user
        return DebateTopic.objects.filter(
            created_by=self.request.user,
            is_active=True
        )
    
class DebateSessionViewSet(viewsets.ModelViewSet):
    serializer_class = DebateSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DebateSession.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            topic_id = request.data.get('topic')
            if not topic_id:
                return Response({
                    'success': False,
                    'error': 'Topic ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            topic = get_object_or_404(
                DebateTopic, 
                id=topic_id, 
                created_by=request.user,
                is_active=True
            )

            existing_session = DebateSession.objects.filter(
                user=request.user,
                topic=topic,
                is_completed=False
            ).first()

            if existing_session:
                serializer = self.get_serializer(existing_session)
                return Response({
                    'success': True,
                    'session': serializer.data,
                    'message': 'Resuming existing session'
                }, status=status.HTTP_200_OK)

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            session = serializer.save(user=request.user)

            logger.info(f"New debate session created by user {request.user.username} for topic '{topic.title}'")

            headers = self.get_success_headers(serializer.data)
            return Response({
                'success': True,
                'session': serializer.data,
                'message': 'New session created'
            }, status=status.HTTP_201_CREATED, headers=headers)

        except DebateTopic.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Topic not found or not accessible'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f'Error creating debate session: {str(e)}')
            return Response({
                'success': False,
                'error': 'Failed to create session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        """
        Override to add additional logic during session creation
        """
        serializer.save(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """
        Enhanced retrieve method with better error handling
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except DebateSession.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Session not found'
            }, status=status.HTTP_404_NOT_FOUND)

class ArgumentViewSet(mixins.CreateModelMixin,
                      mixins.ListModelMixin,
                      viewsets.GenericViewSet):
    serializer_class = ArgumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs.get('session_pk')
        return Argument.objects.filter(session_id=session_id, session__user=self.request.user)

    def perform_create(self, serializer):
        session_id = self.kwargs.get('session_pk')
        serializer.save(session_id=session_id, speaker='student')

class RecentSessionsView(generics.ListAPIView):
    serializer_class = DebateSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Get recent 5 sessions for the authenticated user
        return DebateSession.objects.filter(
            user=self.request.user,
            # is_completed = False,
        ).select_related('topic').order_by('-started_at')[:5]
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        
        for session in queryset:
            data.append({
                'id': session.id,
                'title': session.topic.title,
                'date': session.started_at.strftime('%b %d, %Y'),
                'status': 'Completed' if session.is_completed else 'In Progress',
                'score': session.final_score if session.final_score else None,
                'topic_id': session.topic.id
            })
        
        return Response(data)

# apps/debates/api_views.py - Add these imports and view

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.sarvam_integration.services import SarvamAIService
from gamification.services import GamificationEngine
from .models import DebateSession, Argument
from .serializers import ArgumentSerializer
import logging

logger = logging.getLogger('debates')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def voice_debate_view(request):
    """
    Handle complete voice debate workflow:
    STT → Analysis → AI Response → TTS → Gamification
    """
    try:
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({
                'success': False,
                'error': 'session_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's debate session
        session = get_object_or_404(
            DebateSession, 
            id=session_id, 
            user=request.user
        )
        
        # Validate audio file
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({
                'success': False,
                'error': 'Audio file is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize Sarvam AI service
        sarvam_service = SarvamAIService()
        
        # Step 1: Convert speech to text
        logger.info(f"Processing voice input for session {session_id}")
        stt_result = sarvam_service.speech_to_text(
            audio_file,
            language_code=getattr(session, 'language', 'en-IN')
        )
        
        if not stt_result['success']:
            logger.error(f"STT failed: {stt_result.get('error', 'Unknown error')}")
            return Response({
                'success': False,
                'error': f"Speech recognition failed: {stt_result.get('error', 'Unknown error')}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        student_transcript = stt_result['transcript']
        logger.info(f"Speech transcribed successfully: {len(student_transcript)} characters")

        # Step 2: Detect language of the argument
        logger.info("Detecting language of the argument")
        language_detection_result = sarvam_service.detect_language(student_transcript)
        
        detected_language = 'en-IN'  # Default fallback
        if language_detection_result['success']:
            detected_language = language_detection_result.get('language_code', 'en-IN')
            logger.info(f"Detected language: {detected_language}")
        else:
            logger.warning(f"Language detection failed: {language_detection_result.get('error')}")
        
        # Step 2: Analyze argument quality with direct parsing
        analysis_result = sarvam_service.analyze_argument_quality(student_transcript)
        quality_score = 5  # Default
        feedback_text = "Good argument!"
        logical_fallacies = []
        
        if analysis_result['success']:
            analysis = analysis_result['analysis']
            
            # Direct parsing with exception handling - no helper function
            try:
                # Extract structure score
                structure_item = next((item for item in analysis if item["id"] == "structure_score"), None)
                structure_score = structure_item["response"] if structure_item else 5
                
                # Extract evidence quality
                evidence_item = next((item for item in analysis if item["id"] == "evidence_quality"), None)
                evidence_quality = evidence_item["response"] if evidence_item else 5
                
                # Extract effectiveness (quality score)
                effectiveness_item = next((item for item in analysis if item["id"] == "effectiveness"), None)
                quality_score = effectiveness_item["response"] if effectiveness_item else 5
                
                # Extract logical issues
                logical_item = next((item for item in analysis if item["id"] == "logical_issues"), None)
                logical_issue = logical_item["response"] if logical_item else "No issues detected"
                
                # Extract improvement suggestions
                improvements_item = next((item for item in analysis if item["id"] == "improvements"), None)
                feedback_text = improvements_item["response"] if improvements_item else "Good argument!"
                
                # Handle logical fallacies properly as a list
                if logical_issue and logical_issue != "No issues detected":
                    logical_fallacies = [logical_issue]
                else:
                    logical_fallacies = []
                
                logger.info(f"Analysis completed - Quality: {quality_score}, Structure: {structure_score}, Evidence: {evidence_quality}")
                
            except Exception as parse_error:
                logger.error(f"Error parsing analysis result: {str(parse_error)}")
                # Use defaults if parsing fails
                quality_score = 5
                feedback_text = "Analysis completed - using default values due to parsing error"
                logical_fallacies = []
        
        # Step 3: Save student argument
        student_transcript_translated = sarvam_service.translate_text(
            text=student_transcript, 
            target_language=detected_language
        )

        student_argument = Argument.objects.create(
            session=session,
            speaker='student',
            content=student_transcript_translated['translated_text'],
            argument_type='voice_argument',
            quality_score=quality_score,
            feedback=feedback_text,
            logical_fallacies=logical_fallacies,
        )
        
        # Step 4: Generate AI opponent response
        ai_response_result = sarvam_service.create_debate_opponent_response(
            topic=session.topic.title,
            student_argument=student_transcript_translated['translated_text'],
            stance="opposing",
            language=detected_language
        )
        
        if not ai_response_result['success']:
            logger.error(f"AI response generation failed: {ai_response_result.get('error')}")
            return Response({
                'success': False,
                'error': f"AI response generation failed: {ai_response_result.get('error', 'Unknown error')}"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        ai_response_text = ai_response_result['response']
        ai_response_text_translated = sarvam_service.translate_text(
            text=ai_response_text, 
            target_language=detected_language
        )
        # Step 5: Save AI argument
        ai_argument = Argument.objects.create(
            session=session,
            speaker='ai_opponent',
            content=ai_response_text_translated['translated_text'],
            argument_type='voice_rebuttal'
        )
        
        # Step 6: Convert AI response to speech
        tts_result = sarvam_service.text_to_speech(
            text=ai_response_text_translated['translated_text'],
            language=detected_language
        )
        
        ai_audio_data = None
        if tts_result['success']:
            ai_audio_data = tts_result.get('audio_data')
            logger.info("AI response converted to speech successfully")
        
        # Step 7: Award gamification points with error handling
        base_points = 20
        bonus_points = max(0, (quality_score - 5) * 5) if isinstance(quality_score, (int, float)) else 0
        total_voice_points = base_points + bonus_points
        
        try:
            gamification_result = GamificationEngine.award_points(
                user=request.user,
                action='voice_debate',
                points_override=total_voice_points,
                description=f'Voice argument in "{session.topic.title}" (Quality: {quality_score}/10)',
                debate_session=session
            )
            
            if not gamification_result or not gamification_result.get('success', True):
                logger.warning("Gamification points award failed, using defaults")
                gamification_result = {
                    'total_points': 0,
                    'new_level': 'beginner',
                    'level_up': False,
                    'new_achievements': []
                }
        except Exception as gamification_error:
            logger.error(f"Gamification error: {str(gamification_error)}")
            gamification_result = {
                'total_points': 0,
                'new_level': 'beginner',
                'level_up': False,
                'new_achievements': []
            }
        
        # Step 8: Prepare response data
        response_data = {
            'success': True,
            'student_transcript': student_transcript,
            'ai_response_text': ai_response_text,
            'ai_response_audio': ai_audio_data,
            'feedback': {
                'text': feedback_text,
                'score': quality_score,
                'fallacies': logical_fallacies
            },
            'gamification': {
                'points_breakdown': [
                    {'action': 'Voice Debate (Base)', 'points': base_points},
                    {'action': 'Quality Bonus', 'points': bonus_points}
                ],
                'user_total_points': gamification_result.get('total_points', 0),
                'current_level': gamification_result.get('new_level', 'beginner'),
                'level_up': gamification_result.get('level_up', False),
                'achievements_unlocked': [
                    {'name': ach.name, 'description': ach.description} 
                    for ach in gamification_result.get('new_achievements', [])
                ]
            },
            'arguments': {
                'student': ArgumentSerializer(student_argument).data,
                'ai_opponent': ArgumentSerializer(ai_argument).data
            }
        }
        
        logger.info(f"Voice debate completed successfully for user {request.user.username}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'Unexpected error in voice_debate_view: {str(e)}', exc_info=True)
        return Response({
            'success': False,
            'error': 'Internal server error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def validate_audio_upload(request):
    """Validate audio file before processing"""
    try:
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({
                'valid': False,
                'error': 'No audio file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if audio_file.size > max_size:
            return Response({
                'valid': False,
                'error': f'File too large. Maximum size: {max_size // (1024*1024)}MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file type
        allowed_types = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg']
        if audio_file.content_type not in allowed_types:
            return Response({
                'valid': False,
                'error': f'Unsupported file type. Allowed: {", ".join(allowed_types)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'valid': True,
            'file_info': {
                'name': audio_file.name,
                'size': audio_file.size,
                'type': audio_file.content_type
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'Error validating audio upload: {str(e)}')
        return Response({
            'valid': False,
            'error': 'Validation failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def text_debate_view(request):
    """
    Handle complete text debate workflow:
    Text Input → Analysis → AI Response → TTS → Gamification
    """
    try:
        session_id = request.data.get('session_id')
        argument_text = request.data.get('argument_text', '').strip()
        
        if not session_id:
            return Response({
                'success': False,
                'error': 'session_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not argument_text:
            return Response({
                'success': False,
                'error': 'argument_text is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's debate session
        session = get_object_or_404(
            DebateSession, 
            id=session_id, 
            user=request.user
        )
        
        # Initialize Sarvam AI service
        sarvam_service = SarvamAIService()

        # Language detection 
        logger.info("Detecting language of the argument")
        language_detection_result = sarvam_service.detect_language(argument_text)
        
        detected_language = 'en-IN'  # Default fallback
        if language_detection_result['success']:
            detected_language = language_detection_result.get('language_code', 'en-IN')
            logger.info(f"Detected language: {detected_language}")
        else:
            logger.warning(f"Language detection failed: {language_detection_result.get('error')}")

        logger.info(f"Processing text argument for session {session_id}")
        
        # Step 1: Analyze argument quality (same as voice debate)
        analysis_result = sarvam_service.analyze_argument_quality(argument_text)
        quality_score = 5  # Default
        feedback_text = "Good argument!"
        logical_fallacies = []
        
        if analysis_result['success']:
            analysis = analysis_result['analysis']
            
            # Direct parsing with exception handling
            try:
                # Extract structure score
                structure_item = next((item for item in analysis if item["id"] == "structure_score"), None)
                structure_score = structure_item["response"] if structure_item else 5
                
                # Extract evidence quality
                evidence_item = next((item for item in analysis if item["id"] == "evidence_quality"), None)
                evidence_quality = evidence_item["response"] if evidence_item else 5
                
                # Extract effectiveness (quality score)
                effectiveness_item = next((item for item in analysis if item["id"] == "effectiveness"), None)
                quality_score = effectiveness_item["response"] if effectiveness_item else 5
                
                # Extract logical issues
                logical_item = next((item for item in analysis if item["id"] == "logical_issues"), None)
                logical_issue = logical_item["response"] if logical_item else "No issues detected"
                
                # Extract improvement suggestions
                improvements_item = next((item for item in analysis if item["id"] == "improvements"), None)
                feedback_text = improvements_item["response"] if improvements_item else "Good argument!"
                
                # Handle logical fallacies properly as a list
                if logical_issue and logical_issue != "No issues detected":
                    logical_fallacies = [logical_issue]
                else:
                    logical_fallacies = []
                
                logger.info(f"Text analysis completed - Quality: {quality_score}, Structure: {structure_score}")
                
            except Exception as parse_error:
                logger.error(f"Error parsing analysis result: {str(parse_error)}")
                # Use defaults if parsing fails
                quality_score = 5
                feedback_text = "Analysis completed - using default values due to parsing error"
                logical_fallacies = []
        
        # Step 2: Save student argument
        argument_translated = sarvam_service.translate_text(
            text=argument_text, 
            target_language=detected_language
        )
        
        student_argument = Argument.objects.create(
            session=session,
            speaker='student',
            content=argument_translated['translated_text'],
            argument_type='text_argument',
            quality_score=quality_score,
            feedback=feedback_text,
            logical_fallacies=logical_fallacies,
        )
        
        # Step 3: Generate AI opponent response
        ai_response_result = sarvam_service.create_debate_opponent_response(
            topic=session.topic.title,
            student_argument=argument_text,
            stance="opposing",
            language=getattr(session, 'language', 'en-IN')
        )
        
        if not ai_response_result['success']:
            logger.error(f"AI response generation failed: {ai_response_result.get('error')}")
            return Response({
                'success': False,
                'error': f"AI response generation failed: {ai_response_result.get('error', 'Unknown error')}"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        ai_response_text = ai_response_result['response']
        
        # Step 4: Save AI argument
        ai_response_text_translated = sarvam_service.translate_text(
            text=ai_response_text, 
            target_language=detected_language
        )
        ai_argument = Argument.objects.create(
            session=session,
            speaker='ai_opponent',
            content=ai_response_text_translated['translated_text'],
            argument_type='text_rebuttal'
        )
        
        # Step 5: Convert AI response to speech
        tts_result = sarvam_service.text_to_speech(
            text=ai_response_text_translated['translated_text'],
            language=getattr(session, 'language', 'en-IN')
        )
        
        ai_audio_data = None
        if tts_result['success']:
            ai_audio_data = tts_result.get('audio_data')
            logger.info("AI response converted to speech successfully")
        
        # Step 6: Award gamification points
        base_points = 15  # Slightly less than voice debate
        bonus_points = max(0, (quality_score - 5) * 5) if isinstance(quality_score, (int, float)) else 0
        total_points = base_points + bonus_points
        
        try:
            gamification_result = GamificationEngine.award_points(
                user=request.user,
                action='argument_submitted',
                points_override=total_points,
                description=f'Text argument in "{session.topic.title}" (Quality: {quality_score}/10)',
                debate_session=session
            )
            
            if not gamification_result or not gamification_result.get('success', True):
                logger.warning("Gamification points award failed, using defaults")
                gamification_result = {
                    'total_points': 0,
                    'new_level': 'beginner',
                    'level_up': False,
                    'new_achievements': []
                }
        except Exception as gamification_error:
            logger.error(f"Gamification error: {str(gamification_error)}")
            gamification_result = {
                'total_points': 0,
                'new_level': 'beginner',
                'level_up': False,
                'new_achievements': []
            }
        
        # Step 7: Prepare response data
        response_data = {
            'success': True,
            'student_argument_text': argument_text,
            'ai_response_text': ai_response_text,
            'ai_response_audio': ai_audio_data,
            'feedback': {
                'text': feedback_text,
                'score': quality_score,
                'fallacies': logical_fallacies
            },
            'gamification': {
                'points_breakdown': [
                    {'action': 'Text Argument (Base)', 'points': base_points},
                    {'action': 'Quality Bonus', 'points': bonus_points}
                ],
                'user_total_points': gamification_result.get('total_points', 0),
                'current_level': gamification_result.get('new_level', 'beginner'),
                'level_up': gamification_result.get('level_up', False),
                'achievements_unlocked': [
                    {'name': ach.name, 'description': ach.description} 
                    for ach in gamification_result.get('new_achievements', [])
                ]
            },
            'arguments': {
                'student': ArgumentSerializer(student_argument).data,
                'ai_opponent': ArgumentSerializer(ai_argument).data
            }
        }
        
        logger.info(f"Text debate completed successfully for user {request.user.username}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'Unexpected error in text_debate_view: {str(e)}', exc_info=True)
        return Response({
            'success': False,
            'error': 'Internal server error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_debate_session(request, session_id):
    """
    Mark a debate session as completed and calculate final scores
    """
    try:
        # Get user's debate session
        session = get_object_or_404(
            DebateSession, 
            id=session_id, 
            user=request.user
        )
        
        # Check if session is already completed
        if session.is_completed:
            return Response({
                'success': False,
                'error': 'Session is already completed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate session statistics
        arguments = Argument.objects.filter(session=session, speaker='student')
        total_arguments = arguments.count()
        
        if total_arguments == 0:
            return Response({
                'success': False,
                'error': 'Cannot complete session without any arguments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate average quality score
        avg_quality = arguments.aggregate(
            avg_score=models.Avg('quality_score')
        )['avg_score'] or 0
        
        # Calculate final score (0-100 scale)
        base_score = min(avg_quality * 10, 100)  # Convert 1-10 scale to 0-100
        argument_bonus = min(total_arguments * 5, 30)  # Up to 30 bonus points
        final_score = min(base_score + argument_bonus, 100)
        
        # Mark session as completed
        session.is_completed = True
        session.completed_at = timezone.now()
        session.final_score = final_score
        session.save()
        
        # Update user profile
        profile = request.user.userprofile
        profile.debates_completed += 1
        profile.save()
        
        # Award completion points
        completion_points = 50 + int(final_score * 0.5)  # 50 base + score bonus
        
        try:
            gamification_result = GamificationEngine.award_points(
                user=request.user,
                action='debate_completed',
                points_override=completion_points,
                description=f'Completed "{session.topic.title}" with score {final_score}/100',
                debate_session=session
            )
        except Exception as gamification_error:
            logger.error(f"Gamification error during completion: {str(gamification_error)}")
            gamification_result = {
                'total_points': profile.total_points,
                'new_level': profile.current_level,
                'level_up': False,
                'new_achievements': []
            }
        
        logger.info(f"Session {session_id} completed by user {request.user.username} with score {final_score}")
        
        # Prepare response data
        response_data = {
            'success': True,
            'session_stats': {
                'session_id': session.id,
                'topic_title': session.topic.title,
                'total_arguments': total_arguments,
                'average_quality': round(avg_quality, 1),
                'final_score': final_score,
                'completed_at': session.completed_at.isoformat(),
                'duration_minutes': (session.completed_at - session.started_at).total_seconds() / 60
            },
            'gamification': {
                'points_earned': completion_points,
                'user_total_points': gamification_result.get('total_points', 0),
                'current_level': gamification_result.get('new_level', 'beginner'),
                'level_up': gamification_result.get('level_up', False),
                'achievements_unlocked': [
                    {'name': ach.name, 'description': ach.description} 
                    for ach in gamification_result.get('new_achievements', [])
                ]
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'Error completing session {session_id}: {str(e)}', exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to complete session'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_debate_topic(request):
    """
    Create a new debate topic for the authenticated user
    """
    try:
        # Extract data from request
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        difficulty_level = request.data.get('difficulty_level', 'beginner')
        age_group = request.data.get('age_group', '13-15')
        
        # Validate required fields
        if not title:
            return Response({
                'success': False,
                'error': 'Title is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not description:
            return Response({
                'success': False,
                'error': 'Description is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate field lengths
        if len(title) > 200:
            return Response({
                'success': False,
                'error': 'Title must be 200 characters or less'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(description) > 500:
            return Response({
                'success': False,
                'error': 'Description must be 500 characters or less'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate difficulty level
        valid_difficulties = ['beginner', 'intermediate', 'advanced']
        if difficulty_level not in valid_difficulties:
            return Response({
                'success': False,
                'error': 'Invalid difficulty level'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate age group
        valid_age_groups = ['13-15', '15-17', '16-18', '18+']
        if age_group not in valid_age_groups:
            return Response({
                'success': False,
                'error': 'Invalid age group'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for duplicate titles by the same user
        existing_topic = DebateTopic.objects.filter(
            created_by=request.user,
            title__iexact=title
        ).first()
        
        if existing_topic:
            return Response({
                'success': False,
                'error': 'You already have a topic with this title'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the new topic
        new_topic = DebateTopic.objects.create(
            title=title,
            description=description,
            difficulty_level=difficulty_level,
            age_group=age_group,
            created_by=request.user,
            is_active=True
        )
        
        logger.info(f"New topic created by user {request.user.username}: {title}")
        
        # Award gamification points for topic creation
        try:
            gamification_result = GamificationEngine.award_points(
                user=request.user,
                action='argument_submitted',  # Or create a new action type
                points_override=10,
                description=f'Created topic: "{title}"'
            )
        except Exception as gamification_error:
            logger.error(f"Gamification error during topic creation: {str(gamification_error)}")
            gamification_result = {
                'total_points': 0,
                'level_up': False,
                'new_achievements': []
            }
        
        # Prepare response data
        response_data = {
            'success': True,
            'topic': {
                'id': new_topic.id,
                'title': new_topic.title,
                'description': new_topic.description,
                'difficulty_level': new_topic.difficulty_level,
                'age_group': new_topic.age_group,
                'created_at': new_topic.created_at.isoformat(),
                'is_active': new_topic.is_active
            },
            'gamification': {
                'points_earned': 10,
                'user_total_points': gamification_result.get('total_points', 0),
                'level_up': gamification_result.get('level_up', False),
                'achievements_unlocked': [
                    {'name': ach.name, 'description': ach.description} 
                    for ach in gamification_result.get('new_achievements', [])
                ]
            }
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f'Error creating topic: {str(e)}', exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to create topic'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
