from django.core.management.base import BaseCommand
from django.conf import settings
from apps.sarvam_integration.services import SarvamAIService

class Command(BaseCommand):
    help = 'Test Sarvam AI integration'
    
    def handle(self, *args, **options):
        if not settings.SARVAM_API_KEY:
            self.stdout.write(
                self.style.ERROR('SARVAM_API_KEY not found in environment variables')
            )
            return
        
        service = SarvamAIService()
        
        self.stdout.write("Testing debate opponent generation...")
        try:
            result = service.create_debate_opponent_response(
                "Should homework be banned?",
                "Homework is stressful and takes away family time",
                language="en-IN"
            )
            
            if result['success']:
                self.stdout.write(
                    self.style.SUCCESS(f"✓ AI Response: {result['response'][:100]}...")
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"✗ Error: {result['error']}")
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Exception: {str(e)}")
            )
        
        self.stdout.write("\nSarvam AI integration test completed.")
