import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5, // 500KB max
    maxWidthOrHeight: 1024, // Max dimension
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

export async function uploadProductPhoto(file: File): Promise<string | null> {
  try {
    // Compress image first
    const compressedFile = await compressImage(file)
    
    // Generate unique filename
    const fileExt = compressedFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `products/${fileName}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-photos')
      .upload(filePath, compressedFile)
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-photos')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('Error uploading photo:', error)
    return null
  }
}