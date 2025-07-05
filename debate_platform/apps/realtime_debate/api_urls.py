# apps/realtime_debate/api_urls.py
from django.urls import path
from .api_views import (
    create_debate_room,
    get_debate_room,
    list_user_debate_rooms,
    test_streaming_tts
)

urlpatterns = [
    path('create-room/', create_debate_room, name='create-realtime-debate-room'),
    path('room/<uuid:room_id>/', get_debate_room, name='get-realtime-debate-room'),
    path('rooms/', list_user_debate_rooms, name='list-realtime-debate-rooms'),
    path('test-streaming/', test_streaming_tts, name='test-streaming-tts'),
]
