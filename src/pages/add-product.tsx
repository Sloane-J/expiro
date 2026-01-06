import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addProduct } from '@/lib/products'
import { uploadProductPhoto } from '@/lib/storage'

export default function AddProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const mutation = useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      showToast('success', 'Product added successfully!')
      setTimeout(() => navigate('/home'), 1500)
    },
    onError: () => {
      showToast('error', 'Failed to save product')
    },
  })

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
      showToast('success', 'Photo selected')
    }
  }

  const handleSave = async () => {
    setUploading(true)
    
    // Upload photo if exists
    let photoUrl = null
    if (photoFile) {
      showToast('success', 'Uploading photo...')
      photoUrl = await uploadProductPhoto(photoFile)
      if (!photoUrl) {
        showToast('error', 'Failed to upload photo')
        setUploading(false)
        return
      }
      showToast('success', 'Photo uploaded successfully!')
    }

    // Save product
    mutation.mutate({
      name,
      expiry_date: expiryDate,
      photo_url: photoUrl,
      quantity,
      category: category || null,
    })
    
    setUploading(false)
  }

  const isLoading = uploading || mutation.isPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-5 ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 hover:bg-accent/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Product</h1>
            <p className="text-muted-foreground mt-1">
              Add a new product to track its expiry date
            </p>
          </div>

          {/* Photo capture */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Photo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="photo-input"
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
                disabled={isLoading}
                className="w-full h-12 px-4 py-2 border border-input rounded-lg bg-background text-foreground text-base appearance-none cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                <option value="" className="py-2">Select a category</option>
                <option value="Hair Products" className="py-2">Hair Products</option>
                <option value="Body Lotion" className="py-2">Body Lotion</option>
                <option value="Beverages" className="py-2">Beverages</option>
                <option value="Snacks" className="py-2">Snacks</option>
                <option value="Dairy" className="py-2">Dairy</option>
                <option value="Canned Goods" className="py-2">Canned Goods</option>
                <option value="Bakery" className="py-2">Bakery</option>
                <option value="Household" className="py-2">Household</option>
                <option value="Personal Care" className="py-2">Personal Care</option>
                <option value="Other" className="py-2">Other</option>
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

          {/* Save Button */}
          <Button
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={handleSave}
            disabled={isLoading || !name || !expiryDate}
            size="lg"
          >
            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {uploading ? 'Uploading...' : mutation.isPending ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>
    </div>
  )
}