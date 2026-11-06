/**
 * IconDisplay Component
 * Renders technology icons from Devicon or Simple Icons
 * 
 * Props:
 * - iconId: Icon identifier (e.g., "devicon-react-plain" or "simpleicons-elementor" or "fallback-letter")
 * - skillName: Skill name (used as fallback if icon not found)
 * - size: Icon size class ("xs", "sm", "md", "lg") - default "md"
 * - className: Additional CSS classes
 */

import React from 'react'
import { isDeviconIcon, isSimpleIcon, getDeviconClassName, getSimpleIconName, isFallbackIcon, isLucideIcon, getLucideIconName } from '../services/iconMappingService'

export default function IconDisplay({ iconId, skillName, size = 'md', className = '' }) {
  // Fallback to first letter if no icon
  if (!iconId || isFallbackIcon(iconId)) {
    return (
      <div className={`icon-display icon-fallback size-${size} ${className}`} title={skillName}>
        <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
      </div>
    )
  }

  // Render custom image URL (HTTP/HTTPS) with mauve styling
  if (iconId?.startsWith('http://') || iconId?.startsWith('https://')) {
    return (
      <div className={`icon-display icon-custom-url size-${size} ${className}`} title={skillName}>
        <CustomImageIcon url={iconId} skillName={skillName} />
      </div>
    )
  }

  // Render Lucide icon from CDN
  if (isLucideIcon(iconId)) {
    const lucideName = getLucideIconName(iconId)
    if (!lucideName) {
      // Fallback if invalid Lucide
      return (
        <div className={`icon-display icon-fallback size-${size} ${className}`} title={skillName}>
          <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
        </div>
      )
    }
    return (
      <div className={`icon-display icon-lucide size-${size} ${className}`} title={skillName}>
        <LucideIconSVG iconName={lucideName} skillName={skillName} />
      </div>
    )
  }

  // Render Devicon icon
  if (isDeviconIcon(iconId)) {
    const deviconClass = getDeviconClassName(iconId)
    if (!deviconClass) {
      // Fallback if invalid Devicon
      return (
        <div className={`icon-display icon-fallback size-${size} ${className}`} title={skillName}>
          <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
        </div>
      )
    }
    return (
      <div className={`icon-display icon-devicon size-${size} ${className}`} title={skillName}>
        <i className={`${deviconClass} colored`}></i>
      </div>
    )
  }

  // Render Simple Icons icon using SVG
  if (isSimpleIcon(iconId)) {
    const iconName = getSimpleIconName(iconId)
    if (!iconName) {
      // Fallback if invalid Simple Icon
      return (
        <div className={`icon-display icon-fallback size-${size} ${className}`} title={skillName}>
          <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
        </div>
      )
    }
    // Check if this is one of the three icons that need mauve styling
    const isMauveIcon = ['postman', 'openai', 'ollama'].includes(iconName)
    const mauveClass = isMauveIcon ? 'icon-mauve-styled' : ''
    return (
      <div className={`icon-display icon-simple ${mauveClass} size-${size} ${className}`} title={skillName}>
        <SimpleIconSVG iconName={iconName} skillName={skillName} />
      </div>
    )
  }

  // Final fallback
  return (
    <div className={`icon-display icon-fallback size-${size} ${className}`} title={skillName}>
      <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
    </div>
  )
}

/**
 * SimpleIconSVG Component
 * Renders Simple Icons SVG inline
 * Uses CDN link to fetch SVG on demand
 * Falls back to first letter if SVG fails to load
 */
