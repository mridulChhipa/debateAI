from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.contrib.auth.models import User
from .models import UserProfile

def register_view(request):
    """User registration view"""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            
            age_group = request.POST.get('age_group', '13-15')
            preferred_language = request.POST.get('preferred_language', 'en-IN')
            
            profile = user.userprofile
            profile.age_group = age_group
            profile.preferred_language = preferred_language
            profile.save()
            
            login(request, user)
            messages.success(request, 'Registration successful! Welcome to the AI Debate Platform.')
            return redirect('debates:dashboard')
    else:
        form = UserCreationForm()
    
    context = {
        'form': form,
        'age_groups': ['13-15', '15-17', '16-18', '18+'],
        'languages': [
            ('en-IN', 'English'),
            ('hi-IN', 'Hindi'),
            ('ta-IN', 'Tamil'),
            ('te-IN', 'Telugu'),
            ('bn-IN', 'Bengali'),
        ]
    }
    return render(request, 'auth/register.html', context)

@login_required
def profile_view(request):
    """User profile view and edit"""
    if request.method == 'POST':
        user = request.user
        user.first_name = request.POST.get('first_name', '')
        user.last_name = request.POST.get('last_name', '')
        user.email = request.POST.get('email', '')
        user.save()
        
        profile = user.userprofile
        profile.age_group = request.POST.get('age_group', profile.age_group)
        profile.preferred_language = request.POST.get('preferred_language', profile.preferred_language)
        profile.save()
        
        messages.success(request, 'Profile updated successfully!')
        return redirect('authentication:profile')
    
    context = {
        'user': request.user,
        'profile': request.user.userprofile,
        'age_groups': ['13-15', '15-17', '16-18', '18+'],
        'languages': [
            ('en-IN', 'English'),
            ('hi-IN', 'Hindi'),
            ('ta-IN', 'Tamil'),
            ('te-IN', 'Telugu'),
            ('bn-IN', 'Bengali'),
        ]
    }
    return render(request, 'auth/profile.html', context)
