import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut } from '@/lib/auth'
import { getProducts, getProductStatus } from '@/lib/products'

export default function HomePage() {
  const navigate = useNavigate()

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const getStatusColor = (status: string) => {
    if (status === 'expired') return 'destructive'
    if (status === 'expiring_soon') return 'default'
    return 'secondary'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading products...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Error loading products</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/profile')}
          >
            <User className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate('/add-product')}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {!products || products.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No products yet</p>
          <Button onClick={() => navigate('/add-product')}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Product
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const status = getProductStatus(product.expiry_date)
            return (
              <Card key={product.id}>
                <CardContent className="flex justify-between items-center p-4">
                  <div className="flex gap-3 items-center">
                    {product.photo_url && (
                      <img 
                        src={product.photo_url} 
                        alt={product.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Expires: {product.expiry_date}
                      </p>
                      {product.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          Qty: {product.quantity}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={getStatusColor(status)}>
                    {status.replace('_', ' ')}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}