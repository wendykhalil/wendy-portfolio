/**
 * ImageLightbox Component
 * 
 * Full-screen image viewer with keyboard/touch navigation
 * Features:
 * - Large centered image display
 * - Dark overlay background
 * - Previous/Next navigation buttons
 * - Keyboard shortcuts (Left, Right, Escape)
 * - Touch/swipe support for mobile
 * - Current image position indicator (1 / 5)
 * - Prevents background scrolling
 */

import { useEffect, useState } from 'react'
import { Icon } from '../icons'

export function ImageLightbox({ images = [], initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!images || images.length === 0) {
    return null
  }

  // Normalize images to array of URLs
  const imageList = Array.isArray(images)
    ? images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean)
    : []

  if (imageList.length === 0) {
    return null
  }

  const currentImage = imageList[currentIndex]

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev - 1 + imageList.length) % imageList.length)
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev + 1) % imageList.length)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageList.length, onClose])

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX)
    handleSwipe()
  }

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      setCurrentIndex(prev => (prev + 1) % imageList.length)
    } else if (isRightSwipe) {
      setCurrentIndex(prev => (prev - 1 + imageList.length) % imageList.length)
    }
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + imageList.length) % imageList.length)
  }

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % imageList.length)
  }

  return (
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="lightbox-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="lightbox-close"
          onClick={onClose}
          title="Fermer"
          aria-label="Close lightbox"
        >
          <Icon name="close" />
        </button>

        {/* Main image */}
        <div className="lightbox-image-wrapper">
          <img
            src={currentImage}
            alt={`Image ${currentIndex + 1}`}
            className="lightbox-image"
          />
        </div>

        {/* Navigation buttons */}
        {imageList.length > 1 && (
          <>
            <button
              className="lightbox-nav lightbox-prev"
              onClick={goToPrevious}
              title="Précédent (Flèche gauche)"
              aria-label="Previous image"
            >
              <Icon name="chevron-left" />
            </button>
            <button
              className="lightbox-nav lightbox-next"
              onClick={goToNext}
              title="Suivant (Flèche droite)"
              aria-label="Next image"
            >
              <Icon name="chevron-right" />
            </button>

            {/* Image counter */}
            <div className="lightbox-counter">
              {currentIndex + 1} / {imageList.length}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
