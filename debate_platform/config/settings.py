import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

import sys
sys.path.insert(0, os.path.join(BASE_DIR, 'apps'))

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-l3i9(9rqbprd)n-*=sm_d&h_jddimow&2k=pye@t_(i=(ucny8')

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',') if os.getenv('ALLOWED_HOSTS') else []

# Sarvam AI Configuration
SARVAM_API_KEY = os.getenv('SARVAM_API_KEY')
SARVAM_BASE_URL = 'https://api.sarvam.ai'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    
    # Your apps
    'authentication',      # Use full path
    'debates',             # Use full path
    'sarvam_integration',  # Use full path
    'analytics',           # Use full path
    'gamification',
    'learning',
    'realtime_debate',
]

ASGI_APPLICATION = 'config.asgi.application'
# Redis Cloud Configuration
REDIS_CLOUD_HOST = os.getenv('REDIS_CLOUD_HOST', 'redis-14243.crce206.ap-south-1-1.ec2.redns.redis-cloud.com')
REDIS_CLOUD_PORT = int(os.getenv('REDIS_CLOUD_PORT', '14243'))
REDIS_CLOUD_USERNAME = os.getenv('REDIS_CLOUD_USERNAME', 'default')
REDIS_CLOUD_PASSWORD = os.getenv('REDIS_CLOUD_PASSWORD', '4tuvX53iMP8zgDFAuQ2RJVe2uWuekPao')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [{
                'address': (REDIS_CLOUD_HOST, REDIS_CLOUD_PORT),
                'username': REDIS_CLOUD_USERNAME,
                'password': REDIS_CLOUD_PASSWORD,
                'db': 0,
            }],
            "expiry": 60,
            "group_expiry": 86400,
        },
    },
}

# Construct Redis URL for Redis Cloud
REDIS_URL = f"redis://{REDIS_CLOUD_USERNAME}:{REDIS_CLOUD_PASSWORD}@{REDIS_CLOUD_HOST}:{REDIS_CLOUD_PORT}/0"

if DEBUG:
    ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'username': REDIS_CLOUD_USERNAME,
                'password': REDIS_CLOUD_PASSWORD,
                'decode_responses': True,
            }
        }
    }
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Next.js dev server
    # Add your production domain here
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # Global templates directory
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# Enhanced for Indian educational context with multiple language support
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'  # Indian Standard Time
USE_I18N = True
USE_TZ = True

# https://docs.djangoproject.com/en/5.2/howto/static-files/
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'  # For production

# Media files (user uploads, audio files for speech-to-text)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Profile Settings
AUTH_USER_MODEL = 'auth.User'  # Using default User model with profile extension

# Authentication settings
LOGIN_URL = '/auth/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/auth/login/'

# Session Configuration for debate platform
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_AGE = 86400  # 24 hours

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'realtime_debate': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'channels': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'django.channels': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}


# AI Platform Specific Settings
DEBATE_SETTINGS = {
    'MAX_ARGUMENT_LENGTH': 1000,
    'MIN_ARGUMENT_LENGTH': 50,
    'SUPPORTED_LANGUAGES': [
        'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 
        'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'pa-IN'
    ],
    'DEFAULT_LANGUAGE': 'en-IN',
    'AI_RESPONSE_TIMEOUT': 30,  # seconds
    'VOICE_UPLOAD_MAX_SIZE': 5 * 1024 * 1024,  # 5MB
}

REALTIME_DEBATE_SETTINGS = {
    'MAX_AUDIO_CHUNK_SIZE': 1024 * 1024,  # 1MB per audio chunk
    'AUDIO_SAMPLE_RATE': 16000,  # 16kHz
    'SILENCE_THRESHOLD': 0.01,
    'MAX_BUFFER_DURATION': 30.0,  # 30 seconds max buffer
    'SESSION_TIMEOUT': 7200,  # 2 hours
    'HEARTBEAT_INTERVAL': 30,  # 30 seconds
}

# Gamification Settings
GAMIFICATION_SETTINGS = {
    'POINTS_PER_ARGUMENT': 10,
    'POINTS_PER_DEBATE_COMPLETION': 50,
    'POINTS_PER_ACHIEVEMENT': 100,
    'LEVEL_UP_THRESHOLD': 500,  # points needed to level up
}

# Email Configuration (for user notifications)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Development
if not DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# Security Settings (important for production)
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}