from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'), 
        ('advanced', 'Advanced')
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    age_group = models.CharField(max_length=20)
    preferred_language = models.CharField(max_length=10, default='en-IN')
    current_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    total_points = models.IntegerField(default=0)
    debates_completed = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - Level {self.current_level}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.userprofile.save()
