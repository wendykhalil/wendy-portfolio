import React, { useState } from 'react'

/**
 * ProjectImageCarousel - Image carousel component for project cards
 * 
 * Features:
 * - Independent carousel state per project card
 * - Left/right arrow navigation with stopPropagation
 * - Pagination dots showing current position
 * - Handles 0, 1, or multiple images gracefully
 * - Hide controls when only 1 or 0 images
 * - stopPropagation prevents triggering parent click handlers
 */
export function ProjectImageCarousel({ 
  images = [], 
  fallbackBackground = '',
  projectTitle = '',
  onImageClick = null 
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Handle cases with no images
  if (!images || images.length === 0) {
    return (
      <div 
        className="carousel-container"
        style={{ background: fallbackBackground }}
      />
    )
  }
  
  const currentImage = images[currentIndex]
  const hasMultipleImages = images.length > 1
  
  const goToPrevious = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }
  
  const goToNext = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }
  
  const goToImage = (index, e) => {
    e.stopPropagation()
    setCurrentIndex(index)
  }
  
  const handleImageClick = (e) => {
    if (onImageClick) {
      e.stopPropagation()
      onImageClick(e)
    }
  }
  
  return (
    <div className="carousel-container">
      {/* Current image */}
      <img
        src={currentImage}
        alt={`${projectTitle} image ${currentIndex + 1}`}
        className="carousel-image"
        onClick={handleImageClick}
        style={{ cursor: onImageClick ? 'pointer' : 'default' }}
      />
      
      {/* Left arrow - only show if multiple images */}
      {hasMultipleImages && (
        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={goToPrevious}
          aria-label="Previous image"
          title="Previous image"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      
      {/* Right arrow - only show if multiple images */}
      {hasMultipleImages && (
        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={goToNext}
          aria-label="Next image"
          title="Next image"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      )}
      
      {/* Pagination dots - only show if multiple images */}
      {hasMultipleImages && (
        <div className="carousel-pagination">
          {images.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={(e) => goToImage(index, e)}
              aria-label={`Go to image ${index + 1}`}
              title={`Image ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      {/* Image counter - only show if multiple images */}
      {hasMultipleImages && (
        <div className="carousel-counter">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
