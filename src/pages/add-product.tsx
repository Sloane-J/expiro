import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addProduct } from '@/lib/products'

export default function AddProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [photo, setPhoto] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/home')
    },
  })

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setPhoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    mutation.mutate({
      name,
      expiry_date: expiryDate,
      photo_url: photo, // TODO: Upload to storage later
      quantity,
    })
  }

  return (
    <div className="min-h-screen p-4">
      <Button variant="ghost" onClick={() => navigate('/home')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mutation.isError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              Error saving product
            </div>
          )}

          {/* Photo capture */}
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="photo-input"
            />
            <label htmlFor="photo-input">
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent">
                {photo ? (
                  <img src={photo} alt="Product" className="mx-auto max-h-48 rounded" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Tap to take photo</p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Product Name</label>
            <Input
              placeholder="e.g. Milk"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={mutation.isPending || !name || !expiryDate}
          >
            {mutation.isPending ? 'Saving...' : 'Save Product'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}