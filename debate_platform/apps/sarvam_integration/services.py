import json
import requests
import logging
from django.conf import settings
from typing import Dict, Any, List, Optional
from sarvamai import SarvamAI
from sarvamai.core.api_error import ApiError

from sarvamai.play import play, save

logger = logging.getLogger('sarvam_integration')

class SarvamAIService:
    def __init__(self):
        self.client = SarvamAI(
            api_subscription_key=settings.SARVAM_API_KEY
        )

        self.base_url = settings.SARVAM_BASE_URL
        self.headers = {
            'api-subscription-key': settings.SARVAM_API_KEY,
            'Content-Type': 'application/json'
        }

        self.api_key = settings.SARVAM_API_KEY
    
    def preprocess_text(self, text: str) -> str:
        text = text.strip()
        text = ' '.join(text.split())
        return text
    
    def create_debate_opponent_response(self, topic: str, student_argument: str, 
                                     stance: str = "opposing", language: str = 'en-IN') -> Dict[str, Any]:
        """Generate AI opponent response using Sarvam AI"""
        
        clean_argument = self.preprocess_text(student_argument)
        
        system_prompt = f"""You are an AI debate opponent. Your task is to argue the {stance} position on the topic: "{topic}".
        
Rules:
1. Provide logical counter-arguments to the student's position
2. Use evidence and examples when possible
3. Identify any logical fallacies in the student's argument
4. Keep responses focused and under 200 words
5. Be respectful but firm in your opposition
6. If student argument is off topic then point it to him instead of giving counter arguments
Student's argument: {clean_argument}

Your response:"""
        
        try:
            response = self.client.chat.completions(
                messages=[
                    {"role": "system", "content": "You are an expert debate opponent."},
                    {"role": "user", "content": system_prompt}
                ],
            )
            
            logger.info(f"AI opponent response generated for topic: {topic}")
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'usage': getattr(response, 'usage', {})
            }
            
        except ApiError as e:
            logger.error(f"Sarvam AI API error: {e.status_code} - {e.body}")
            return {'success': False, 'error': f"API Error: {e.status_code}"}
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def text_analytics(self, text: str, questions: list) -> Dict[str, Any]:
        """
        Analyze text using Sarvam AI Text Analytics API
        """
        try:
            url = f"{self.base_url}/text-analytics"
            
            # Format questions for the API
            questions_formatted = json.dumps(questions)
            
            payload = {
                "text": text,
                "questions": questions_formatted
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "api-subscription-key": self.api_key
            }
            
            response = requests.post(url, data=payload, headers=headers)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                logger.error(f"Text analytics API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': f"API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Text analytics error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
    }
    
    def analyze_argument_quality(self, argument_text: str) -> Dict[str, Any]:        
        clean_text = self.preprocess_text(argument_text)
        
        questions = [
            {
                "id": "structure_score",
                "text": "Rate the logical structure of this argument from 1-10, where 10 is perfectly structured with clear claim, evidence, and reasoning.",
                "type": "number"
            },
            {
                "id": "evidence_quality",
                "text": "Rate the quality and relevance of evidence provided in this argument from 1-10.",
                "type": "number"
            },
            {
                "id": "effectiveness",
                "text": "Rate the overall persuasiveness and effectiveness of this argument from 1-10.",
                "type": "number"
            },
            {
                "id": "logical_issues",
                "text": "Identify any logical fallacies or reasoning errors in this argument. List them clearly.",
                "type": "long answer"
            },
            {
                "id": "improvements",
                "text": "Provide specific suggestions to improve this argument's structure, evidence, and persuasiveness.",
                "type": "long answer"
            }
        ]

        url = f"{self.base_url}/text-analytics"
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "api-subscription-key": settings.SARVAM_API_KEY,
        }
        
        payload = {
            "text": clean_text,
            "questions": json.dumps(questions)
        }

        try:
            response = requests.post(url, headers=headers, data=payload)
            response.raise_for_status()
            
            result = response.json()
            answers = result.get('answers', [])
                        
            logger.info("Argument analysis completed using Text Analytics API")
            return {'success': True, 'analysis': answers}
            
        except requests.RequestException as e:
            logger.error(f"Text Analytics API error: {str(e)}")

            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            return {'success': False, 'error': f"Analysis failed: {str(e)}"}
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def translate_text(self, text: str, target_language: str = 'hi-IN') -> Dict[str, Any]:
        try:
            response = self.client.text.translate(
                input=text,
                source_language_code="en-IN",
                target_language_code=target_language,
                mode="formal"
            )
            
            return {
                'success': True,
                'translated_text': response.translated_text
            }
            
        except ApiError as e:
            logger.error(f"Translation error: {e.status_code} - {e.body}")
            return {'success': False, 'error': f"Translation failed: {e.status_code}"}
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        try:
            response = self.client.text.identify_language(input=text)
            
            return {
                'success': True,
                'language_code': response.language_code,
                'confidence': getattr(response, 'confidence', None)
            }
            
        except ApiError as e:
            logger.error(f"Language detection error: {e.status_code} - {e.body}")
            return {'success': False, 'error': f"Language detection failed: {e.status_code}"}
        
    def text_to_speech(self, text: str, language: str = 'hi-IN', speaker: str = 'anushka') -> Dict[str, Any]:
        try:
            response = self.client.text_to_speech.convert(
                text=text,
                target_language_code=language,
                speaker=speaker,
                model="bulbul:v2",
                speech_sample_rate=8000
            )
            
            # Save using the play utility
            save(response, "output.wav")
            
            return {
                'success': True,
                'audio_data': response
            }
                
        except ApiError as e:
            logger.error(f"Text-to-speech error: {e.status_code} - {e.body}")
            return {'success': False, 'error': f"Speech synthesis failed: {e.status_code}"}
        except Exception as e:
            logger.error(f"TTS unexpected error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def speech_to_text(self, audio_file, language_code: str = 'hi-IN') -> Dict[str, Any]:
        try:
            response = self.client.speech_to_text.transcribe(
                file=audio_file,
                language_code=language_code,
                model="saarika:v2"
            )
            
            return {
                'success': True,
                'transcript': response.transcript,
                'language_detected': getattr(response, 'language_code', language_code)
            }
            
        except ApiError as e:
            logger.error(f"Speech-to-text error: {e.status_code} - {e.body}")
            return {'success': False, 'error': f"Speech recognition failed: {e.status_code}"}

    def speech_to_text_translate(self, audio_file, target_language: str = 'en-IN') -> Dict[str, Any]:
        try:
            response = self.client.speech_to_text.translate(
                file=audio_file,
                model="saaras:v2"
            )
            
            return {
                'success': True,
                'transcript': response.transcript,
                'language': response.language
            }
            
        except ApiError as e:
            logger.error(f"Speech-to-text-translate error: {e.status_code} - {e.body}")
            return {'success': False, 'error': f"Speech translation failed: {e.status_code}"}

