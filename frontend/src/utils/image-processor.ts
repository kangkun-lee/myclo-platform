/**
 * Client-side image processing utility.
 * Handles resizing and compression before upload to improve speed and reliability.
 */

export async function processImage(file: File, maxSizeMB: number = 5): Promise<File> {
    const currentSizeMB = file.size / (1024 * 1024)

    // If already small enough, skip processing
    if (currentSizeMB <= maxSizeMB) {
        return file
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement("canvas")
                let width = img.width
                let height = img.height

                // Max dimensions (2048px is enough for high-quality AI analysis)
                const MAX_DIM = 2048
                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width
                        width = MAX_DIM
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height
                        height = MAX_DIM
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"))
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)

                // Compress as JPEG with 0.8 quality
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Canvas to Blob conversion failed"))
                            return
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        })
                        resolve(compressedFile)
                    },
                    "image/jpeg",
                    0.8
                )
            }
            img.onerror = (err) => reject(err)
        }
        reader.onerror = (err) => reject(err)
    })
}
