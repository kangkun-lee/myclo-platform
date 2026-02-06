import React, { useState, useCallback, useEffect } from 'react'
import type { WardrobeItem } from '../../api/types'
import { PerformanceOptimizer, LazyImage } from './PerformanceOptimizer'
import WardrobeControls from './WardrobeControls'
import '../VirtualWardrobe/WardrobeControls.css'
import '../VirtualWardrobe/PerformanceOptimizer.css'

interface CompleteVirtualWardrobeProps {
  items: WardrobeItem[]
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onItemSelect?: (item: WardrobeItem) => void
}

const CompleteVirtualWardrobe: React.FC<CompleteVirtualWardrobeProps> = ({
  items,
  onDelete,
  onItemSelect
}) => {
  const [spacing, setSpacing] = useState(120)
  const [zoom, setZoom] = useState(1)
  const [is3DView, setIs3DView] = useState(true)
  const [isHighPerformance, setIsHighPerformance] = useState(true)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [itemPositions, setItemPositions] = useState<{ [key: string]: number }>({})
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'date'>('name')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Initialize item positions
  useEffect(() => {
    const positions: { [key: string]: number } = {}
    items.forEach((item, index) => {
      if (itemPositions[item.id] === undefined) {
        positions[item.id] = index
      } else {
        positions[item.id] = itemPositions[item.id]
      }
    })
    setItemPositions(positions)
  }, [items])

  // Filter and sort items
  const filteredAndSortedItems = React.useMemo(() => {
    let filtered = items
    
    // Apply filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.attributes?.category?.main?.toLowerCase() === filterCategory.toLowerCase()
      )
    }
    
    // Apply sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'category':
          return (a.attributes?.category?.main || '').localeCompare(b.attributes?.category?.main || '')
        case 'date':
          return 0 // Implement date sorting if available
        default:
          return (a.attributes?.category?.sub || '').localeCompare(b.attributes?.category?.sub || '')
      }
    })
  }, [items, filterCategory, sortBy])

  const handleDragStart = useCallback((itemId: string, e: React.DragEvent) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPosition(targetPosition)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    setDragOverPosition(null)
    
    if (!draggedItem) return

    setItemPositions(prev => {
      const newPositions = { ...prev }
      const draggedPosition = newPositions[draggedItem]
      
      if (draggedPosition < targetPosition) {
        Object.keys(newPositions).forEach(itemId => {
          const pos = newPositions[itemId]
          if (pos > draggedPosition && pos <= targetPosition) {
            newPositions[itemId] = pos - 1
          }
        })
      } else if (draggedPosition > targetPosition) {
        Object.keys(newPositions).forEach(itemId => {
          const pos = newPositions[itemId]
          if (pos >= targetPosition && pos < draggedPosition) {
            newPositions[itemId] = pos + 1
          }
        })
      }
      
      newPositions[draggedItem] = targetPosition
      return newPositions
    })
    
    setDraggedItem(null)
  }, [draggedItem])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverPosition(null)
  }, [])

  const sortedItems = [...filteredAndSortedItems].sort((a, b) => 
    (itemPositions[a.id] || 0) - (itemPositions[b.id] || 0)
  )

  return (
    <PerformanceOptimizer onPerformanceModeChange={setIsHighPerformance}>
      <div className="complete-virtual-wardrobe">
        {/* Enhanced Controls */}
        <WardrobeControls
          spacing={spacing}
          zoom={zoom}
          onSpacingChange={setSpacing}
          onZoomChange={setZoom}
          onToggleView={() => setIs3DView(!is3DView)}
          is3DView={is3DView}
        />
        
        {/* Filter and Sort Controls */}
        <div className="filter-sort-controls">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="top">Tops</option>
            <option value="bottom">Bottoms</option>
            <option value="outerwear">Outerwear</option>
            <option value="shoes">Shoes</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'category' | 'date')}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>
        
        {/* Wardrobe Container */}
        <div 
          className={`wardrobe-container ${is3DView ? 'view-3d' : 'view-grid'} ${isHighPerformance ? 'high-performance' : 'battery-saver'}`}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {is3DView ? (
            <div className="wardrobe-frame-3d">
              {/* Wardrobe Structure */}
              <div className="wardrobe-rod wardrobe-rod-top" />
              <div className="wardrobe-rod wardrobe-rod-bottom" />
              <div className="wardrobe-post wardrobe-post-left" />
              <div className="wardrobe-post wardrobe-post-right" />
              
              {/* Category Separators */}
              {['top', 'bottom', 'outerwear', 'shoes'].map((category, index) => {
                const categoryItems = sortedItems.filter(item => 
                  item.attributes?.category?.main === category
                )
                if (categoryItems.length === 0) return null
                
                return (
                  <div key={category} className="category-separator">
                    <div className="category-label">{category}</div>
                  </div>
                )
              })}
              
              <div className="clothing-display">
                {sortedItems.map((item, visualIndex) => (
                  <OptimizedHangerItem
                    key={item.id}
                    item={item}
                    position={visualIndex}
                    spacing={spacing}
                    isDragged={draggedItem === item.id}
                    isDragOver={dragOverPosition === visualIndex}
                    isHighPerformance={isHighPerformance}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    onDelete={onDelete}
                    onSelect={onItemSelect}
                  />
                ))}
                
                {/* Add New Item */}
                <div className="add-item-hanger">
                  <div className="hanger-structure">
                    <button 
                      className="add-hanger-button"
                      onClick={() => window.location.href = '/wardrobe/new'}
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="wardrobe-grid">
              {sortedItems.map((item) => (
                <OptimizedGridItem
                  key={item.id}
                  item={item}
                  isHighPerformance={isHighPerformance}
                  onDelete={onDelete}
                  onSelect={onItemSelect}
                />
              ))}
              <div className="grid-item add-item">
                <button 
                  className="add-grid-button"
                  onClick={() => window.location.href = '/wardrobe/new'}
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  <span>Add New Item</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Item Counter */}
        <div className="item-counter">
          <span className="counter-text">
            {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'}
            {filterCategory !== 'all' && ` in ${filterCategory}`}
          </span>
        </div>
      </div>
    </PerformanceOptimizer>
  )
}

