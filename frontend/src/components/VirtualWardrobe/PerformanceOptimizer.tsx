import React, { useState, useEffect, useCallback, useRef } from 'react'

interface PerformanceOptimizerProps {
  children: React.ReactNode
  onPerformanceModeChange?: (isHighPerformance: boolean) => void
}

const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  children,
  onPerformanceModeChange
}) => {
  const [isHighPerformance, setIsHighPerformance] = useState(true)
  const [frameRate, setFrameRate] = useState(60)
  const [memoryUsage, setMemoryUsage] = useState(0)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(Date.now())
  const frameCountRef = useRef<number>(0)

  // Monitor performance
  useEffect(() => {
    const monitorPerformance = () => {
      const now = Date.now()
      const delta = now - lastTimeRef.current
      frameCountRef.current++

      if (delta >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / delta)
        setFrameRate(currentFps)
        
        // Auto-adjust based on performance
        if (currentFps < 30 && isHighPerformance) {
          setIsHighPerformance(false)
          onPerformanceModeChange?.(false)
        } else if (currentFps > 50 && !isHighPerformance) {
          setIsHighPerformance(true)
          onPerformanceModeChange?.(true)
        }

        frameCountRef.current = 0
        lastTimeRef.current = now
      }

      // Monitor memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryUsage(Math.round(memory.usedJSHeapSize / 1048576)) // MB
      }

      animationFrameRef.current = requestAnimationFrame(monitorPerformance)
    }

    animationFrameRef.current = requestAnimationFrame(monitorPerformance)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isHighPerformance, onPerformanceModeChange])

  const handleManualToggle = useCallback(() => {
    const newMode = !isHighPerformance
    setIsHighPerformance(newMode)
    onPerformanceModeChange?.(newMode)
  }, [isHighPerformance, onPerformanceModeChange])

  return (
    <div className={`performance-optimizer ${isHighPerformance ? 'high-performance' : 'battery-saver'}`}>
      {/* Performance Indicator */}
      <div className="performance-indicator">
        <button
          onClick={handleManualToggle}
          className="performance-toggle"
          title={isHighPerformance ? 'High Performance Mode' : 'Battery Saver Mode'}
        >
          <span className="material-symbols-outlined">
            {isHighPerformance ? 'speed' : 'eco'}
          </span>
        </button>
        
        <div className="performance-stats">
          <div className="stat">
            <span className="material-symbols-outlined">fps_indicator</span>
            <span>{frameRate} FPS</span>
          </div>
          {memoryUsage > 0 && (
            <div className="stat">
              <span className="material-symbols-outlined">memory</span>
              <span>{memoryUsage} MB</span>
            </div>
          )}
        </div>
      </div>

      {/* Render children with performance mode */}
      <div className="performance-content">
        {React.Children.map(children, child => 
          React.isValidElement(child) 
            ? React.cloneElement(child as React.ReactElement, { 
                isHighPerformance 
              }) 
            : child
        )}
      </div>
    </div>
  )
}

// Image lazy loading component
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  isHighPerformance?: boolean
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = "https://via.placeholder.com/150x200?text=Loading...",
  onLoad,
  isHighPerformance = true
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!isHighPerformance) {
      setImageSrc(src)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [src, isHighPerformance])

  useEffect(() => {
    if (!isVisible || !isHighPerformance) return

    const img = new Image()
    img.src = src
    img.onload = () => {
      setImageSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }
  }, [src, isVisible, isHighPerformance, onLoad])

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
      style={{
        opacity: isLoaded ? 1 : 0.7,
        transition: 'opacity 0.3s ease'
      }}
    />
  )
}

// Virtual scrolling for large lists
interface VirtualScrollProps {
  items: any[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: any, index: number, isVisible: boolean) => React.ReactNode
  isHighPerformance?: boolean
}

const VirtualScroll: React.FC<VirtualScrollProps> = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  isHighPerformance = true
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Simple implementation for non-high-performance mode
  if (!isHighPerformance) {
    return (
      <div className="simple-scroll">
        {items.map((item, index) => renderItem(item, index, true))}
      </div>
    )
  }

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  )
  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollTop(scrollContainerRef.current.scrollTop)
    }
  }, [])

  return (
    <div
      ref={scrollContainerRef}
      className="virtual-scroll"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleStart * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {items.slice(visibleStart, visibleEnd).map((item, index) =>
            renderItem(item, visibleStart + index, true)
          )}
        </div>
      </div>
    </div>
  )
}

export { PerformanceOptimizer, LazyImage, VirtualScroll }