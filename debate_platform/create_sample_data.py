# create_sample_data.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from debates.models import DebateTopic

# Create sample debate topics
topics = [
    {
        'title': 'Should school uniforms be mandatory?',
        'description': 'Debate the pros and cons of mandatory school uniforms in educational institutions.',
        'difficulty_level': 'beginner',
        'age_group': '13-15'
    },
    {
        'title': 'Is social media beneficial for teenagers?',
        'description': 'Discuss the impact of social media platforms on teenage development and well-being.',
        'difficulty_level': 'intermediate',
        'age_group': '15-17'
    },
    {
        'title': 'Should artificial intelligence replace human teachers?',
        'description': 'Explore the potential of AI in education and its implications for traditional teaching.',
        'difficulty_level': 'advanced',
        'age_group': '16-18'
    }
]

for topic_data in topics:
    DebateTopic.objects.get_or_create(**topic_data)

print("Sample debate topics created successfully!")
