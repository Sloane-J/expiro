import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

/**
 * Compresses an image File to target size and dimensions suitable for web upload.
 *
 * Attempts to reduce the file to approximately 0.5 MB and at most 1024 pixels on the longest side; if compression fails, the original file is returned.
 *
 * @param file - The image to compress
 * @returns A `File` containing the compressed image, or the original `file` if compression fails
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1024, 
    useWebWorker: true,
  }
  
  try {
    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    return file // Return original if compression fails
  }
}

/**
 * Compresses an image file, uploads it to the "product-photos" storage bucket, and returns its public URL.
 *
 * @param file - The image File to compress and upload.
 * @returns The public URL of the uploaded image, or `null` if the upload fails.
 */
export async function uploadProductPhoto(file: File): Promise<string | null> {
  try {
   
    const compressedFile = await compressImage(file)
    
    const fileExt = compressedFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `products/${fileName}`
    
    const { error } = await supabase.storage
      .from('product-photos')
      .upload(filePath, compressedFile)
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('product-photos')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('Error uploading photo:', error)
    return null
  }
}