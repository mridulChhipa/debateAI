from apps.sarvam_integration.services import SarvamAIService
from .models import DebateSession, Argument
import logging

logger = logging.getLogger('debates')

class MultiAgentDebateEngine:
    """Advanced debate engine with multiple AI perspectives"""
    
    def __init__(self, session: DebateSession):
        self.session = session
        self.sarvam_service = SarvamAIService()
        self.debate_agents = {
            'pro': 'AI agent arguing FOR the topic',
            'con': 'AI agent arguing AGAINST the topic', 
            'moderator': 'AI moderator ensuring fair debate',
            'coach': 'AI coach providing feedback to student'
        }
    
    def generate_multi_perspective_debate(self, student_argument: str) -> dict:
        """Generate responses from multiple AI agents"""
        try:
            responses = {}
            
            # Generate opposing argument
            con_response = self.sarvam_service.create_debate_opponent_response(
                self.session.topic.title,
                student_argument,
                stance="opposing",
                language=self.session.language
            )
            
            if con_response['success']:
                responses['opponent'] = con_response['response']
                
                # Save AI opponent argument
                Argument.objects.create(
                    session=self.session,
                    speaker='ai_opponent',
                    content=con_response['response'],
                    argument_type='multi_agent_rebuttal'
                )
            
            # Generate coaching feedback
            coach_feedback = self.sarvam_service.analyze_argument_quality(student_argument)
            if coach_feedback['success']:
                responses['coach'] = coach_feedback['analysis']
            
            # Generate moderator summary
            moderator_prompt = f"""As a debate moderator, provide a brief summary of this exchange:
            
Student argument: {student_argument}
AI opponent response: {responses.get('opponent', 'No response')}

Provide neutral observations about argument quality and suggest next steps."""
            
            moderator_response = self.sarvam_service.create_debate_opponent_response(
                "Debate Moderation",
                moderator_prompt,
                stance="neutral"
            )
            
            if moderator_response['success']:
                responses['moderator'] = moderator_response['response']
            
            return {'success': True, 'responses': responses}
            
        except Exception as e:
            logger.error(f"Multi-agent debate error: {str(e)}")
            return {'success': False, 'error': str(e)}