interface OptimizedHangerItemProps {
  item: WardrobeItem
  position: number
  spacing: number
  isDragged: boolean
  isDragOver: boolean
  isHighPerformance: boolean
  onDragStart: (itemId: string, e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, position: number) => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent, position: number) => void
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onSelect?: (item: WardrobeItem) => void
}

const OptimizedHangerItem: React.FC<OptimizedHangerItemProps> = ({
  item,
  position,
  spacing,
  isDragged,
  isDragOver,
  isHighPerformance,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onDelete,
  onSelect
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(item.id, e)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(e, item.id)
  }

  const handleSelect = () => {
    onSelect?.(item)
  }

  return (
    <div 
      className={`hanger-item ${isDragged ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      style={{
        '--position': position,
        '--spacing': `${spacing}px`,
        transform: `translateX(${position * spacing}px) translateZ(${position % 2 === 0 ? 0 : 20}px)`,
        opacity: isDragged ? 0.5 : 1
      } as React.CSSProperties}
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => onDragOver(e, position)}
      onDrop={(e) => onDrop(e, position)}
      onDragEnd={onDragEnd}
      onClick={handleSelect}
    >
      <div className="hanger-hook" />
      <div className="hanger-body">
        <div className="clothing-image-container">
          <LazyImage
            src={item.image_url ?? "https://via.placeholder.com/150x200?text=No+Image"}
            alt={item.attributes?.category?.sub ?? "Clothing Item"}
            className="clothing-image"
            isHighPerformance={isHighPerformance}
          />
          {isHighPerformance && <div className="clothing-shadow" />}
        </div>
      </div>
      
      <div className="hanger-actions">
        <button
          onClick={handleDelete}
          className="action-button delete-button"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
        <button className="action-button view-button">
          <span className="material-symbols-outlined">visibility</span>
        </button>
      </div>
      
      <div className="hanger-info">
        <h4 className="item-name">
          {item.attributes?.category?.sub ?? "Item"}
        </h4>
        <div className="item-tags">
          <span className="tag">
            {item.attributes?.category?.main}
          </span>
        </div>
      </div>
    </div>
  )
}

const OptimizedGridItem: React.FC<{
  item: WardrobeItem
  isHighPerformance: boolean
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onSelect?: (item: WardrobeItem) => void
}> = ({ item, isHighPerformance, onDelete, onSelect }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(e, item.id)
  }

  const handleSelect = () => {
    onSelect?.(item)
  }

  return (
    <div className="grid-item" onClick={handleSelect}>
      <div className="grid-image-container">
        <LazyImage
          src={item.image_url ?? "https://via.placeholder.com/300x400?text=No+Image"}
          alt={item.attributes?.category?.sub ?? "Clothing Item"}
          className="grid-image"
          isHighPerformance={isHighPerformance}
        />
      </div>
      <div className="grid-info">
        <h4 className="grid-item-name">
          {item.attributes?.category?.sub ?? "Item"}
        </h4>
        <div className="grid-item-tags">
          <span className="tag">
            {item.attributes?.category?.main}
          </span>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="grid-delete-button"
      >
        <span className="material-symbols-outlined">delete</span>
      </button>
    </div>
  )
}

export default CompleteVirtualWardrobe