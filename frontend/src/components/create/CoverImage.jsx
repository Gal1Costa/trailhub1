import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, RotateCcw, Check, ZoomIn, ZoomOut, Info, AlertTriangle } from 'lucide-react';
import './CoverImage.css';

const ASPECT_RATIO = 16 / 9;
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 675;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10MB in bytes

export default function CoverImage({ value, onChange, errors = {} }) {
  const getError = (field) => errors[field];
  const [preview, setPreview] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.5);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(null);
  const tooltipTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const fileInputRef = useRef(null);
  const changeFileInputRef = useRef(null);
  const containerRef = useRef(null);
  
  // Crop state - coordinates in preview container pixels
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!value.coverFile) {
      setPreview(null);
      setOriginalImage(null);
      setCropMode(false);
      setFileSizeError(null); // Clear file size error when file is removed
      return;
    }
    
    // Clear file size error when a valid file is successfully set
    setFileSizeError(null);
    
    // Use cropped file for preview if available, otherwise use original
    const fileToPreview = value.croppedFile || value.coverFile;
    const url = URL.createObjectURL(fileToPreview);
    setPreview(url);
    
    // Always load original image for cropping
    const originalUrl = URL.createObjectURL(value.coverFile);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
    };
    img.src = originalUrl;
    
    return () => {
      URL.revokeObjectURL(url);
      URL.revokeObjectURL(originalUrl);
    };
  }, [value.coverFile, value.croppedFile]);

  // Calculate how the image is displayed in the container (fit to container, maintaining aspect ratio)
  const calculateDisplayDimensions = useCallback((img, zoomValue = zoom) => {
    if (!containerRef.current || !img) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = containerWidth / ASPECT_RATIO;
    
    const imageAspect = img.width / img.height;
    const containerAspect = ASPECT_RATIO;
    
    // Calculate natural fit dimensions (image fitting container at 1x zoom)
    let naturalWidth, naturalHeight;
    
    if (imageAspect > containerAspect) {
      // Image is wider than container - fit to height
      naturalHeight = containerHeight;
      naturalWidth = naturalHeight * imageAspect;
    } else {
      // Image is taller than container - fit to width
      naturalWidth = containerWidth;
      naturalHeight = naturalWidth / imageAspect;
    }
    
    // Calculate minimum zoom (image should at least fill container in one dimension)
    const minZoomWidth = containerWidth / naturalWidth;
    const minZoomHeight = containerHeight / naturalHeight;
    const calculatedMinZoom = Math.min(minZoomWidth, minZoomHeight);
    setMinZoom(calculatedMinZoom);
    
    // Enforce minimum zoom
    const safeZoom = Math.max(zoomValue, calculatedMinZoom);
    if (zoomValue !== safeZoom && zoomValue < calculatedMinZoom) {
      setZoom(safeZoom);
    }
    
    // Apply zoom
    const finalZoom = Math.max(zoomValue, calculatedMinZoom);
    const scaledWidth = naturalWidth * finalZoom;
    const scaledHeight = naturalHeight * finalZoom;
    const scaledLeft = (containerWidth - scaledWidth) / 2;
    const scaledTop = (containerHeight - scaledHeight) / 2;
    
    setDisplayDimensions({
      width: scaledWidth,
      height: scaledHeight,
      left: scaledLeft,
      top: scaledTop
    });
  }, [zoom]);

  // Initialize crop area to cover most of the displayed image
  const initializeCrop = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = containerWidth / ASPECT_RATIO;
    
    // Crop area should be 90% of container, centered
    const cropWidth = containerWidth * 0.9;
    const cropHeight = cropWidth / ASPECT_RATIO;
    const cropX = (containerWidth - cropWidth) / 2;
    const cropY = (containerHeight - cropHeight) / 2;
    
    setCrop({
      x: Math.max(0, cropX),
      y: Math.max(0, cropY),
      width: Math.min(cropWidth, containerWidth),
      height: Math.min(cropHeight, containerHeight)
    });
  };
  
  // Update display dimensions when zoom changes or image loads
  useEffect(() => {
    if (cropMode && originalImage && containerRef.current) {
      calculateDisplayDimensions(originalImage, zoom);
    }
  }, [zoom, cropMode, originalImage, calculateDisplayDimensions]);

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
      onChange({ ...value, coverFile: f, croppedFile: null });
      setCropMode(false);
    }
    
    // Reset input value to allow selecting same file again (only if file was accepted)
    if (e.target === fileInputRef.current && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (e.target === changeFileInputRef.current && changeFileInputRef.current) {
      changeFileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange({ ...value, coverFile: null, croppedFile: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (changeFileInputRef.current) changeFileInputRef.current.value = '';
    setCropMode(false);
    setFileSizeError(null); // Clear file size error when removing
  };

  const handleChangeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (changeFileInputRef.current) {
      changeFileInputRef.current.value = ''; // Reset to allow same file selection
      changeFileInputRef.current.click();
    }
  };

  const handleStartCrop = () => {
    if (originalImage && containerRef.current) {
      setCropMode(true);
      setZoom(1);
      // Initialize crop after container is rendered
      setTimeout(() => {
        if (containerRef.current && originalImage) {
          calculateDisplayDimensions(originalImage, 1);
          setTimeout(() => {
            initializeCrop();
          }, 50);
        }
      }, 100);
    }
  };
  
  // Check if crop area aspect ratio differs from target
  const cropAspectRatio = (crop.width && crop.height) ? crop.width / crop.height : ASPECT_RATIO;
  const aspectRatioDiff = Math.abs(cropAspectRatio - ASPECT_RATIO) / ASPECT_RATIO;
  const showAspectWarning = aspectRatioDiff > 0.1; // More than 10% difference
  
  // Auto-fit crop to 16:9
  const handleAutoFit = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    
    const currentCropAspect = crop.width / crop.height;
    
    let newWidth, newHeight;
    if (currentCropAspect > ASPECT_RATIO) {
      // Current crop is wider - adjust width to match height
      newHeight = crop.height;
      newWidth = newHeight * ASPECT_RATIO;
    } else {
      // Current crop is taller - adjust height to match width
      newWidth = crop.width;
      newHeight = newWidth / ASPECT_RATIO;
    }
    
    // Ensure crop stays within bounds
    const maxX = containerWidth - newWidth;
    const maxY = (containerWidth / ASPECT_RATIO) - newHeight;
    
    setCrop({
      x: Math.max(0, Math.min(crop.x, maxX)),
      y: Math.max(0, Math.min(crop.y, maxY)),
      width: newWidth,
      height: newHeight
    });
  };

  const handleMouseDown = (e, isHandle = false) => {
    if (!cropMode || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    setIsDragging(!isHandle);
    setIsResizing(isHandle);
    setDragStart({ x, y });
    setCropStart({ ...crop });
  };

  const handleMouseMove = useCallback((e) => {
    if (!cropMode || !containerRef.current) return;
    if (!isDragging && !isResizing) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    
    if (clientX === undefined || clientY === undefined) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    if (isDragging) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerWidth / ASPECT_RATIO;
      
      // Constrain to container bounds and displayed image bounds
      const imageLeft = displayDimensions.left;
      const imageTop = displayDimensions.top;
      const imageRight = imageLeft + displayDimensions.width;
      const imageBottom = imageTop + displayDimensions.height;
      
      const minX = Math.max(0, imageLeft);
      const minY = Math.max(0, imageTop);
      const maxX = Math.min(containerWidth - cropStart.width, imageRight - cropStart.width);
      const maxY = Math.min(containerHeight - cropStart.height, imageBottom - cropStart.height);
      
      const newX = Math.max(minX, Math.min(cropStart.x + deltaX, maxX));
      const newY = Math.max(minY, Math.min(cropStart.y + deltaY, maxY));
      
      setCrop({
        ...cropStart,
        x: newX,
        y: newY
      });
    } else if (isResizing) {
      const deltaWidth = deltaX;
      const newWidth = Math.max(100, cropStart.width + deltaWidth);
      const newHeight = newWidth / ASPECT_RATIO;
      
      // Ensure crop area stays within container and displayed image bounds
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerWidth / ASPECT_RATIO;
      const imageLeft = displayDimensions.left;
      const imageTop = displayDimensions.top;
      const imageRight = imageLeft + displayDimensions.width;
      const imageBottom = imageTop + displayDimensions.height;
      
      const containerMaxWidth = containerWidth - cropStart.x;
      const containerMaxHeight = containerHeight - cropStart.y;
      const imageMaxWidth = imageRight - cropStart.x;
      const imageMaxHeight = imageBottom - cropStart.y;
      
      const maxWidth = Math.min(containerMaxWidth, imageMaxWidth);
      const maxHeight = Math.min(containerMaxHeight, imageMaxHeight);
      
      const constrainedWidth = Math.min(newWidth, maxWidth);
      const constrainedHeight = Math.min(newHeight, maxHeight);
      
      // Maintain aspect ratio - choose the limiting dimension
      const finalWidth = Math.min(constrainedWidth, constrainedHeight * ASPECT_RATIO);
      const finalHeight = finalWidth / ASPECT_RATIO;
      
      setCrop({
        ...cropStart,
        width: finalWidth,
        height: finalHeight
      });
    }
  }, [cropMode, isDragging, isResizing, dragStart, cropStart, displayDimensions]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (cropMode && (isDragging || isResizing)) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [cropMode, isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleReset = () => {
    if (originalImage) {
      setZoom(1);
      setTimeout(() => {
        if (containerRef.current && originalImage) {
          calculateDisplayDimensions(originalImage, 1);
          setTimeout(() => {
            initializeCrop();
          }, 50);
        }
      }, 50);
    }
  };

  const handleApplyCrop = async () => {
    if (!originalImage || !displayDimensions.width || !crop.width || !crop.height) return;
    
    // Calculate crop in original image coordinates using proportional mapping
    const previewWidth = displayDimensions.width;
    const previewHeight = displayDimensions.height;
    const previewLeft = displayDimensions.left;
    const previewTop = displayDimensions.top;
    
    // Clamp crop area to displayed image bounds
    const imageRight = previewLeft + previewWidth;
    const imageBottom = previewTop + previewHeight;
    
    const clampedCropX = Math.max(previewLeft, Math.min(crop.x, imageRight - crop.width));
    const clampedCropY = Math.max(previewTop, Math.min(crop.y, imageBottom - crop.height));
    const clampedCropWidth = Math.min(crop.width, imageRight - clampedCropX);
    const clampedCropHeight = Math.min(crop.height, imageBottom - clampedCropY);
    
    // Crop coordinates relative to displayed image
    const relativeCropX = clampedCropX - previewLeft;
    const relativeCropY = clampedCropY - previewTop;
    
    // Map to original image coordinates proportionally
    const originalCropX = (relativeCropX / previewWidth) * originalImage.width;
    const originalCropY = (relativeCropY / previewHeight) * originalImage.height;
    const originalCropWidth = (clampedCropWidth / previewWidth) * originalImage.width;
    const originalCropHeight = (clampedCropHeight / previewHeight) * originalImage.height;
    
    // Ensure crop is within image bounds
    const finalCropX = Math.max(0, Math.min(originalCropX, originalImage.width));
    const finalCropY = Math.max(0, Math.min(originalCropY, originalImage.height));
    const finalCropWidth = Math.min(originalCropWidth, originalImage.width - finalCropX);
    const finalCropHeight = Math.min(originalCropHeight, originalImage.height - finalCropY);
    
    if (finalCropWidth <= 0 || finalCropHeight <= 0) return;
    
    // Create canvas for final output
    const canvas = document.createElement('canvas');
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext('2d');
    
    // Calculate source aspect ratio for "cover" style cropping
    const sourceAspect = finalCropWidth / finalCropHeight;
    const targetAspect = ASPECT_RATIO;
    
    let sourceX, sourceY, sourceWidth, sourceHeight;
    
    if (sourceAspect > targetAspect) {
      // Source is wider - crop sides (cover style)
      sourceHeight = finalCropHeight;
      sourceWidth = sourceHeight * targetAspect;
      sourceX = finalCropX + (finalCropWidth - sourceWidth) / 2;
      sourceY = finalCropY;
    } else {
      // Source is taller - crop top/bottom (cover style)
      sourceWidth = finalCropWidth;
      sourceHeight = sourceWidth / targetAspect;
      sourceX = finalCropX;
      sourceY = finalCropY + (finalCropHeight - sourceHeight) / 2;
    }
    
    // Draw the cropped portion, scaled to target dimensions (cover style)
    ctx.drawImage(
      originalImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT
    );
    
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], value.coverFile.name, { type: value.coverFile.type || 'image/jpeg' });
        console.log('[CoverImage] Crop completed:', { fileName: croppedFile.name, size: croppedFile.size });
        onChange({ ...value, croppedFile });
        setCropMode(false);
        setZoom(1);
      }
    }, value.coverFile.type || 'image/jpeg', 0.9);
  };

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    // Enforce minimum zoom
    const safeZoom = Math.max(newZoom, minZoom);
    setZoom(safeZoom);
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

  const coverImage = preview;

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
                  <li>Aspect Ratio: 16:9</li>
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
      
      {!coverImage ? (
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
          {cropMode ? (
            <div 
              ref={containerRef}
              className="crop-container"
              style={{ aspectRatio: ASPECT_RATIO }}
            >
              {originalImage && (
                <div className="crop-image-wrapper">
                  <img
                    src={originalImage.src}
                    alt="Cover preview"
                    className="crop-image"
                    style={{ 
                      transform: `scale(${zoom})`,
                      width: `${displayDimensions.width}px`,
                      height: `${displayDimensions.height}px`,
                      position: 'absolute',
                      left: `${displayDimensions.left}px`,
                      top: `${displayDimensions.top}px`,
                      objectFit: 'contain'
                    }}
                    draggable={false}
                  />
                </div>
              )}
              <div className="crop-overlay">
                <div
                  className="crop-area"
                  style={{
                    left: `${crop.x}px`,
                    top: `${crop.y}px`,
                    width: `${crop.width}px`,
                    height: `${crop.height}px`
                  }}
                  onMouseDown={(e) => handleMouseDown(e, false)}
                  onTouchStart={(e) => handleMouseDown(e, false)}
                >
                  <div 
                    className="crop-handle crop-handle-se" 
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, true);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, true);
                    }}
                  />
                </div>
              </div>
              {showAspectWarning && (
                <div className="crop-aspect-warning">
                  <span>Selected area will be adjusted to fit standard cover proportions.</span>
                  <button
                    type="button"
                    className="auto-fit-btn"
                    onClick={handleAutoFit}
                  >
                    Auto-fit to 16:9
                  </button>
                </div>
              )}
              <div className="crop-controls">
                <div className="crop-zoom-control">
                  <ZoomOut size={16} style={{ opacity: zoom <= minZoom ? 0.5 : 1 }} />
                  <input
                    type="range"
                    min={minZoom}
                    max="2"
                    step="0.1"
                    value={zoom}
                    onChange={handleZoomChange}
                    className="zoom-slider"
                    disabled={minZoom >= 2}
                  />
                  <ZoomIn size={16} />
                </div>
                <button
                  type="button"
                  className="crop-control-btn reset-btn"
                  onClick={handleReset}
                  title="Reset"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  className="crop-control-btn apply-btn"
                  onClick={handleApplyCrop}
                >
                  <Check size={16} />
                  Apply
                </button>
                <button
                  type="button"
                  className="crop-control-btn cancel-btn"
                  onClick={() => {
                    setCropMode(false);
                    setZoom(1);
                  }}
                >
                  Cancel
                </button>
              </div>
              <p className="crop-hint">Drag to select the best part of your image for the cover.</p>
              <p className="crop-dimensions-hint">Final cover will be 1200×675px</p>
            </div>
          ) : (
            <>
              <div 
                ref={containerRef}
                className="preview-image-container"
                style={{ aspectRatio: ASPECT_RATIO }}
              >
          <img
            src={coverImage}
            alt="Cover preview"
            className="preview-image"
          />
              </div>
          <div className="preview-overlay-buttons">
                <button
                  type="button"
                  className="overlay-button adjust-button"
                  onClick={handleStartCrop}
                >
                  Adjust cover area
                </button>
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
              Remove
            </button>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
