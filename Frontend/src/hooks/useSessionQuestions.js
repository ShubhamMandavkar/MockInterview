import { useState, useEffect, useCallback } from 'react';
import { getSessionQuestions } from '../services/questionService';

/**
 * Hook to manage session questions with real-time updates
 * @param {string} sessionId - The session ID
 * @param {string} sessionStatus - The session status (LIVE, COMPLETED, etc.)
 * @returns {Object} - { questions, loading, refetch }
 */
const useSessionQuestions = (sessionId, sessionStatus) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const shouldFetch = sessionStatus === 'LIVE' || sessionStatus === 'COMPLETED';
  const shouldPoll = sessionStatus === 'LIVE'; // Only poll for live sessions

  const fetchQuestions = useCallback(async () => {
    if (!sessionId || !shouldFetch) return;
    
    setLoading(true);
    try {
      const fetchedQuestions = await getSessionQuestions(sessionId);
      setQuestions(fetchedQuestions);
    } catch (error) {
      console.error('Error fetching session questions:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, shouldFetch]);

  // Initial fetch when conditions are met
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Poll for updates every 5 seconds only for live sessions
  useEffect(() => {
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchQuestions();
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldPoll, fetchQuestions]);

  return {
    questions,
    loading,
    refetch: fetchQuestions
  };
};

export default useSessionQuestions;