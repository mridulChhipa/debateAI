# DebateAI - AI-Powered Debate Learning Platform

[![Django](https://img.shields.io/badge/Django-4.2+-092E20?style=for-the-badge&logo=django&ps://img.shields.io/ps://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoticated AI-powered debate learning platform that helps users improve their argumentation skills through interactive debates with AI opponents, real-time voice conversations, and comprehensive feedback analysis.

## 🚀 Features

### **Core Debate Features**
- **Voice Debates**: Real-time speech-to-text and text-to-speech powered by Sarvam AI
- **Text Debates**: Traditional text-based argument submission with AI analysis
- **Real-time Communication**: WebSocket-based live debate rooms with streaming responses
- **Multilingual Support**: Debate in English, Hindi, Tamil, Telugu, and Bengali

### **AI Integration**
- **Intelligent Opponents**: Dynamic AI responses that adapt to user arguments
- **Argument Analysis**: Real-time quality scoring and logical fallacy detection
- **Speech Processing**: High-quality STT/TTS with multiple Indian language support
- **Contextual Responses**: AI generates relevant counter-arguments based on debate topics

### **Gamification System**
- **Points & Levels**: Earn points for arguments, quality bonuses, and achievements
- **Achievement System**: Unlock badges for milestones and skill improvements
- **Progress Tracking**: Detailed analytics on debate performance and growth
- **Leaderboards**: Compare your skills with other debaters

### **Advanced Features**
- **Session Management**: Persistent debate sessions with argument history
- **Quality Feedback**: AI-powered suggestions for improving arguments
- **Topic Library**: Curated debate topics across different difficulty levels
- **User Profiles**: Track personal statistics and debate history

## 🛠️ Tech Stack

### **Backend**
- **Django 4.2+**: REST API framework with Django REST Framework
- **Channels**: WebSocket support for real-time communication
- **Redis**: Caching, session management, and WebSocket channel layer
- **SQLite/PostgreSQL**: Database for storing users, debates, and analytics
- **JWT**: Token-based authentication with refresh tokens

### **Frontend**
- **Next.js 14+**: React-based framework with App Router
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Beautiful, customizable icons

### **AI & External Services**
- **Sarvam AI**: Speech-to-text, text-to-speech, and language processing
- **WebSocket**: Real-time bidirectional communication
- **Audio Processing**: Browser-based audio recording and playback

## 📦 Installation

### **Prerequisites**
- Python 3.8+
- Node.js 16+
- Redis 6.0+
- Git

### **1. Clone the Repository**
```bash
git clone https://github.com/yourusername/debateai-platform.git
cd debateai-platform
```

### **2. Backend Setup**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env with your configuration

# Database setup
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Load initial data
python manage.py loaddata fixtures/debate_topics.json
python manage.py loaddata fixtures/achievements.json
```

### **3. Frontend Setup**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Environment configuration
cp .env.example .env.local
# Edit .env.local with your configuration

# Build for development
npm run dev
```

### **4. Redis Setup**
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
```

## ⚙️ Configuration

### **Environment Variables**

Create a `.env` file in the project root:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_URL=sqlite:///db.sqlite3

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Sarvam AI Configuration
SARVAM_API_KEY=your-sarvam-api-key
SARVAM_BASE_URL=https://api.sarvam.ai

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_LIFETIME=60  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### **Frontend Configuration**

Create a `.env.local` file in the frontend directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# App Configuration
NEXT_PUBLIC_APP_NAME=DebateAI
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🚀 Running the Application

### **Development Mode**

**Terminal 1 - Django Backend:**
```bash
# Activate virtual environment
source venv/bin/activate

# Start Django development server
python manage.py runserver
```

**Terminal 2 - WebSocket Server:**
```bash
# Start Daphne ASGI server for WebSocket support
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 4 - Redis:**
```bash
redis-server
```

### **Production Deployment**

**Backend:**
```bash
# Install production dependencies
pip install gunicorn

# Collect static files
python manage.py collectstatic

# Run migrations
python manage.py migrate

# Start production server
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

**Frontend:**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📚 API Documentation

### **Authentication Endpoints**
```
POST /api/auth/register/          # User registration
POST /api/auth/login/             # User login
POST /api/token/refresh/          # Refresh JWT token
POST /api/auth/logout/            # User logout
```

### **Debate Endpoints**
```
GET  /api/debate-topics/          # List available topics
POST /api/debate-session/         # Create new debate session
GET  /api/debate-session/{id}/    # Get debate session details
POST /api/text-debate/            # Submit text argument
POST /api/voice-debate/           # Submit voice argument
POST /api/complete-session/{id}/  # Complete debate session
```

### **Gamification Endpoints**
```
GET /api/gamification/stats/           # User gamification stats
GET /api/gamification/achievements/    # User achievements
GET /api/gamification/points-history/  # Points history
```

### **Real-time WebSocket**
```
ws://localhost:8000/ws/debate/{room_id}/
```

**WebSocket Message Types:**
- `start_recording` - Begin voice recording
- `stop_recording` - End voice recording
- `start_debate` - Start debate session
- `end_debate` - End debate session
- `ping` - Connection heartbeat

## 🎯 Usage Examples

### **Starting a Text Debate**
```javascript
import { createDebateSession, submitTextDebate } from '@/lib/api';

// Create a new debate session
const session = await createDebateSession({
  topic_id: 1,
  language: 'en-IN'
});

// Submit an argument
const result = await submitTextDebate(session.id, "Social media has revolutionized communication...");
```

### **Real-time Voice Debate**
```javascript
import { useDebateSocket } from '@/hooks/useDebateSocket';

const DebateRoom = ({ roomId }) => {
  const { socket, isConnected } = useDebateSocket(roomId);
  
  const startRecording = () => {
    socket?.send(JSON.stringify({ type: 'start_recording' }));
  };
  
  return (
    
      
        Start Voice Debate
      
    
  );
};
```

## 🧪 Testing

### **Backend Tests**
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.debates

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

### **Frontend Tests**
```bash
# Run Jest tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📁 Project Structure

```
debateai-platform/
├── backend/
│   ├── config/                 # Django configuration
│   ├── apps/
│   │   ├── authentication/     # User authentication
│   │   ├── debates/           # Core debate functionality
│   │   ├── gamification/      # Points, levels, achievements
│   │   ├── sarvam_integration/ # AI service integration
│   │   ├── realtime_debate/   # WebSocket functionality
│   │   └── analytics/         # User analytics
│   ├── fixtures/              # Initial data
│   ├── static/               # Static files
│   └── media/                # User uploads
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # Reusable components
│   │   ├── lib/             # Utility functions
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript definitions
│   ├── public/              # Public assets
│   └── styles/              # Global styles
├── docs/                    # Documentation
├── requirements.txt         # Python dependencies
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## 🤝 Contributing

We welcome contributions to DebateAI! Please follow these guidelines:

### **Development Setup**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test` and `python manage.py test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### **Code Style**
- **Python**: Follow PEP 8 guidelines
- **JavaScript/TypeScript**: Follow ESLint configuration
- **CSS**: Use Tailwind CSS utility classes
- **Commits**: Use conventional commit format

### **Pull Request Process**
1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Common Issues**

**WebSocket Connection Failed:**
```bash
# Check Redis is running
redis-cli ping

# Verify Daphne is running
ps aux | grep daphne
```

**Audio Recording Not Working:**
- Ensure HTTPS in production (required for microphone access)
- Check browser permissions for microphone

**Sarvam AI Integration Issues:**
- Verify API key is correct
- Check API quota limits
- Ensure proper network connectivity

### **Getting Help**
- 📧 Email: support@debateai.com
- 💬 Discord: [DebateAI Community](https://discord.gg/debateai)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/debateai-platform/issues)

## 🗺️ Roadmap

- [ ] **Mobile App**: React Native companion app
- [ ] **Advanced AI**: GPT-4 integration for more sophisticated opponents
- [ ] **Group Debates**: Multi-user debate rooms
- [ ] **Video Debates**: Video calling integration
- [ ] **Tournament Mode**: Competitive debate tournaments
- [ ] **Learning Paths**: Structured debate skill curriculum
- [ ] **Analytics Dashboard**: Advanced performance insights
- [ ] **API Webhooks**: Third-party integration support

## 📊 Statistics

- **Languages Supported**: 5 (English, Hindi, Tamil, Telugu, Bengali)
- **Debate Topics**: 50+ curated topics across various categories
- **Achievement Types**: 25+ different achievement categories
- **API Endpoints**: 20+ REST API endpoints
- **Real-time Features**: WebSocket-based live communication


  Built with ❤️ using modern web technologies
  
  Empowering the next generation of debaters with AI-powered learning
