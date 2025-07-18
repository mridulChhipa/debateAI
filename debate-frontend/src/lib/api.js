import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = async (username, password) => {
    const res = await axios.post(`${API_BASE}/token/`, { username, password });
    return res.data; // { access, refresh }
};

export const register = async (username, email, password, age_group) => {
    const res = await axios.post(`${API_BASE}/auth/register/`, {
        username,
        email,
        password,
        age_group,
    });
    return res.data;
};

export const getProfile = async () => {
    const res = await axios.get(`${API_BASE}/auth/profile/`, {
        headers: authHeaders(),
    });
    return res.data;
};

export const getDebateTopics = async () =>
    axios.get(`${API_BASE}/debate-topics/`, {
        headers: authHeaders()
    }).then(res => res.data);

export const getDebateSession = async (id) =>
    axios.get(`${API_BASE}/debate-session/${id}/`, {
        headers: authHeaders(),
    }).then(res => res.data);

export const createDebateSession = async (topicId) =>
    axios
        .post(`${API_BASE}/debate-session/`, { topic: topicId }, { headers: authHeaders() })
        .then(res => res.data);

export const getRecentSessions = async () => {
    try {
        const res = await axios.get(`${API_BASE}/recent-sessions/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Recent sessions API error:', error);
        throw error;
    }
};

export const getSessionArguments = async (sessionId) =>
    axios.get(`${API_BASE}/debate-session/${sessionId}/arguments/`, {
        headers: authHeaders(),
    }).then(res => res.data);

export const postSessionArgument = async (sessionId, content) =>
    axios.post(`${API_BASE}/debate-session/${sessionId}/arguments/`,
        { content },
        { headers: authHeaders() }
    ).then(res => res.data);


export const submitVoiceDebate = async (sessionId, audioBlob) => {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('session_id', sessionId);

        const res = await axios.post(`${API_BASE}/voice-debate/`, formData, {
            headers: {
                ...authHeaders(),
                'Content-Type': 'multipart/form-data'
            },
            timeout: 30000  // 30 second timeout for voice processing
        });

        return res.data;
    } catch (error) {
        console.error('Voice debate submission error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Voice debate failed');
        }
        throw error;
    }
};

export const validateAudioUpload = async (audioBlob) => {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'test.wav');

        const res = await axios.post(`${API_BASE}/validate-audio/`, formData, {
            headers: {
                ...authHeaders(),
                'Content-Type': 'multipart/form-data'
            }
        });

        return res.data;
    } catch (error) {
        console.error('Audio validation error:', error);
        return { valid: false, error: error.response?.data?.error || 'Validation failed' };
    }
};

export const submitTextDebate = async (sessionId, argumentText) => {
    try {
        const res = await axios.post(`${API_BASE}/text-debate/`, {
            session_id: sessionId,
            argument_text: argumentText
        }, {
            headers: authHeaders(),
            timeout: 30000  // 30 second timeout for processing
        });

        return res.data;
    } catch (error) {
        console.error('Text debate submission error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Text debate failed');
        }
        throw error;
    }
};

export const completeDebateSession = async (sessionId) => {
    try {
        const res = await axios.post(`${API_BASE}/complete-session/${sessionId}/`, {}, {
            headers: authHeaders(),
            timeout: 10000  // 10 second timeout
        });

        return res.data;
    } catch (error) {
        console.error('Session completion error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Failed to complete session');
        }
        throw error;
    }
};

export const createDebateTopic = async (topicData) => {
    try {
        const res = await axios.post(`${API_BASE}/create-topic/`, topicData, {
            headers: authHeaders(),
            timeout: 10000  // 10 second timeout
        });

        return res.data;
    } catch (error) {
        console.error('Topic creation error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Failed to create topic');
        }
        throw error;
    }
};

export const setAxiosAuthToken = (token) => {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};


// lib/api.js - Add these learning API functions

// Learning Dashboard
export const getLearningDashboard = async () => {
    try {
        const res = await axios.get(`${API_BASE}/learning/dashboard/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Learning dashboard API error:', error);
        throw error;
    }
};

// Get personalized learning path
export const getPersonalizedLearningPath = async () => {
    try {
        const res = await axios.get(`${API_BASE}/learning/learning-path/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Learning path API error:', error);
        throw error;
    }
};

// Learning Categories
export const getLearningCategories = async () => {
    try {
        const res = await axios.get(`${API_BASE}/learning/categories/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Learning categories API error:', error);
        throw error;
    }
};

// Learning Topics
export const getLearningTopics = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.level) params.append('level', filters.level);
        if (filters.category) params.append('category', filters.category);

        const url = `${API_BASE}/learning/topics/${params.toString() ? '?' + params.toString() : ''}`;
        const res = await axios.get(url, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Learning topics API error:', error);
        throw error;
    }
};

