import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'
import { questionService } from '../services/questionService'
import './AddQuestion.css'

const AddQuestion = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    category: '',
    customCategory: '', // New field for custom category
    topic: '',
    difficulty: '',
    type: '',
    questionText: '',
    expectedAnswer: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form options based on backend model
  const difficultyOptions = ['Easy', 'Medium', 'Hard']
  const typeOptions = [
    { value: 'CODING', label: 'Coding' },
    { value: 'CONCEPTUAL', label: 'Conceptual' },
    { value: 'SYSTEM_DESIGN', label: 'System Design' },
    { value: 'BEHAVIORAL', label: 'Behavioral' }
  ]

  const categoryOptions = [
    'DSA',
    'MERN',
    'JavaScript',
    'React',
    'Node.js',
    'Database',
    'System Design',
    'Other'
  ]

  const getPlaceholderText = () => {
    const { type, category } = formData
    
    if (type === 'CODING' && category === 'DSA') {
      return 'Example: Given an array of integers, find two numbers such that they add up to a specific target. Return indices of the two numbers.'
    } else if (type === 'CONCEPTUAL' && category === 'React') {
      return 'Example: Explain the difference between useState and useReducer hooks in React. When would you use one over the other?'
    } else if (type === 'SYSTEM_DESIGN') {
      return 'Example: Design a URL shortening service like bit.ly. Consider scalability, database design, and caching strategies.'
    } else if (type === 'BEHAVIORAL') {
      return 'Example: Tell me about a time when you had to work with a difficult team member. How did you handle the situation?'
    }
    
    return 'Enter the interview question...'
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear messages when user starts typing
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = () => {
    const { category, customCategory, difficulty, type, questionText } = formData
    
    if (!category.trim()) {
      setError('Category is required')
      return false
    }
    
    // If "Other" is selected, custom category is required
    if (category === 'Other' && !customCategory.trim()) {
      setError('Please enter a custom category name')
      return false
    }
    
    // Validate custom category length and format
    if (category === 'Other' && customCategory.trim().length < 2) {
      setError('Custom category must be at least 2 characters long')
      return false
    }
    
    if (!difficulty) {
      setError('Difficulty level is required')
      return false
    }
    
    if (!type) {
      setError('Question type is required')
      return false
    }
    
    if (!questionText.trim()) {
      setError('Question text is required')
      return false
    }
    
    if (questionText.trim().length < 10) {
      setError('Question text must be at least 10 characters long')
      return false
    }

    if (questionText.trim().length > 2000) {
      setError('Question text must be less than 2000 characters')
      return false
    }

    if (formData.expectedAnswer && formData.expectedAnswer.length > 3000) {
      setError('Expected answer must be less than 3000 characters')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      
      // Clean up form data
      const cleanedData = {
        category: formData.category === 'Other' ? formData.customCategory.trim() : formData.category.trim(),
        topic: formData.topic.trim() || undefined,
        difficulty: formData.difficulty,
        type: formData.type,
        questionText: formData.questionText.trim(),
        expectedAnswer: formData.expectedAnswer.trim() || undefined
      }
      
      await questionService.addQuestion(cleanedData)
      
      setSuccess('Question added successfully!')
      
      // Reset form after successful submission
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      category: '',
      customCategory: '',
      topic: '',
      difficulty: '',
      type: '',
      questionText: '',
      expectedAnswer: ''
    })
    setError('')
    setSuccess('')
  }

  return (
    <>
      <AdminNavbar />
      <div className="add-question-page">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>Add New Question</h1>
      </div>
      
      <div className="form-container">
        <form onSubmit={handleSubmit} className="question-form">
          {/* Category Field */}
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="">Select a category</option>
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Category Input - Show only when "Other" is selected */}
          {formData.category === 'Other' && (
            <div className="form-group custom-category-group">
              <label htmlFor="customCategory">Custom Category</label>
              <input
                type="text"
                id="customCategory"
                name="customCategory"
                value={formData.customCategory}
                onChange={handleChange}
                placeholder="Enter custom category name"
                disabled={loading}
                required
              />
              <small className="field-hint">
                Enter a new category name (e.g., "Machine Learning", "DevOps", "Mobile Development")
              </small>
            </div>
          )}

          {/* Topic Field */}
          <div className="form-group">
            <label htmlFor="topic">Topic</label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="e.g., Arrays, React Hooks, Authentication"
              disabled={loading}
            />
            <small className="field-hint">Optional: Specific topic within the category</small>
          </div>

          {/* Difficulty and Type Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="difficulty">Difficulty Level</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Select difficulty</option>
                {difficultyOptions.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="type">Question Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Select type</option>
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div className="form-group">
            <label htmlFor="questionText">Question Text</label>
            <textarea
              id="questionText"
              name="questionText"
              value={formData.questionText}
              onChange={handleChange}
              placeholder={getPlaceholderText()}
              rows="6"
              disabled={loading}
              required
            />
            <div className="field-footer">
              <small className="field-hint">
                Minimum 10 characters. Be clear and specific.
              </small>
              <small className={`character-count ${
                formData.questionText.length > 1800 ? 'warning' : 
                formData.questionText.length > 2000 ? 'error' : ''
              }`}>
                {formData.questionText.length}/2000 characters
              </small>
            </div>
          </div>

          {/* Expected Answer */}
          <div className="form-group">
            <label htmlFor="expectedAnswer">Expected Answer</label>
            <textarea
              id="expectedAnswer"
              name="expectedAnswer"
              value={formData.expectedAnswer}
              onChange={handleChange}
              placeholder="Optional: Expected answer or key points to look for..."
              rows="4"
              disabled={loading}
            />
            <div className="field-footer">
              <small className="field-hint">
                Optional: This will help interviewers evaluate responses
              </small>
              <small className={`character-count ${
                formData.expectedAnswer.length > 2700 ? 'warning' : 
                formData.expectedAnswer.length > 3000 ? 'error' : ''
              }`}>
                {formData.expectedAnswer.length}/3000 characters
              </small>
            </div>
          </div>

          {/* Question Preview */}
          {formData.questionText && (
            <div className="question-preview">
              <h3>Question Preview</h3>
              <div className="preview-card">
                <div className="preview-header">
                  {formData.difficulty && (
                    <span className={`difficulty-badge ${formData.difficulty.toLowerCase()}`}>
                      {formData.difficulty}
                    </span>
                  )}
                  {formData.type && (
                    <span className="type-badge">
                      {typeOptions.find(t => t.value === formData.type)?.label || formData.type}
                    </span>
                  )}
                </div>
                <div className="preview-category">
                  {formData.category === 'Other' ? formData.customCategory : formData.category} {formData.topic && `• ${formData.topic}`}
                </div>
                <div className="preview-question">
                  {formData.questionText}
                </div>
                {formData.expectedAnswer && (
                  <div className="preview-answer">
                    <strong>Expected Answer:</strong>
                    <p>{formData.expectedAnswer}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="message error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="message success-message">
              {success}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleReset}
              className="reset-button"
              disabled={loading}
            >
              Reset Form
            </button>
            
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Adding Question...
                </>
              ) : (
                'Add Question'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default AddQuestion