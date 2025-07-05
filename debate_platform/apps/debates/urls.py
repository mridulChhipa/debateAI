from django.urls import path
from . import views

app_name = 'debates'

urlpatterns = [
    path('', views.debate_dashboard, name='dashboard'),
    path('topic/<int:topic_id>/start/', views.start_debate_session, name='start_session'),
    path('session/<int:session_id>/', views.debate_session_view, name='session_view'),
    path('session/<int:session_id>/complete/', views.complete_session, name='complete_session'),
    path('api/submit-argument/', views.submit_argument, name='submit_argument'),
]