// Get specific learning topic
export const getLearningTopic = async (topicId) => {
    try {
        const res = await axios.get(`${API_BASE}/learning/topics/${topicId}/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Learning topic API error:', error);
        throw error;
    }
};

// Start learning topic
export const startLearningTopic = async (topicId) => {
    try {
        const res = await axios.post(`${API_BASE}/learning/topics/${topicId}/start_topic/`, {}, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Start learning topic API error:', error);
        throw error;
    }
};

// Complete learning topic
export const completeLearningTopic = async (topicId, timeSpent = 0) => {
    try {
        const res = await axios.post(`${API_BASE}/learning/complete-topic/`, {
            topic_id: topicId,
            time_spent: timeSpent
        }, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Complete learning topic API error:', error);
        throw error;
    }
};

// Get user learning progress
export const getUserLearningProgress = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.level) params.append('level', filters.level);
        if (filters.category) params.append('category', filters.category);

        const url = `${API_BASE}/learning/progress/${params.toString() ? '?' + params.toString() : ''}`;
        const res = await axios.get(url, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('User learning progress API error:', error);
        throw error;
    }
};

// Get user learning achievements
export const getUserLearningAchievements = async () => {
    try {
        const res = await axios.get(`${API_BASE}/learning/achievements/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('User learning achievements API error:', error);
        throw error;
    }
};

// Update learning progress (for tracking time spent, etc.)
export const updateLearningProgress = async (topicId, progressData) => {
    try {
        const res = await axios.patch(`${API_BASE}/learning/topics/${topicId}/progress/`, progressData, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Update learning progress API error:', error);
        throw error;
    }
};


// lib/api.js - Add these real-time debate functions

// Create real-time debate room
export const createRealtimeDebateRoom = async (roomData) => {
    try {
        const res = await axios.post(`${API_BASE}/realtime-debate/create-room/`, roomData, {
            headers: authHeaders(),
            timeout: 10000
        });
        return res.data;
    } catch (error) {
        console.error('Create realtime debate room error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Failed to create debate room');
        }
        throw error;
    }
};

// Get real-time debate room details
export const getRealtimeDebateRoom = async (roomId) => {
    try {
        const res = await axios.get(`${API_BASE}/realtime-debate/room/${roomId}/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Get realtime debate room error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Failed to get debate room');
        }
        throw error;
    }
};

// List user's real-time debate rooms
export const getUserRealtimeDebateRooms = async () => {
    try {
        const res = await axios.get(`${API_BASE}/realtime-debate/rooms/`, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Get user realtime debate rooms error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Failed to get debate rooms');
        }
        throw error;
    }
};

// Test streaming TTS functionality
export const testStreamingTTS = async (roomId, text, language = 'en-IN', speaker = 'anushka') => {
    try {
        const res = await axios.post(`${API_BASE}/realtime-debate/test-streaming/`, {
            room_id: roomId,
            text: text,
            language: language,
            speaker: speaker
        }, {
            headers: authHeaders(),
        });
        return res.data;
    } catch (error) {
        console.error('Test streaming TTS error:', error);
        if (error.response?.data) {
            throw new Error(error.response.data.error || 'Failed to test streaming TTS');
        }
        throw error;
    }
};

