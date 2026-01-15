import { useState, useEffect } from 'react';
import { getQuestions, getSuggestedQuestions, addSessionQuestion } from '../services/questionService';
import useSessionQuestions from '../hooks/useSessionQuestions';
import './QuestionPanel.css';

const QuestionPanel = ({ sessionId, sessionData, sessionStatus, isInterviewer, isSessionLive }) => {
  // State for suggested questions
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // State for question bank
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({
    skill: '',
    difficulty: '',
    type: ''
  });

  // State for custom question
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [addingCustomQuestion, setAddingCustomQuestion] = useState(false);

  // Use hook for asked questions with real-time updates
  // Polls for live sessions, fetches once for completed sessions
  const { questions: askedQuestions, loading: loadingAskedQuestions, refetch: refetchAskedQuestions } = useSessionQuestions(sessionId, sessionStatus);

  // State for adding questions - changed to per-question state
  const [addingQuestionId, setAddingQuestionId] = useState(null);

  // Available filter options
  const skillOptions = sessionData?.requestId?.skills || [];
  const difficultyOptions = ['Easy', 'Medium', 'Hard'];
  const typeOptions = ['CODING', 'CONCEPTUAL', 'SYSTEM_DESIGN', 'BEHAVIORAL'];

  // Determine if session is completed
  const isSessionCompleted = sessionStatus === 'COMPLETED';
  const shouldShowQuestions = isSessionLive || isSessionCompleted;

  // Fetch suggested questions when session becomes live
  useEffect(() => {
    if (isSessionLive && isInterviewer && sessionData?.requestId) {
      fetchSuggestedQuestions();
    }
  }, [isSessionLive, isInterviewer, sessionData]);

  // Fetch asked questions on component mount and when session becomes live or completed
  // This is now handled by the useSessionQuestions hook

  // Fetch questions when filters change (only for live sessions)
  useEffect(() => {
    if (isInterviewer && isSessionLive) {
      fetchQuestions();
    }
  }, [filters, isInterviewer, isSessionLive]);

  const fetchSuggestedQuestions = async () => {
    if (!sessionData?.requestId) return;
    
    setLoadingSuggestions(true);
    try {
      const suggestions = await getSuggestedQuestions(
        sessionId,
        sessionData.requestId.skills,
        sessionData.requestId.difficulty,
        sessionData.requestId.interviewTypes
      );
      setSuggestedQuestions(suggestions);
    } catch (error) {
      console.error('Error fetching suggested questions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const fetchedQuestions = await getQuestions({
        category: filters.skill || undefined,
        difficulty: filters.difficulty || undefined,
        type: filters.type || undefined,
        limit: 20
      });
      setQuestions(fetchedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAskQuestion = async (questionId) => {
    if (addingQuestionId) return; // Prevent multiple simultaneous requests
    
    setAddingQuestionId(questionId);
    try {
      await addSessionQuestion(sessionId, { questionId });
      // Refresh asked questions
      await refetchAskedQuestions();
      // Clear selection
      setSelectedQuestion(null);
    } catch (error) {
      console.error('Error asking question:', error);
      alert(error.response.data.message);
    } finally {
      setAddingQuestionId(null);
    }
  };

  const handleAskCustomQuestion = async () => {
    if (!customQuestionText.trim() || addingCustomQuestion) return;
    
    setAddingCustomQuestion(true);
    try {
      await addSessionQuestion(sessionId, { customQuestionText: customQuestionText.trim() });
      // Refresh asked questions
      await refetchAskedQuestions();
      // Clear input
      setCustomQuestionText('');
    } catch (error) {
      console.error('Error asking custom question:', error);
      alert('Failed to ask custom question. Please try again.');
    } finally {
      setAddingCustomQuestion(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  if (!shouldShowQuestions) {
    return (
      <div className="question-panel">
        <div className="question-panel-disabled">
          <p>Questions will be available when the session is live.</p>
        </div>
      </div>
    );
  }

  // For completed sessions, show only the questions asked (read-only mode)
  if (isSessionCompleted) {
    return (
      <div className="question-panel">
        <div className="question-section">
          <h3>Questions Asked in This Interview</h3>
          {loadingAskedQuestions ? (
            <div className="loading">Loading questions...</div>
          ) : askedQuestions.length > 0 ? (
            <div className="asked-questions">
              {askedQuestions.map((question, index) => (
                <div key={question._id} className="asked-question-item">
                  <div className="question-number">Q{index + 1}</div>
                  <div className="question-content">
                    <p className="question-text">{question.questionText}</p>
                    <div className="question-meta">
                      {question.isCustom ? (
                        <span className="badge custom">Custom Question</span>
                      ) : (
                        <div className="question-badges">
                          {question.difficulty && (
                            <span className={`badge difficulty ${question.difficulty?.toLowerCase()}`}>
                              {question.difficulty}
                            </span>
                          )}
                          {question.type && (
                            <span className={`badge type ${question.type?.toLowerCase()}`}>
                              {question.type}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="asked-time">
                        {new Date(question.askedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-asked-questions">No questions were recorded for this session</p>
          )}
        </div>
      </div>
    );
  }

  // For live sessions, show the full question panel
  return (
    <div className="question-panel">
      {isInterviewer && (
        <>
          {/* Suggested Questions Section */}
          <div className="question-section">
            <h3>Suggested Questions</h3>
            {loadingSuggestions ? (
              <div className="loading">Loading suggestions...</div>
            ) : suggestedQuestions.length > 0 ? (
              <div className="suggested-questions">
                {suggestedQuestions.map((question) => (
                  <div key={question._id} className="question-item suggested">
                    <div className="question-content">
                      <p className="question-text">{question.questionText}</p>
                      <div className="question-badges">
                        <span className={`badge difficulty ${question.difficulty.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className={`badge type ${question.type.toLowerCase()}`}>
                          {question.type}
                        </span>
                      </div>
                    </div>
                    <button
                      className="ask-question-btn"
                      onClick={() => handleAskQuestion(question._id)}
                      disabled={addingQuestionId === question._id}
                    >
                      {addingQuestionId === question._id ? 'Adding...' : 'Ask Question'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-suggestions">No suggestions available</p>
            )}
          </div>

          {/* Question Search & Filter Section */}
          <div className="question-section">
            <h3>Question Bank</h3>

            {/* Filters */}
            <div className="question-filters">
              <select
                value={filters.skill}
                onChange={(e) => handleFilterChange('skill', e.target.value)}
                className="filter-select"
                style={{ position: 'relative', zIndex: 100 }}
              >
                <option value="">All Skills</option>
                {skillOptions.map((skill) => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>

              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="filter-select"
                style={{ position: 'relative', zIndex: 100 }}
              >
                <option value="">All Difficulties</option>
                {difficultyOptions.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
                style={{ position: 'relative', zIndex: 100 }}
              >
                <option value="">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Question List */}
            {loadingQuestions ? (
              <div className="loading">Loading questions...</div>
            ) : (
              <div className="question-list">
                {questions.map((question) => (
                  <div
                    key={question._id}
                    className={`question-item ${selectedQuestion?._id === question._id ? 'selected' : ''}`}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <div className="question-content">
                      <p className="question-text">{question.questionText}</p>
                      <div className="question-badges">
                        <span className={`badge difficulty ${question.difficulty.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className={`badge type ${question.type.toLowerCase()}`}>
                          {question.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="no-questions">No questions found with current filters</p>
                )}
              </div>
            )}

            {/* Ask Selected Question Button */}
            {selectedQuestion && (
              <button
                className="ask-selected-btn"
                onClick={() => handleAskQuestion(selectedQuestion._id)}
                disabled={addingQuestionId === selectedQuestion._id}
              >
                {addingQuestionId === selectedQuestion._id ? 'Adding...' : 'Ask Selected Question'}
              </button>
            )}
          </div>

          {/* Custom Question Section */}
          <div className="question-section">
            <h3>Custom Question</h3>
            <div className="custom-question-input">
              <textarea
                value={customQuestionText}
                onChange={(e) => setCustomQuestionText(e.target.value)}
                placeholder="Type your custom question here..."
                className="custom-question-textarea"
                rows={3}
              />
              <button
                className="ask-custom-btn"
                onClick={handleAskCustomQuestion}
                disabled={!customQuestionText.trim() || addingCustomQuestion}
              >
                {addingCustomQuestion ? 'Adding...' : 'Ask Custom Question'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Questions Asked Section (Both Interviewer & Interviewee) */}
      <div className="question-section">
        <h3>Questions Asked</h3>
        {loadingAskedQuestions ? (
          <div className="loading">Loading asked questions...</div>
        ) : askedQuestions.length > 0 ? (
          <div className="asked-questions">
            {askedQuestions.map((question, index) => (
              <div key={question._id} className="asked-question-item">
                <div className="question-number">Q{index + 1}</div>
                <div className="question-content">
                  <p className="question-text">{question.questionText}</p>
                  <div className="question-meta">
                    {question.isCustom ? (
                      <span className="badge custom">Custom</span>
                    ) : (
                      <div className="question-badges">
                        <span className={`badge difficulty ${question.difficulty?.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className={`badge type ${question.type?.toLowerCase()}`}>
                          {question.type}
                        </span>
                      </div>
                    )}
                    <span className="asked-time">
                      {new Date(question.askedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-asked-questions">No questions asked yet</p>
        )}
      </div>
    </div>
  );
};

export default QuestionPanel;