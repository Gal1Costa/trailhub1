/**
 * Comprehensive validation utilities for Create Hike form
 */

/**
 * Validates a date string to ensure it's not in the past
 */
function validateFutureDate(dateString) {
  if (!dateString) return 'Date is required';
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return 'Date cannot be in the past';
  }
  return null;
}

/**
 * Validates date and time together to ensure they're not in the past
 */
function validateFutureDateTime(dateString, timeString) {
  // First check if date is valid and not in past
  const dateError = validateFutureDate(dateString);
  if (dateError) return dateError;

  // If time is provided and date is today, check if time is in the past
  if (timeString && dateString) {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    // If selected date is today, validate the time is not in the past
    if (selectedDate.getTime() === today.getTime()) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const selectedDateTime = new Date();
      selectedDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      if (selectedDateTime < now) {
        return 'Meeting time cannot be in the past';
      }
    }
  }

  return null;
}

/**
 * Validates a positive number
 */
function validatePositiveNumber(value, fieldName, isRequired = false) {
  if (isRequired && (!value || value === '')) {
    return `${fieldName} is required`;
  }
  if (value && value !== '') {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      return `${fieldName} must be a positive number`;
    }
  }
  return null;
}

/**
 * Validates file size (in bytes) and type
 */
function validateImageFile(file, maxSizeMB = 5) {
  if (!file) return null; // Cover image is optional
  
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return `Image must be one of: JPG, PNG, WebP, or GIF`;
  }
  
  if (file.size > maxSize) {
    return `Image size must be less than ${maxSizeMB}MB`;
  }
  
  return null;
}

/**
 * Validates the complete hike form data
 * @param {Object} formData - The form data object containing basic, trail, route, cover
 * @returns {Object} - Object with isValid boolean and errors object
 */
