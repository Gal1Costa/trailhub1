import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import './WhatToBring.css';

export default function WhatToBring({ value, onChange }) {
  const update = (e) => onChange({ ...value, whatToBring: e.target.value });
  const bringItems = value.whatToBring || '';

  // Tooltip component
  const TooltipIcon = ({ text }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);
    const tooltipRef = useRef(null);

    const showTooltip = () => {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 300);
    };

    const hideTooltip = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(false);
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && isVisible) {
          hideTooltip();
        }
      };
      if (isVisible) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [isVisible]);

    return (
      <div
        className="tooltip-trigger tooltip-trigger-top-right"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
        role="button"
        aria-label={`Information: ${text}`}
      >
        <Info className="info-icon" size={14} />
        {isVisible && (
          <div className="info-tooltip info-tooltip-top-right" ref={tooltipRef}>
            <div className="tooltip-content">{text}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="what-to-bring-container">
      <div className="what-to-bring-header">
        <h2 className="what-to-bring-title">What to Bring</h2>
        <TooltipIcon text="List items one per line. Each line becomes a checklist item. Example: Water bottle, Hiking boots, Sunscreen" />
      </div>
      
      <textarea
        value={bringItems}
        onChange={update}
        placeholder={`Water bottle${String.fromCharCode(10)}Hiking boots${String.fromCharCode(10)}Sunscreen${String.fromCharCode(10)}Snacks${String.fromCharCode(10)}First aid kit`}
        rows={8}
        className="what-to-bring-textarea"
      />

      
    </div>
  );
}
