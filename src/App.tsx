import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import LoginPage from '@/pages/login'
import HomePage from '@/pages/home'
import AddProductPage from '@/pages/add-product'
import ProfilePage from '@/pages/profile'

function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/home" replace /> : <LoginPage />} 
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-product"
            element={
              <ProtectedRoute>
                <AddProductPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to={user ? "/home" : "/login"} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App