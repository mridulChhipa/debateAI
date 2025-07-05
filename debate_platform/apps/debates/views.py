from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
import json

from .models import DebateTopic, DebateSession, Argument
from apps.sarvam_integration.services import SarvamAIService

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import base64

@login_required
def debate_session_view(request, session_id):
    """Display active debate session interface"""
    session = get_object_or_404(DebateSession, id=session_id, user=request.user)
    
    # Get all arguments for this session
    arguments = session.arguments.all().order_by('timestamp')
    
    context = {
        'session': session,
        'topic': session.topic,
        'arguments': arguments,
        'max_length': settings.DEBATE_SETTINGS['MAX_ARGUMENT_LENGTH'],
        'min_length': settings.DEBATE_SETTINGS['MIN_ARGUMENT_LENGTH'],
    }
    
    return render(request, 'debates/session_detail.html', context)

@login_required
def complete_session(request, session_id):
    """Mark debate session as completed and calculate final score"""
    session = get_object_or_404(DebateSession, id=session_id, user=request.user)
    
    if not session.is_completed:
        # Calculate final score based on arguments
        arguments = session.arguments.filter(speaker='student')
        total_score = sum(arg.quality_score or 0 for arg in arguments)
        average_score = total_score / len(arguments) if arguments else 0
        
        # Update session
        session.is_completed = True
        session.completed_at = timezone.now()
        session.final_score = int(average_score * 10)  # Scale to 100
        session.save()
        
        # Update user profile
        profile = request.user.userprofile
        profile.debates_completed += 1
        profile.total_points += session.final_score
        profile.save()
        
        messages.success(request, f'Debate completed! You scored {session.final_score} points.')
    
    return redirect('debates:dashboard')

@login_required
def debate_dashboard(request):
    """Main dashboard showing available topics and user progress"""
    user_profile = request.user.userprofile
    
    # Get topics appropriate for user's level
    topics = DebateTopic.objects.filter(
        difficulty_level=user_profile.current_level,
        is_active=True
    )
    
    # Get recent sessions
    recent_sessions = DebateSession.objects.filter(
        user=request.user
    ).order_by('-started_at')[:5]
    
    context = {
        'topics': topics,
        'recent_sessions': recent_sessions,
        'user_profile': user_profile,
        'total_points': user_profile.total_points,
        'current_level': user_profile.current_level,
    }
    
    return render(request, 'debates/dashboard.html', context)

@login_required
def start_debate_session(request, topic_id):
    """Start a new debate session"""
    topic = get_object_or_404(DebateTopic, id=topic_id)
    
    # Create new session
    session = DebateSession.objects.create(
        user=request.user,
        topic=topic,
        language=request.user.userprofile.preferred_language
    )
    
    context = {
        'session': session,
        'topic': topic,
        'max_length': settings.DEBATE_SETTINGS['MAX_ARGUMENT_LENGTH'],
        'min_length': settings.DEBATE_SETTINGS['MIN_ARGUMENT_LENGTH'],
    }
    
    return render(request, 'debates/session.html', context)

@csrf_exempt
@login_required
def submit_argument(request):
    """Handle student argument submission and generate AI response"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST required'})
    
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        student_argument = data.get('argument')
        argument_type = data.get('type', 'opening')
        
        session = get_object_or_404(DebateSession, id=session_id, user=request.user)
        
        # Validate argument length
        min_len = settings.DEBATE_SETTINGS['MIN_ARGUMENT_LENGTH']
        max_len = settings.DEBATE_SETTINGS['MAX_ARGUMENT_LENGTH']
        
        if len(student_argument) < min_len:
            return JsonResponse({
                'success': False, 
                'error': f'Argument too short. Minimum {min_len} characters required.'
            })
        
        if len(student_argument) > max_len:
            return JsonResponse({
                'success': False, 
                'error': f'Argument too long. Maximum {max_len} characters allowed.'
            })
        
        # Save student argument
        student_arg = Argument.objects.create(
            session=session,
            speaker='student',
            content=student_argument,
            argument_type=argument_type
        )
        
        # Generate AI response using Sarvam AI
        sarvam_service = SarvamAIService()
        
        # Get AI opponent response
        ai_response = sarvam_service.create_debate_opponent_response(
            session.topic.title,
            student_argument,
            language=session.language
        )
        
        if ai_response['success']:
            # Save AI response
            ai_argument = Argument.objects.create(
                session=session,
                speaker='ai_opponent',
                content=ai_response['response'],
                argument_type='rebuttal'
            )
            
            # Analyze student argument quality
            analysis = sarvam_service.analyze_argument_quality(student_argument)
            
            if analysis['success']:
                student_arg.quality_score = analysis['analysis'].get('effectiveness_score', 5)
                student_arg.feedback = analysis['analysis'].get('suggestions', '')
                student_arg.logical_fallacies = analysis['analysis'].get('fallacies', [])
                student_arg.save()
            
            return JsonResponse({
                'success': True,
                'ai_response': ai_response['response'],
                'feedback': student_arg.feedback,
                'quality_score': student_arg.quality_score,
                'fallacies': student_arg.logical_fallacies
            })
        
        return JsonResponse({
            'success': False, 
            'error': 'AI service temporarily unavailable'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
