import React, { useState, useEffect } from 'react'
import { processClothingImage } from '../../api'

interface ClothingProcessorProps {
  imageUrl: string
  children: (processedImageUrl: string, isLoading: boolean) => React.ReactNode
}

const ClothingProcessor: React.FC<ClothingProcessorProps> = ({
  imageUrl,
  children
}) => {
  const [processedImageUrl, setProcessedImageUrl] = useState<string>(imageUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [lastProcessedSourceUrl, setLastProcessedSourceUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const processImage = async (url: string) => {
      if (!url) return

      // Do not process generated data URLs or placeholders
      if (url.startsWith('data:') || url.includes('placeholder')) {
        if (!cancelled) {
          setProcessedImageUrl(url)
          setLastProcessedSourceUrl(url)
        }
        return
      }

      // Prevent duplicate processing calls for the same source URL
      if (lastProcessedSourceUrl === url) return

      if (!cancelled) {
        setProcessedImageUrl(url)
        setIsLoading(true)
      }

      try {
        const response = await processClothingImage(url, "background_removal")

        if (!cancelled && response.success && response.processed_image_url) {
          setProcessedImageUrl(response.processed_image_url)
        }
      } catch {
        // Keep original image when processing fails
        if (!cancelled) {
          setProcessedImageUrl(url)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setLastProcessedSourceUrl(url)
        }
      }
    }

    processImage(imageUrl)

    return () => {
      cancelled = true
    }
  }, [imageUrl, lastProcessedSourceUrl])

  return (
    <div className="clothing-processor">
      {children(processedImageUrl, isLoading)}
    </div>
  )
}

export default ClothingProcessor
