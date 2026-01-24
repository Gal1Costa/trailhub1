import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Info, AlertTriangle } from 'lucide-react';
import './CoverImage.css';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10MB in bytes

export default function CoverImage({ value, onChange, errors = {} }) {
  const getError = (field) => errors[field];
  const [preview, setPreview] = useState(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(null);
  const tooltipTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const fileInputRef = useRef(null);
  const changeFileInputRef = useRef(null);

  useEffect(() => {
    // Check if we have an existing preview URL (for edit mode)
    if (value.previewUrl && !value.coverFile) {
      setPreview(value.previewUrl);
      return;
    }

    if (!value.coverFile) {
      setPreview(null);
      setFileSizeError(null);
      return;
    }
    
    // Clear file size error when a valid file is successfully set
    setFileSizeError(null);
    
    const url = URL.createObjectURL(value.coverFile);
    setPreview(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [value.coverFile, value.previewUrl]);

  const handleImageUpload = (e) => {
    const f = e.target.files?.[0] || null;
    const inputElement = e.target;
    
    // Clear any previous file size error
    setFileSizeError(null);
    
    if (f) {
      // Immediate file size validation
      if (f.size > MAX_FILE_SIZE_BYTES) {
        setFileSizeError('Image too large. Maximum size is 10MB. Please choose a smaller file.');
        // Clear the file input
        if (inputElement) {
          inputElement.value = '';
        }
        // Don't proceed with file upload
        return;
      }
      
      // File passes size check, proceed with upload
      console.log('[CoverImage] File selected:', { name: f.name, size: f.size, type: f.type });
      onChange({ ...value, coverFile: f, previewUrl: null });
    }
    
    // Reset input value to allow selecting same file again
    if (e.target === fileInputRef.current && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (e.target === changeFileInputRef.current && changeFileInputRef.current) {
      changeFileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange({ ...value, coverFile: null, previewUrl: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (changeFileInputRef.current) changeFileInputRef.current.value = '';
    setFileSizeError(null);
  };

  const handleChangeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (changeFileInputRef.current) {
      changeFileInputRef.current.value = '';
      changeFileInputRef.current.click();
    }
  };

  // Tooltip handlers with 300ms delay
  const showTooltip = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowInfoTooltip(true);
    }, 300);
  };

  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowInfoTooltip(false);
  };

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard navigation for tooltip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showInfoTooltip) {
        hideTooltip();
      }
    };
    if (showInfoTooltip) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showInfoTooltip]);

  return (
    <div className="cover-image-container">
      <div className="cover-image-title-wrapper">
        <h2 className="cover-image-title">Cover Image</h2>
        <div 
          className="info-icon-wrapper"
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          tabIndex={0}
          role="button"
          aria-label="Information: Image Requirements"
        >
          <Info size={18} className="info-icon" />
          {showInfoTooltip && (
            <div className="info-tooltip" ref={tooltipRef}>
              <div className="tooltip-content">
                <p className="tooltip-title">Image Requirements</p>
                <ul className="tooltip-list">
                  <li>Recommended Aspect Ratio: 16:9</li>
                  <li>Recommended Size: 1200×675px</li>
                  <li>Formats: PNG, JPG, JPEG</li>
                  <li>Max File Size: 10MB</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      {getError('coverFile') && (
        <div className="field-error">{getError('coverFile')}</div>
      )}
      
      {fileSizeError && (
        <div className="file-size-error">
          <AlertTriangle size={16} className="error-icon" />
          <span>{fileSizeError}</span>
        </div>
      )}
      
      {!preview ? (
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden-input"
            id="cover-upload"
          />
          <label htmlFor="cover-upload" className="upload-label">
            <div className="upload-icon-circle">
              <Upload className="upload-icon" size={32} />
            </div>
            <span className="upload-text-primary">Click to upload</span>
          </label>
        </div>
      ) : (
        <div className="preview-area">
          <div className="preview-image-container">
            <img
              src={preview}
              alt="Cover preview"
              className="preview-image"
            />
          </div>
          <div className="preview-overlay-buttons">
            <button
              type="button"
              className="overlay-button change-button"
              onClick={handleChangeClick}
            >
              Change
            </button>
            <input
              ref={changeFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-input"
              id="cover-upload-change"
            />
            <button
              type="button"
              className="overlay-button remove-button"
              onClick={handleRemove}
            >
              <X size={16} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
