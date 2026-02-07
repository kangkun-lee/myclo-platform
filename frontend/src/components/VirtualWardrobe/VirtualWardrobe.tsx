import React from 'react'
import type { WardrobeItem } from '../../api/types'

interface VirtualWardrobeProps {
  items: WardrobeItem[]
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onItemSelect?: (item: WardrobeItem) => void
}

const VirtualWardrobe: React.FC<VirtualWardrobeProps> = ({
  items,
  onDelete,
  onItemSelect
}) => {
  return (
    <div className="virtual-wardrobe-container">
      {/* Wardrobe Structure */}
      <div className="wardrobe-frame">
        {/* Top Rod */}
        <div className="wardrobe-rod wardrobe-rod-top" />

        {/* Bottom Rod */}
        <div className="wardrobe-rod wardrobe-rod-bottom" />

        {/* Side Posts */}
        <div className="wardrobe-post wardrobe-post-left" />
        <div className="wardrobe-post wardrobe-post-right" />

        {/* Clothing Items */}
        <div className="clothing-display">
          {items.map((item, index) => (
            <HangerItem
              key={item.id}
              item={item}
              position={index}
              onDelete={onDelete}
              onSelect={onItemSelect}
            />
          ))}
        </div>
      </div>

      {/* Add New Item */}
      <div className="add-item-hanger">
        <div className="hanger-structure">
          <button className="add-hanger-button">
            <span className="material-symbols-outlined">add</span>
            <span>Add Item</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface HangerItemProps {
  item: WardrobeItem
  position: number
  onDelete?: (e: React.MouseEvent, itemId: string) => void
  onSelect?: (item: WardrobeItem) => void
}

const HangerItem: React.FC<HangerItemProps> = ({
  item,
  position,
  onDelete,
  onSelect
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(e, item.id)
  }

  const handleSelect = () => {
    onSelect?.(item)
  }

  return (
    <div
      className="hanger-item"
      style={{
        '--position': position,
        '--z-offset': position % 2 === 0 ? '0px' : '12px',
        '--item-spacing': '120px',
      } as React.CSSProperties}
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

          {/* Clothing Shadow */}
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
          {position + 1}. {item.attributes?.category?.sub ?? "Item"}
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

export default VirtualWardrobe