export function validateHikeForm(formData) {
  const { basic = {}, trail = {}, route = {}, cover = {} } = formData;
  const errors = {};

  // Basic Information Validation
  const basicErrors = {};
  
  if (!basic.name || basic.name.trim() === '') {
    basicErrors.name = 'Hike name is required';
  } else if (basic.name.trim().length < 3) {
    basicErrors.name = 'Hike name must be at least 3 characters';
  } else if (basic.name.trim().length > 100) {
    basicErrors.name = 'Hike name must be less than 100 characters';
  }
  
  const dateError = validateFutureDate(basic.date);
  if (dateError) basicErrors.date = dateError;
  
  if (!basic.meetingTime || basic.meetingTime.trim() === '') {
    basicErrors.meetingTime = 'Meeting time is required';
  } else {
    // Validate that the date and time together are not in the past
    const dateTimeError = validateFutureDateTime(basic.date, basic.meetingTime);
    if (dateTimeError) {
      basicErrors.meetingTime = dateTimeError;
    }
  }
  
  if (!basic.meetingPlace || basic.meetingPlace.trim() === '') {
  basicErrors.meetingPlace = 'Meeting place is required';
} else if (basic.meetingPlace.trim().length > 500) {
  basicErrors.meetingPlace = 'Meeting place must be less than 500 characters';
} else {
  delete basicErrors.meetingPlace;
}
  
  // Default to EASY if not provided
  const difficulty = basic.difficulty || 'EASY';
  
  if (difficulty && difficulty !== '' && !['EASY', 'MODERATE', 'HARD'].includes(difficulty)) {
    basicErrors.difficulty = 'Please select a valid difficulty level';
  }
  
  
  // Capacity validation (REQUIRED, must be 1 or greater)
  if (basic.capacity === undefined || basic.capacity === null || basic.capacity === '') {
    basicErrors.capacity = 'Capacity is required';
  } else {
    const capacity = Number(basic.capacity);
    if (isNaN(capacity) || capacity < 1) {
      basicErrors.capacity = 'Capacity must be at least 1';
    } else if (capacity > 500) {
      basicErrors.capacity = 'Capacity must be less than 500';
    }
  }
  
  // Price validation: must be integer, no decimals, no leading zeros, max 1000
  if (basic.price && basic.price !== '') {
    const priceStr = String(basic.price).trim();
    // Check for leading zeros (but allow single "0")
    if (priceStr.length > 1 && priceStr[0] === '0') {
      basicErrors.price = 'Price cannot have leading zeros';
    } else {
      const priceNum = Number(basic.price);
      if (isNaN(priceNum) || priceNum < 0) {
        basicErrors.price = 'Price must be a positive number';
      } else if (!Number.isInteger(priceNum)) {
        basicErrors.price = 'Price must be a whole number (no decimals)';
      } else if (priceNum > 1000) {
        basicErrors.price = 'Price must be less than or equal to $1000';
      }
    }
  }
  
  // Location validation (REQUIRED)
  if (!basic.location || basic.location.trim() === '') {
      basicErrors.location = 'Location is required';
  } else if (basic.location.trim().length > 200) {
      basicErrors.location = 'Location must be less than 200 characters';
  }
  
  if (Object.keys(basicErrors).length > 0) {
    errors.basic = basicErrors;
  }

  // Trail Details Validation
  const trailErrors = {};
  
  // Distance validation - accepts numbers (from number input) or empty
  if (trail.distance !== undefined && trail.distance !== null && trail.distance !== '') {
    const distanceNum = typeof trail.distance === 'number' ? trail.distance : Number(trail.distance);
    if (isNaN(distanceNum) || distanceNum < 0) {
      trailErrors.distance = 'Distance must be a positive number';
    } else if (distanceNum > 1000) {
      trailErrors.distance = 'Distance must be less than 1000 km';
    }
  }
  
  // Duration validation - depends on multi-day status
  const isMultiDay = trail.isMultiDay === true || basic.isMultiDay === true;
  
  if (isMultiDay) {
    // Multi-day: validate durationDays
    if (!trail.durationDays || trail.durationDays === '') {
      trailErrors.durationDays = 'Number of days is required for multi-day hikes';
    } else {
      const daysNum = typeof trail.durationDays === 'number' ? trail.durationDays : Number(trail.durationDays);
      if (isNaN(daysNum) || !Number.isInteger(daysNum)) {
        trailErrors.durationDays = 'Number of days must be a whole number';
      } else if (daysNum < 2) {
        trailErrors.durationDays = 'Multi-day hikes must be at least 2 days';
      } else if (daysNum > 14) {
        trailErrors.durationDays = 'Multi-day hikes cannot exceed 14 days';
      }
    }
  } else {
    // Single-day: validate durationHours
    const durationHours = trail.durationHours !== undefined ? trail.durationHours : trail.duration;
    if (durationHours !== undefined && durationHours !== null && durationHours !== '') {
      // Handle both numeric and string formats (e.g., "4-5 hours", "4 hours")
      let hoursNum = null;
      
      if (typeof durationHours === 'number') {
        hoursNum = durationHours;
      } else {
        // Extract the first number from string like "4-5 hours" or "4 hours"
        const match = String(durationHours).match(/^(\d+(?:\.\d+)?)/);
        if (match) {
          hoursNum = parseFloat(match[1]);
        }
      }
      
      if (hoursNum === null || isNaN(hoursNum) || hoursNum < 0) {
        trailErrors.durationHours = 'Duration must be a positive number';
      } else if (hoursNum > 24) {
        trailErrors.durationHours = 'Duration must be less than 24 hours for single-day hikes';
      }
    }
  }
  
  // Elevation gain validation - accepts numbers (from number input) or empty
  if (trail.elevationGain !== undefined && trail.elevationGain !== null && trail.elevationGain !== '') {
    const elevationNum = typeof trail.elevationGain === 'number' ? trail.elevationGain : Number(trail.elevationGain);
    if (isNaN(elevationNum) || elevationNum < 0) {
      trailErrors.elevationGain = 'Elevation gain must be a positive number';
    } else if (elevationNum > 10000) {
      trailErrors.elevationGain = 'Elevation gain must be less than 10000 meters';
    }
  }
  
  if (trail.description && trail.description.trim().length > 5000) {
    trailErrors.description = 'Description must be less than 5000 characters';
  }
  
  if (Object.keys(trailErrors).length > 0) {
    errors.trail = trailErrors;
  }

  // Map Route Validation - mode-specific
  const mapMode = route.mapMode || 'simple';
  const hasRoutePoints = Array.isArray(route.points) && route.points.length > 0;
  const hasDestinations = Array.isArray(route.destinations) && route.destinations.length > 0;
  const hasLocation = route.location && typeof route.location === 'object' && route.location.lat && route.location.lng;
  
  const routeErrors = {};
  
  // Validate route data based on mode
  if (mapMode === 'destinations') {
    if (!hasDestinations) {
      routeErrors.points = 'Please add at least one destination on the map';
    }
  } else {
    // Simple mode
    if (!hasRoutePoints) {
      routeErrors.points = 'Please add at least one point on the map';
    }
  }
  
  // Location is required for both modes - but we don't show error message
  // Location is automatically set when user clicks on map
  
  if (Object.keys(routeErrors).length > 0) {
    errors.route = routeErrors;
  }

  // Cover Image Validation
  const coverErrors = {};
  const coverError = validateImageFile(cover.coverFile);
  if (coverError) {
    coverErrors.coverFile = coverError;
  }
  
  if (Object.keys(coverErrors).length > 0) {
    errors.cover = coverErrors;
  }

  // What to Bring - no strict validation, just length check if provided
  // This is handled in basic.whatToBring, but it's optional

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates route data based on map mode
 */
function validateRouteForMode(route, mapMode) {
  const errors = {};
  
  if (mapMode === 'destinations') {
    const hasDestinations = Array.isArray(route.destinations) && route.destinations.length > 0;
    if (!hasDestinations) {
      errors.points = 'Please add at least one destination on the map';
    }
  } else {
    // Simple mode
    const hasRoutePoints = Array.isArray(route.points) && route.points.length > 0;
    if (!hasRoutePoints) {
      errors.points = 'Please add at least one point on the map';
    }
  }
  
  // Location is required for both modes - but we don't show error message
  // Location is automatically set when user clicks on map
  
  return errors;
}

/**
 * Checks if route has valid data based on current mode
 */
function hasValidRouteData(route) {
  const mapMode = route.mapMode || 'simple';
  const hasLocation = route.location && typeof route.location === 'object' && route.location.lat && route.location.lng;
  
  if (!hasLocation) return false;
  
  if (mapMode === 'destinations') {
    return Array.isArray(route.destinations) && route.destinations.length > 0;
  } else {
    return Array.isArray(route.points) && route.points.length > 0;
  }
}

/**
 * Validates a single field (for real-time validation)
 */
export function validateField(section, fieldName, value, allFormData = {}) {
  const { basic = {}, trail = {}, route = {}, cover = {} } = allFormData;
  
  switch (section) {
    case 'basic':
      switch (fieldName) {
        case 'name':
          if (!value || value.trim() === '') return 'Hike name is required';
          if (value.trim().length < 3) return 'Hike name must be at least 3 characters';
          if (value.trim().length > 100) return 'Hike name must be less than 100 characters';
          return null;
        
        case 'date':
          return validateFutureDate(value);
        
        case 'meetingTime':
          if (!value || value.trim() === '') return 'Meeting time is required';
          return null;
        
        case 'meetingPlace':
          if (!value || value.trim() === '') return 'Meeting place is required';
          if (value.trim().length > 500) return 'Meeting place must be less than 500 characters';
          return null;
        
        case 'difficulty':
          // Default to EASY if not provided, only validate if value exists
          const difficultyValue = value || 'EASY';
          if (difficultyValue && difficultyValue !== '' && !['EASY', 'MODERATE', 'HARD'].includes(difficultyValue)) {
            return 'Please select a valid difficulty level';
          }
          return null;
        
        case 'capacity':
          if (value !== undefined && value !== null && value !== '') {
            const capNum = Number(value);
            if (isNaN(capNum) || capNum < 1) {
              return 'Capacity must be at least 1';
            }
            if (capNum > 500) {
              return 'Capacity must be less than 500';
            }
          }
          return null;
        
        case 'price':
          if (value && value !== '') {
            const priceStr = String(value).trim();
            if (priceStr.length > 1 && priceStr[0] === '0') {
              return 'Price cannot have leading zeros';
            }
            const priceNum = Number(value);
            if (isNaN(priceNum) || priceNum < 0) {
              return 'Price must be a positive number';
            }
            if (!Number.isInteger(priceNum)) {
              return 'Price must be a whole number (no decimals)';
            }
            if (priceNum > 1000) {
              return 'Price must be less than or equal to $1000';
            }
          }
          return null;
        
        case 'location':
          if (!value || value.trim() === '') {
              return 'Location is required';
          }
          if (value.trim().length > 200) {
              return 'Location must be less than 200 characters';
          }
          return null;
        
        default:
          return null;
      }
    
    case 'trail':
      switch (fieldName) {
        case 'distance':
          if (value !== undefined && value !== null && value !== '') {
            const distanceNum = typeof value === 'number' ? value : Number(value);
            if (isNaN(distanceNum) || distanceNum < 0) {
              return 'Distance must be a positive number';
            }
            if (distanceNum > 1000) {
              return 'Distance must be less than 1000 km';
            }
          }
          return null;
        
        case 'duration':
        case 'durationHours':
          // Single-day duration validation
          if (value !== undefined && value !== null && value !== '') {
            const durationNum = typeof value === 'number' ? value : Number(value);
            if (isNaN(durationNum) || durationNum < 0) {
              return 'Duration must be a positive number';
            }
            if (durationNum > 24) {
              return 'Duration must be less than 24 hours for single-day hikes';
            }
          }
          return null;
        
        case 'durationDays':
          // Multi-day duration validation
          if (value !== undefined && value !== null && value !== '') {
            const daysNum = typeof value === 'number' ? value : Number(value);
            if (isNaN(daysNum) || !Number.isInteger(daysNum)) {
              return 'Number of days must be a whole number';
            }
            if (daysNum < 2) {
              return 'Multi-day hikes must be at least 2 days';
            }
            if (daysNum > 14) {
              return 'Multi-day hikes cannot exceed 14 days';
            }
          }
          return null;
        
        case 'elevationGain':
          if (value !== undefined && value !== null && value !== '') {
            const elevationNum = typeof value === 'number' ? value : Number(value);
            if (isNaN(elevationNum) || elevationNum < 0) {
              return 'Elevation gain must be a positive number';
            }
            if (elevationNum > 10000) {
              return 'Elevation gain must be less than 10000 meters';
            }
          }
          return null;
        
        case 'description':
          if (value && value.trim().length > 5000) {
            return 'Description must be less than 5000 characters';
          }
          return null;
        
        default:
          return null;
      }
    
    case 'route':
      const mapMode = route.mapMode || 'simple';
      const routeErrors = validateRouteForMode(route, mapMode);
      return routeErrors[fieldName] || null;
    
    case 'cover':
      if (fieldName === 'coverFile') {
        return validateImageFile(value);
      }
      return null;
    
    default:
      return null;
  }
}

/**
 * Gets a user-friendly error message summarizing all validation errors
 * @param {Object} validationResult - The result from validateHikeForm
 * @returns {string|null} - Combined error message or null if valid
 */
export function getValidationErrorMessage(validationResult) {
  if (validationResult.isValid) {
    return null;
  }

  const { errors } = validationResult;
  const errorMessages = [];

  if (errors.basic) {
    const basicErrors = Object.values(errors.basic);
    if (basicErrors.length > 0) {
      errorMessages.push(`Basic Information: ${basicErrors.join(', ')}`);
    }
  }

  if (errors.trail) {
    const trailErrors = Object.values(errors.trail);
    if (trailErrors.length > 0) {
      errorMessages.push(`Trail Details: ${trailErrors.join(', ')}`);
    }
  }

  if (errors.route) {
    const routeErrors = Object.values(errors.route);
    if (routeErrors.length > 0) {
      errorMessages.push(`Map Route: ${routeErrors.join(', ')}`);
    }
  }

  if (errors.cover) {
    const coverErrors = Object.values(errors.cover);
    if (coverErrors.length > 0) {
      errorMessages.push(`Cover Image: ${coverErrors.join(', ')}`);
    }
  }

  return errorMessages.join('. ');
}
