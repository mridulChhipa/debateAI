# apps/realtime_debate/routing.py - VERIFY THIS MATCHES
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/debate/(?P<room_id>[0-9a-f-]+)/$', consumers.DebateRoomConsumer.as_asgi()),
]
