import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getProductById, updateProduct } from '@/lib/products'
import { uploadProductPhoto } from '@/lib/storage'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [category, setCategory] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Fetch product and populate form
  const { isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
    // Populate form fields once data arrives
    select: (data) => {
      if (!hydrated) {
        setName(data.name)
        setExpiryDate(data.expiry_date)
        setQuantity(data.quantity)
        setCategory(data.category || '')
        setPhotoPreview(data.photo_url || null)
        setHydrated(true)
      }
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | null | undefined = undefined

      // Only upload if a new photo was selected
      if (photoFile) {
        setUploading(true)
        const uploaded = await uploadProductPhoto(photoFile)
        setUploading(false)

        if (!uploaded) {
          throw new Error('Failed to upload photo')
        }

        photoUrl = uploaded
      }

      return updateProduct(id!, {
        name,
        expiry_date: expiryDate,
        quantity,
        category: category || null,
        // Only pass photo_url if a new one was uploaded
        ...(photoUrl !== undefined && { photo_url: photoUrl }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Product updated successfully')
      setTimeout(() => navigate('/home'), 1000)
    },
    onError: (error: Error) => {
      setUploading(false)
      toast.error(error.message || 'Failed to update product')
    },
  })

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (!name || !expiryDate) return
    mutation.mutate()
  }

  const isProcessing = uploading || mutation.isPending

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading product...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-muted-foreground">Product not found or failed to load.</p>
        <Button variant="outline" onClick={() => navigate('/home')} className="rounded-full">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 hover:bg-accent/50"
          disabled={isProcessing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground mt-1">
              Update the product details below
            </p>
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Photo</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="photo-input"
              disabled={isProcessing}
            />
            <label htmlFor="photo-input">
              <div className="relative border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-all duration-200">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Product"
                      className="mx-auto max-h-64 rounded-lg shadow-md object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-4">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Tap to take photo</p>
                      <p className="text-sm text-muted-foreground">
                        Or select from gallery
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <label htmlFor="product-name" className="text-sm font-medium">
              Product Name *
            </label>
            <Input
              id="product-name"
              placeholder="e.g. Milk, Bread, Shampoo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isProcessing}
              className="h-12 text-base"
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <label htmlFor="expiry-date" className="text-sm font-medium">
              Expiry Date *
            </label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={isProcessing}
              className="h-12 text-base"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              disabled={isProcessing}
              className="h-12 text-base"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="category-select" className="text-sm font-medium">
              Category
            </label>
            <div className="relative">
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isProcessing}
                className="w-full h-12 px-4 py-2 border border-input rounded-lg bg-background text-foreground text-base appearance-none cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                <option value="">Select a category</option>
                <option value="Hair Products">Hair Products</option>
                <option value="Body Lotion">Body Lotion</option>
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Dairy">Dairy</option>
                <option value="Canned Goods">Canned Goods</option>
                <option value="Bakery">Bakery</option>
                <option value="Household">Household</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Other">Other</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-full"
              onClick={() => navigate('/home')}
              disabled={isProcessing}
            >
              Cancel
            </Button>

            <Button
              className="flex-1 h-12 rounded-full font-semibold"
              onClick={handleSave}
              disabled={isProcessing || !name || !expiryDate}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}