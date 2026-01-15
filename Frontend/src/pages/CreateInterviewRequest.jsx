import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './CreateInterviewRequest.css';
import api from '../services/api';
import { interviewRequestService } from '../services/interviewRequestService';


const CreateInterviewRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  
  const [formData, setFormData] = useState({
    skills: [],
    difficulty: '',
    interviewType: [],
    scheduledDateTime: '',
    duration: 60,
  });
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Load existing data if in edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      loadExistingRequest();
    }
  }, [isEditMode, editId]);

  const loadExistingRequest = async () => {
    try {
      setInitialLoading(true);
      const request = await interviewRequestService.getRequestById(editId);
      
      // Format the date for datetime-local input
      const scheduledDate = new Date(request.scheduledAt);
      const formattedDate = scheduledDate.toISOString().slice(0, 16);
      
      setFormData({
        skills: request.skills || [],
        difficulty: request.difficulty || '',
        interviewType: request.interviewTypes || [],
        scheduledDateTime: formattedDate,
        duration: request.duration || 60,
      });
    } catch (error) {
      console.error('Error loading request:', error);
      setErrors({ apiError: 'Failed to load interview request data' });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleMultiSelectChange = (name, values) => {
    setFormData({ ...formData, [name]: values });
  };

  const handleSkillAdd = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !formData.skills.includes(skill)) {
        setFormData({ ...formData, skills: [...formData.skills, skill] });
        setSkillInput('');
      }
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.skills.length) newErrors.skills = 'Skills are required';
    if (!formData.difficulty) newErrors.difficulty = 'Difficulty is required';
    if (!formData.interviewType.length) newErrors.interviewType = 'At least one interview type is required';
    if (!formData.scheduledDateTime) {
      newErrors.scheduledDateTime = 'Scheduled date and time are required';
    } else if (new Date(formData.scheduledDateTime) <= new Date()) {
      newErrors.scheduledDateTime = 'Scheduled time must be in the future';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        skills: formData.skills,
        difficulty: formData.difficulty,
        interviewTypes: formData.interviewType,
        scheduledAt: new Date(formData.scheduledDateTime).toISOString(),
        duration: formData.duration,
      };

      if (isEditMode) {
        await interviewRequestService.updateRequest(editId, requestData);
      } else {
        await api.post('/interview-requests', requestData);
      }
      
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = isEditMode 
        ? 'Failed to update interview request' 
        : 'Failed to create interview request';
      setErrors({ apiError: error.response?.data?.message || errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-interview-request-container">
      <div className="create-interview-request">
        <div className="create-interview-header">
          <h1>{isEditMode ? 'Edit Interview Request' : 'Create Interview Request'}</h1>
          
        </div>
        
        {initialLoading ? (
          <div className="loading-state">Loading request data...</div>
        ) : (
          <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Skills</label>
          <div className="skill-input-container">
            <input
              type="text"
              placeholder="Type a skill and press Enter"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillAdd}
            />
            <button
              type="button"
              className="add-skill-btn"
              onClick={handleSkillAdd}
            >
              Add
            </button>
          </div>
          {errors.skills && <span className="error-message">{errors.skills}</span>}
          <div className="selected-skills">
            {formData.skills.map((skill, index) => (
              <div key={index} className="skill-chip">
                <span>{skill}</span>
                <button
                  type="button"
                  className="remove-skill-btn"
                  onClick={() => handleSkillRemove(skill)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Difficulty</label>
          <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
            <option value="">Select Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          {errors.difficulty && <span className="error-message">{errors.difficulty}</span>}
        </div>

        <div className="form-group">
          <label>Interview Type</label>
          <select
            name="interviewType"
            onChange={(e) => {
              const selectedType = e.target.value;
              if (!formData.interviewType.includes(selectedType)) {
                handleMultiSelectChange('interviewType', [...formData.interviewType, selectedType]);
              }
            }}
          >
            <option value="">Select Interview Type</option>
            <option value="CODING">CODING</option>
            <option value="CONCEPTUAL">CONCEPTUAL</option>
            <option value="SYSTEM_DESIGN">SYSTEM_DESIGN</option>
            <option value="BEHAVIORAL">BEHAVIORAL</option>
          </select>
          {errors.interviewType && <span className="error-message">{errors.interviewType}</span>}
          <div className="selected-types">
            {formData.interviewType.map((type, index) => (
              <div key={index} className="type-box inline-box">
                
                <button
                  type="button"
                  onClick={() =>
                    handleMultiSelectChange(
                      'interviewType',
                      formData.interviewType.filter((t) => t !== type)
                    )
                  }
                >
                  <span>{type}</span> ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Scheduled Date & Time</label>
          <input
            type="datetime-local"
            name="scheduledDateTime"
            value={formData.scheduledDateTime}
            onChange={handleChange}
          />
          {errors.scheduledDateTime && <span className="error-message">{errors.scheduledDateTime}</span>}
        </div>

        <div className="form-group">
          <label>Duration (minutes)</label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            min="1"
          />
        </div>

        {errors.apiError && <div className="error-message">{errors.apiError}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Request' : 'Create Request')}
          </button>
        </form>
        )}
      </div>
    </div>
  );
};

export default CreateInterviewRequest;