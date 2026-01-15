import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'
import { questionService } from '../services/questionService'
import './ManageQuestions.css'

const ManageQuestions = () => {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Filters and search
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    type: '',
    search: '',
    showDeleted: false // New filter for showing deleted questions
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [questionsPerPage] = useState(10)
  
  // Edit modal
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [customCategory, setCustomCategory] = useState('') // For edit modal
  
  // Delete confirmation
  const [deletingQuestion, setDeletingQuestion] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteType, setDeleteType] = useState('soft') // 'soft' or 'hard'
  
  // Restore confirmation
  const [restoringQuestion, setRestoringQuestion] = useState(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)

  // Form options
  const difficultyOptions = ['Easy', 'Medium', 'Hard']
  const typeOptions = [
    { value: 'CODING', label: 'Coding' },
    { value: 'CONCEPTUAL', label: 'Conceptual' },
    { value: 'SYSTEM_DESIGN', label: 'System Design' },
    { value: 'BEHAVIORAL', label: 'Behavioral' }
  ]
  const categoryOptions = [
    'DSA', 'MERN', 'JavaScript', 'React', 'Node.js', 'Database', 'System Design', 'Other'
  ]

  // Get unique categories from questions for filter dropdown
  const getUniqueCategories = () => {
    const uniqueCategories = [...new Set(questions.map(q => q.category))]
    const predefinedCategories = categoryOptions.filter(cat => cat !== 'Other')
    const customCategories = uniqueCategories.filter(cat => !predefinedCategories.includes(cat))
    return [...predefinedCategories, ...customCategories.sort()]
  }

  useEffect(() => {
    fetchQuestions()
  }, [filters])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      setError('')
      
      const queryFilters = {}
      if (filters.category) queryFilters.category = filters.category
      if (filters.difficulty) queryFilters.difficulty = filters.difficulty
      if (filters.type) queryFilters.type = filters.type
      
      // Use different service method based on whether we want deleted questions
      let data
      if (filters.showDeleted) {
        data = await questionService.getAllQuestions(queryFilters)
      } else {
        data = await questionService.getQuestions({ ...queryFilters, limit: 1000 })
      }
      
      // Client-side search filtering
      let filteredQuestions = data
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredQuestions = data.filter(question =>
          question.questionText.toLowerCase().includes(searchTerm) ||
          question.category.toLowerCase().includes(searchTerm) ||
          (question.topic && question.topic.toLowerCase().includes(searchTerm))
        )
      }
      
      // If not showing deleted, filter out deleted questions
      if (!filters.showDeleted) {
        filteredQuestions = filteredQuestions.filter(q => !q.isDeleted)
      }
      
      setQuestions(filteredQuestions)
      setCurrentPage(1) // Reset to first page when filters change
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      difficulty: '',
      type: '',
      search: '',
      showDeleted: false
    })
  }

  const handleEdit = (question) => {
    // Don't allow editing deleted questions
    if (question.isDeleted) {
      setError('Cannot edit deleted questions. Please restore the question first.')
      setTimeout(() => setError(''), 3000)
      return
    }
    
    setEditingQuestion({ ...question })
    // Check if the category is a custom one (not in predefined list)
    if (!categoryOptions.includes(question.category)) {
      setCustomCategory(question.category)
      setEditingQuestion(prev => ({ ...prev, category: 'Other' }))
    } else {
      setCustomCategory('')
    }
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      setError('')
      setSuccess('')
      
      // Determine the final category value
      const finalCategory = editingQuestion.category === 'Other' ? customCategory.trim() : editingQuestion.category
      
      if (editingQuestion.category === 'Other' && !customCategory.trim()) {
        setError('Please enter a custom category name')
        return
      }
      
      await questionService.updateQuestion(editingQuestion._id, {
        category: finalCategory,
        topic: editingQuestion.topic,
        difficulty: editingQuestion.difficulty,
        type: editingQuestion.type,
        questionText: editingQuestion.questionText,
        expectedAnswer: editingQuestion.expectedAnswer
      })
      
      setSuccess('Question updated successfully!')
      setShowEditModal(false)
      setEditingQuestion(null)
      setCustomCategory('')
      fetchQuestions()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = (question, type = 'soft') => {
    // Only allow delete operations on active questions
    if (question.isDeleted) {
      setError('This question is already deleted. You can only restore it.')
      setTimeout(() => setError(''), 3000)
      return
    }
    
    setDeletingQuestion(question)
    setDeleteType(type)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      setError('')
      setSuccess('')
      
      if (deleteType === 'hard') {
        await questionService.hardDeleteQuestion(deletingQuestion._id)
        setSuccess('Question permanently deleted!')
      } else {
        await questionService.softDeleteQuestion(deletingQuestion._id)
        setSuccess('Question deleted successfully!')
      }
      
      setShowDeleteModal(false)
      setDeletingQuestion(null)
      setDeleteType('soft')
      fetchQuestions()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRestore = (question) => {
    setRestoringQuestion(question)
    setShowRestoreModal(true)
  }

  const confirmRestore = async () => {
    try {
      setError('')
      setSuccess('')
      
      await questionService.restoreQuestion(restoringQuestion._id)
      
      setSuccess('Question restored successfully!')
      setShowRestoreModal(false)
      setRestoringQuestion(null)
      fetchQuestions()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  // Pagination logic
  const indexOfLastQuestion = currentPage * questionsPerPage
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage
  const currentQuestions = questions.slice(indexOfFirstQuestion, indexOfLastQuestion)
  const totalPages = Math.ceil(questions.length / questionsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const getTypeLabel = (type) => {
    const option = typeOptions.find(opt => opt.value === type)
    return option ? option.label : type
  }

  return (
    <>
      <AdminNavbar />
      <div className="manage-questions-page">
        <div className="page-header">
          <h1>Manage Question Bank</h1>
          <button 
            onClick={() => navigate('/questions/add')} 
            className="add-question-btn"
          >
            + Add New Question
          </button>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="filter-select"
              >
                <option value="">All Difficulties</option>
                {difficultyOptions.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.showDeleted}
                  onChange={(e) => handleFilterChange('showDeleted', e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Show Deleted</span>
              </label>
            </div>
            
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>

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

        {/* Questions List */}
        <div className="questions-section">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="empty-state">
              <h3>No questions found</h3>
              <p>Try adjusting your filters or add some questions to get started.</p>
            </div>
          ) : (
            <>
              <div className="questions-header">
                <p>{questions.length} question{questions.length !== 1 ? 's' : ''} found</p>
                {filters.showDeleted && (
                  <p className="deleted-info">
                    Showing {questions.filter(q => q.isDeleted).length} deleted and {questions.filter(q => !q.isDeleted).length} active questions
                  </p>
                )}
              </div>
              
              <div className="questions-list">
                {currentQuestions.map((question) => (
                  <div key={question._id} className={`question-card ${question.isDeleted ? 'deleted' : ''}`}>
                    <div className="question-header">
                      <div className="question-badges">
                        {question.isDeleted && (
                          <span className="deleted-badge">
                            Deleted
                          </span>
                        )}
                        <span className={`difficulty-badge ${question.difficulty.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className="type-badge">
                          {getTypeLabel(question.type)}
                        </span>
                        <span className="category-badge">
                          {question.category}
                        </span>
                        {question.topic && (
                          <span className="topic-badge">
                            {question.topic}
                          </span>
                        )}
                      </div>
                      <div className="question-actions">
                        {question.isDeleted ? (
                          // Actions for deleted questions - only restore
                          <button
                            onClick={() => handleRestore(question)}
                            className="restore-btn"
                            title="Restore question"
                          >
                            ↩️ Restore
                          </button>
                        ) : (
                          // Actions for active questions - edit, soft delete, hard delete
                          <>
                            <button
                              onClick={() => handleEdit(question)}
                              className="edit-btn"
                              title="Edit question"
                            >
                              ✏️
                            </button>
                            <div className="delete-dropdown">
                              <button
                                className="delete-dropdown-btn"
                                title="Delete options"
                              >
                                🗑️ ▼
                              </button>
                              <div className="delete-dropdown-menu">
                                <button
                                  onClick={() => handleDelete(question, 'soft')}
                                  className="delete-option soft-delete"
                                >
                                  Soft Delete
                                </button>
                                <button
                                  onClick={() => handleDelete(question, 'hard')}
                                  className="delete-option hard-delete"
                                >
                                  Permanent Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="question-content">
                      <p className="question-text">{question.questionText}</p>
                      {question.expectedAnswer && (
                        <div className="expected-answer">
                          <strong>Expected Answer:</strong>
                          <p>{question.expectedAnswer}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="question-footer">
                      <span className="question-date">
                        Created: {new Date(question.createdAt).toLocaleDateString()}
                      </span>
                      {question.updatedAt !== question.createdAt && (
                        <span className="question-date">
                          Updated: {new Date(question.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                      {question.isDeleted && question.deletedAt && (
                        <span className="question-date deleted-date">
                          Deleted: {new Date(question.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => paginate(index + 1)}
                      className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && editingQuestion && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Question</h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={editingQuestion.category}
                    onChange={(e) => {
                      setEditingQuestion(prev => ({
                        ...prev,
                        category: e.target.value
                      }))
                      if (e.target.value !== 'Other') {
                        setCustomCategory('')
                      }
                    }}
                  >
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                {/* Custom Category Input for Edit Modal */}
                {editingQuestion.category === 'Other' && (
                  <div className="form-group custom-category-group">
                    <label>Custom Category</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      required
                    />
                    <small className="field-hint">
                      Enter a new category name
                    </small>
                  </div>
                )}
                
                <div className="form-group">
                  <label>Topic</label>
                  <input
                    type="text"
                    value={editingQuestion.topic || ''}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      topic: e.target.value
                    }))}
                    placeholder="Optional topic"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select
                      value={editingQuestion.difficulty}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        difficulty: e.target.value
                      }))}
                    >
                      {difficultyOptions.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={editingQuestion.type}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        type: e.target.value
                      }))}
                    >
                      {typeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Question Text</label>
                  <textarea
                    value={editingQuestion.questionText}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      questionText: e.target.value
                    }))}
                    rows="4"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Expected Answer</label>
                  <textarea
                    value={editingQuestion.expectedAnswer || ''}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      expectedAnswer: e.target.value
                    }))}
                    rows="3"
                    placeholder="Optional expected answer"
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="save-btn"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingQuestion && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {deleteType === 'hard' ? 'Permanently Delete Question' : 'Soft Delete Question'}
                </h3>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                {deleteType === 'hard' ? (
                  <div>
                    <p><strong>⚠️ Permanent Deletion</strong></p>
                    <p>This will permanently remove the question from the database. This action cannot be undone.</p>
                  </div>
                ) : (
                  <div>
                    <p><strong>Soft Delete</strong></p>
                    <p>This will mark the question as deleted but keep it in the database. You can restore it later if needed.</p>
                  </div>
                )}
                
                <div className="question-preview">
                  <strong>{deletingQuestion.category}</strong> - {deletingQuestion.difficulty}
                  <p>{deletingQuestion.questionText.substring(0, 100)}...</p>
                </div>
                
                {deleteType === 'hard' && (
                  <div className="warning-text">
                    ⚠️ This question will be permanently removed and cannot be recovered.
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className={deleteType === 'hard' ? 'hard-delete-confirm-btn' : 'soft-delete-confirm-btn'}
                >
                  {deleteType === 'hard' ? 'Permanently Delete' : 'Soft Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Confirmation Modal */}
        {showRestoreModal && restoringQuestion && (
          <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
            <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Restore Question</h3>
                <button 
                  onClick={() => setShowRestoreModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <p>Are you sure you want to restore this question? It will become active again.</p>
                <div className="question-preview">
                  <strong>{restoringQuestion.category}</strong> - {restoringQuestion.difficulty}
                  <p>{restoringQuestion.questionText.substring(0, 100)}...</p>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  onClick={() => setShowRestoreModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRestore}
                  className="restore-confirm-btn"
                >
                  Restore Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default ManageQuestions