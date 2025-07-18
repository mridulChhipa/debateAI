# config/routing.py  (create if missing)
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import apps.realtime_debate.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(apps.realtime_debate.routing.websocket_urlpatterns),
})
