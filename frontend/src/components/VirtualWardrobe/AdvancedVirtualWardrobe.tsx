import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { WardrobeItem } from '../../api/types'
import WardrobeControls from './WardrobeControls'
import '../VirtualWardrobe/WardrobeControls.css'

interface AdvancedVirtualWardrobeProps {
  items: WardrobeItem[]
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onItemSelect?: (item: WardrobeItem) => void
}

const AdvancedVirtualWardrobe: React.FC<AdvancedVirtualWardrobeProps> = ({
  items,
  onDelete,
  onItemSelect
}) => {
  const [spacing, setSpacing] = useState(120)
  const [zoom, setZoom] = useState(1)
  const [is3DView, setIs3DView] = useState(true)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [itemPositions, setItemPositions] = useState<{ [key: string]: number }>({})
  
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleDragStart = useCallback((itemId: string, e: React.DragEvent) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    
    // Add custom drag image
    const dragImage = new Image()
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
    e.dataTransfer.setDragImage(dragImage, 0, 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPosition(targetPosition)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverPosition(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    setDragOverPosition(null)
    
    if (!draggedItem) return

    setItemPositions(prev => {
      const newPositions = { ...prev }
      const draggedPosition = newPositions[draggedItem]
      
      // Shift items between dragged and target positions
      if (draggedPosition < targetPosition) {
        // Moving right
        Object.keys(newPositions).forEach(itemId => {
          const pos = newPositions[itemId]
          if (pos > draggedPosition && pos <= targetPosition) {
            newPositions[itemId] = pos - 1
          }
        })
      } else if (draggedPosition > targetPosition) {
        // Moving left
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

  const sortedItems = [...items].sort((a, b) => 
    (itemPositions[a.id] || 0) - (itemPositions[b.id] || 0)
  )

  return (
    <div className="advanced-virtual-wardrobe">
      <WardrobeControls
        spacing={spacing}
        zoom={zoom}
        onSpacingChange={setSpacing}
        onZoomChange={setZoom}
        onToggleView={() => setIs3DView(!is3DView)}
        is3DView={is3DView}
      />
      
      <div 
        ref={containerRef}
        className={`wardrobe-container ${is3DView ? 'view-3d' : 'view-grid'}`}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        {is3DView ? (
          <div className="wardrobe-frame-3d">
            {/* Top Rod */}
            <div className="wardrobe-rod wardrobe-rod-top" />
            {/* Bottom Rod */}
            <div className="wardrobe-rod wardrobe-rod-bottom" />
            {/* Side Posts */}
            <div className="wardrobe-post wardrobe-post-left" />
            <div className="wardrobe-post wardrobe-post-right" />
            
            <div className="clothing-display">
              {sortedItems.map((item, visualIndex) => (
                <AdvancedHangerItem
                  key={item.id}
                  item={item}
                  position={visualIndex}
                  spacing={spacing}
                  isDragged={draggedItem === item.id}
                  isDragOver={dragOverPosition === visualIndex}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onDelete={onDelete}
                  onSelect={onItemSelect}
                />
              ))}
              
              {/* Add New Item Hanger */}
              <div 
                className="add-item-hanger"
                draggable
                onDragOver={(e) => handleDragOver(e, sortedItems.length)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sortedItems.length)}
              >
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
              <GridItem
                key={item.id}
                item={item}
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
    </div>
  )
}

interface AdvancedHangerItemProps {
  item: WardrobeItem
  position: number
  spacing: number
  isDragged: boolean
  isDragOver: boolean
  onDragStart: (itemId: string, e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, position: number) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, position: number) => void
  onDragEnd: () => void
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onSelect?: (item: WardrobeItem) => void
}

const AdvancedHangerItem: React.FC<AdvancedHangerItemProps> = ({
  item,
  position,
  spacing,
  isDragged,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
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
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, position)}
      onDragEnd={onDragEnd}
      onClick={handleSelect}
    >
      {/* Hanger Hook */}
      <div className="hanger-hook" />
      
      {/* Hanger Body */}
      <div className="hanger-body">
        {/* Clothing Image */}
        <div className="clothing-image-container">
          <img
            src={item.image_url ?? "https://via.placeholder.com/150x200?text=No+Image"}
            alt={item.attributes?.category?.sub ?? "Clothing Item"}
            className="clothing-image"
          />
          <div className="clothing-shadow" />
        </div>
      </div>
      
      {/* Hover Actions */}
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
      
      {/* Item Info */}
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

const GridItem: React.FC<{
  item: WardrobeItem
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onSelect?: (item: WardrobeItem) => void
}> = ({ item, onDelete, onSelect }) => {
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
        <img
          src={item.image_url ?? "https://via.placeholder.com/300x400?text=No+Image"}
          alt={item.attributes?.category?.sub ?? "Clothing Item"}
          className="grid-image"
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

export default AdvancedVirtualWardrobe