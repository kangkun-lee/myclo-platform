import React, { useState, useCallback } from 'react'
import type { WardrobeItem } from '../../api/types'

interface WardrobeControlsProps {
  spacing: number
  zoom: number
  onSpacingChange: (spacing: number) => void
  onZoomChange: (zoom: number) => void
  onToggleView: () => void
  is3DView: boolean
}

const WardrobeControls: React.FC<WardrobeControlsProps> = ({
  spacing,
  zoom,
  onSpacingChange,
  onZoomChange,
  onToggleView,
  is3DView
}) => {
  return (
    <div className="wardrobe-controls">
      {/* View Toggle */}
      <div className="control-group">
        <button 
          onClick={onToggleView}
          className="control-button view-toggle"
        >
          <span className="material-symbols-outlined">
            {is3DView ? "view_in_ar" : "grid_view"}
          </span>
          {is3DView ? "3D View" : "Grid View"}
        </button>
      </div>

      {/* Spacing Control */}
      <div className="control-group">
        <label className="control-label">Spacing</label>
        <div className="slider-container">
          <input
            type="range"
            min="80"
            max="200"
            value={spacing}
            onChange={(e) => onSpacingChange(Number(e.target.value))}
            className="control-slider"
          />
          <span className="slider-value">{spacing}px</span>
        </div>
      </div>

      {/* Zoom Control */}
      <div className="control-group">
        <label className="control-label">Zoom</label>
        <div className="zoom-buttons">
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
            className="zoom-button"
            disabled={zoom <= 0.5}
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
            className="zoom-button"
            disabled={zoom >= 2}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      {/* Additional Controls */}
      <div className="control-group">
        <button className="control-button">
          <span className="material-symbols-outlined">sort</span>
          Sort
        </button>
        <button className="control-button">
          <span className="material-symbols-outlined">filter_list</span>
          Filter
        </button>
      </div>
    </div>
  )
}

export default WardrobeControls