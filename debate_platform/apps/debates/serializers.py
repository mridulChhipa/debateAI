from rest_framework import serializers
from .models import DebateTopic, DebateSession, Argument

class DebateTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTopic
        fields = '__all__'

class DebateSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateSession
        fields = ('id', 'topic', 'started_at', 'is_completed', 'final_score')
        read_only_fields = ('started_at', 'is_completed', 'final_score')

class ArgumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Argument
        fields = '__all__'
        read_only_fields = ('session', 'speaker')
