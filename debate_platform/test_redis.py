# test_redis_cloud_fixed.py
import redis
import os
import django
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_redis_cloud_comprehensive():
    """Comprehensive Redis Cloud test with proper encoding"""
    
    print("=== Testing Redis Cloud Connection ===")
    
    # Test 1: Direct Redis connection (DB 0)
    try:
        r_direct = redis.Redis(
            host='redis-14243.crce206.ap-south-1-1.ec2.redns.redis-cloud.com',
            port=14243,
            decode_responses=True,
            username="default",
            password="4tuvX53iMP8zgDFAuQ2RJVe2uWuekPao",
            db=0
        )
        
        success = r_direct.set('test_direct', 'direct_value')
        result = r_direct.get('test_direct')
        print(f"✅ Direct Redis (DB 0): Set={success}, Get={result}")
        
    except Exception as e:
        print(f"❌ Direct Redis failed: {str(e)}")
    
    # Test 2: Channels Redis connection (DB 1)
    try:
        r_channels = redis.Redis(
            host='redis-14243.crce206.ap-south-1-1.ec2.redns.redis-cloud.com',
            port=14243,
            username="default",
            password="4tuvX53iMP8zgDFAuQ2RJVe2uWuekPao",
            db=1
        )
        
        success = r_channels.set('test_channels', 'channels_value')
        result = r_channels.get('test_channels')
        print(f"✅ Channels Redis (DB 1): Set={success}, Get={result}")
        
    except Exception as e:
        print(f"❌ Channels Redis failed: {str(e)}")
    
    # Test 3: Django Cache (DB 2)
    try:
        from django.core.cache import cache
        cache.clear()  # Clear any existing problematic data
        cache.set('django_test_new', 'django_value_new', 60)
        django_result = cache.get('django_test_new')
        print(f"✅ Django cache (DB 2): {django_result}")
        
    except Exception as e:
        print(f"❌ Django cache failed: {str(e)}")
    
    # Test 4: Channel Layer
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        print(f"✅ Channel layer configured: {type(channel_layer).__name__}")
        
    except Exception as e:
        print(f"❌ Channel layer failed: {str(e)}")
    
    # Test 5: Redis Info
    try:
        info = r_direct.info()
        print(f"✅ Redis info - Version: {info.get('redis_version')}, Databases: {info.get('databases', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Redis info failed: {str(e)}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_redis_cloud_comprehensive()
