import api from './api.js';

/**
 * Get questions with optional filters
 * @param {Object} filters - { category, difficulty, type, limit }
 * @returns {Promise} - Array of questions
 */
export const getQuestions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/questions?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

/**
 * Get suggested questions based on session context
 * @param {string} sessionId - Session ID
 * @param {Array} skills - Skills from interview request
 * @param {string} difficulty - Difficulty from interview request
 * @param {Array} interviewTypes - Interview types from request
 * @returns {Promise} - Array of suggested questions
 */
export const getSuggestedQuestions = async (sessionId, skills = [], difficulty = 'Medium', interviewTypes = []) => {
  try {
    // Get questions based on skills and difficulty
    const suggestions = [];
    
    // If we have specific skills, try to get questions for those categories
    if (skills.length > 0) {
      for (const skill of skills.slice(0, 2)) { // Limit to first 2 skills
        try {
          const questions = await getQuestions({
            category: skill,
            difficulty,
            limit: 2
          });
          suggestions.push(...questions);
        } catch (error) {
          console.warn(`No questions found for skill: ${skill}`);
        }
      }
    }
    
    // If we have interview types, get questions for those types
    if (interviewTypes.length > 0 && suggestions.length < 5) {
      for (const type of interviewTypes) {
        if (suggestions.length >= 5) break;
        try {
          const questions = await getQuestions({
            type,
            difficulty,
            limit: 2
          });
          // Avoid duplicates
          const newQuestions = questions.filter(q => 
            !suggestions.some(s => s._id === q._id)
          );
          suggestions.push(...newQuestions);
        } catch (error) {
          console.warn(`No questions found for type: ${type}`);
        }
      }
    }
    
    // If still not enough suggestions, get general questions
    if (suggestions.length < 3) {
      try {
        const generalQuestions = await getQuestions({
          difficulty,
          limit: 5
        });
        const newQuestions = generalQuestions.filter(q => 
          !suggestions.some(s => s._id === q._id)
        );
        suggestions.push(...newQuestions);
      } catch (error) {
        console.warn('Error fetching general questions');
      }
    }
    
    // Return first 5 suggestions
    return suggestions.slice(0, 5);
  } catch (error) {
    console.error('Error getting suggested questions:', error);
    throw error;
  }
};

/**
 * Add a question to interview session
 * @param {string} sessionId - Session ID
 * @param {Object} questionData - { questionId } or { customQuestionText }
 * @returns {Promise} - Session question object
 */
export const addSessionQuestion = async (sessionId, questionData) => {
  try {
    const response = await api.post(`/interview-sessions/${sessionId}/questions`, questionData);
    return response.data;
  } catch (error) {
    console.error('Error adding session question:', error);
    throw error;
  }
};

/**
 * Get questions asked in a session
 * @param {string} sessionId - Session ID
 * @returns {Promise} - Array of session questions
 */
export const getSessionQuestions = async (sessionId) => {
  try {
    const response = await api.get(`/interview-sessions/${sessionId}/questions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching session questions:', error);
    throw error;
  }
};