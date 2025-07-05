from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    age_group = serializers.CharField(write_only=True, required=False, default='13-15')
    preferred_language = serializers.CharField(write_only=True, required=False, default='en-IN')
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'age_group', 'preferred_language')
    
    def create(self, validated_data):
        # Extract profile data
        age_group = validated_data.pop('age_group', '13-15')
        preferred_language = validated_data.pop('preferred_language', 'en-IN')
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Update the automatically created profile
        if hasattr(user, 'userprofile'):
            profile = user.userprofile
            profile.age_group = age_group
            profile.preferred_language = preferred_language
            profile.save()
        
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('age_group', 'preferred_language', 'current_level', 'total_points', 'debates_completed', 'created_at')
        read_only_fields = ('total_points', 'debates_completed', 'created_at')

class ProfileSerializer(serializers.ModelSerializer):
    # Include UserProfile fields directly in the user serializer
    age_group = serializers.CharField(source='userprofile.age_group')
    preferred_language = serializers.CharField(source='userprofile.preferred_language')
    current_level = serializers.CharField(source='userprofile.current_level', read_only=True)
    total_points = serializers.IntegerField(source='userprofile.total_points', read_only=True)
    debates_completed = serializers.IntegerField(source='userprofile.debates_completed', read_only=True)
    created_at = serializers.DateTimeField(source='userprofile.created_at', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'age_group', 'preferred_language', 'current_level', 
                 'total_points', 'debates_completed', 'created_at')
        read_only_fields = ('username', 'total_points', 'debates_completed', 'current_level', 'created_at')
    
    def update(self, instance, validated_data):
        # Update User fields
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()
        
        # Update UserProfile fields
        userprofile_data = validated_data.get('userprofile', {})
        if hasattr(instance, 'userprofile'):
            profile = instance.userprofile
            profile.age_group = userprofile_data.get('age_group', profile.age_group)
            profile.preferred_language = userprofile_data.get('preferred_language', profile.preferred_language)
            profile.save()
        
        return instance