function SimpleIconSVG({ iconName, skillName }) {
  const [failed, setFailed] = React.useState(false)
  const [svgContent, setSvgContent] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  // Check if this is one of the three icons that need mauve color replacement
  const isMauveIcon = ['postman', 'openai', 'ollama'].includes(iconName)

  // Simple Icons SVG are available at https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/[name].svg
  const svgUrl = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${iconName}.svg`

  // For mauve icons, fetch and inline the SVG to apply direct color replacement
  React.useEffect(() => {
    if (!isMauveIcon) {
      setLoading(false)
      return
    }

    const fetchSvg = async () => {
      try {
        const response = await fetch(svgUrl)
        if (!response.ok) {
          setFailed(true)
          return
        }
        let content = await response.text()
        
        // Process SVG to ensure mauve coloring
        // Strategy: Add a style tag that sets fill to mauve for all paths and shapes
        // This is more robust than regex replacement
        
        // Add SVG namespace if not present
        if (!content.includes('xmlns')) {
          content = content.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
        }
        
        // Add a style tag to force mauve color on all SVG elements
        // This handles fill, stroke, and currentColor cases
        const styleTag = `<style>
          svg * { 
            fill: #8b5cf6 !important; 
            stroke: #8b5cf6 !important;
            stop-color: #8b5cf6 !important;
          }
          svg { 
            color: #8b5cf6 !important; 
          }
        </style>`
        
        // Insert style tag after opening svg tag
        content = content.replace(/(<svg[^>]*>)/, `$1${styleTag}`)
        
        setSvgContent(content)
      } catch (err) {
        console.error(`Error fetching SVG for ${iconName}:`, err)
        setFailed(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSvg()
  }, [isMauveIcon, iconName, svgUrl])

  if (failed) {
    // Fallback to first letter if SVG failed to load
    return (
      <div className="icon-display icon-fallback" title={skillName}>
        <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
      </div>
    )
  }

  // For mauve icons with fetched SVG content, render inline
  if (isMauveIcon) {
    if (loading) {
      return (
        <div className="icon-display icon-fallback" title={skillName}>
          <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
        </div>
      )
    }

    if (svgContent) {
      return (
        <div 
          className="simple-icon-svg-inline"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          title={skillName}
        />
      )
    }
  }

  // For non-mauve icons, use the original img approach
  return (
    <img 
      src={svgUrl}
      alt={iconName}
      className="simple-icon-svg"
      onError={() => {
        // Mark as failed, will trigger re-render with fallback
        setFailed(true)
      }}
    />
  )
}

/**
 * CustomImageIcon Component
 * Renders custom image URLs (HTTP/HTTPS)
 * Falls back to first letter if image fails to load
 * Applies mauve circular background for visual consistency
 */
function CustomImageIcon({ url, skillName }) {
  const [failed, setFailed] = React.useState(false)

  if (failed) {
    // Fallback to first letter if image failed to load
    return (
      <div className="icon-display icon-fallback" title={skillName}>
        <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
      </div>
    )
  }

  return (
    <div className="custom-icon-wrapper">
      <img 
        src={url}
        alt={skillName}
        className="custom-icon-image"
        onError={() => {
          // Mark as failed, will trigger re-render with fallback
          setFailed(true)
        }}
      />
    </div>
  )
}

/**
 * LucideIconSVG Component
 * Renders Lucide icons from CDN
 * Applies mauve coloring and styling for consistency
 */
function LucideIconSVG({ iconName, skillName }) {
  const [failed, setFailed] = React.useState(false)

  // Lucide icons available at https://cdn.jsdelivr.net/npm/lucide@latest/icons/[name].svg
  const svgUrl = `https://cdn.jsdelivr.net/npm/lucide@latest/icons/${iconName}.svg`

  if (failed) {
    // Fallback to first letter if SVG failed to load
    return (
      <div className="icon-display icon-fallback" title={skillName}>
        <span>{skillName?.charAt(0).toUpperCase() || '?'}</span>
      </div>
    )
  }

  return (
    <img 
      src={svgUrl}
      alt={iconName}
      className="lucide-icon-svg"
      onError={() => {
        // Mark as failed, will trigger re-render with fallback
        setFailed(true)
      }}
    />
  )
}
