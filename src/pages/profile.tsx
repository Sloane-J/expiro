import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadProfile()
  }, [user])

  async function loadProfile() {
    if (!user) return

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setName(data.name || '')
      setPhone(data.phone || '')
    }
  }

  async function saveProfile() {
    if (!user) return
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        name,
        phone,
      })

    if (error) {
      setMessage('Error saving profile: ' + error.message)
    } else {
      setMessage('Profile saved successfully!')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen p-4">
      <Button variant="ghost" onClick={() => navigate('/home')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email || ''} disabled />
          </div>

          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {message && (
            <div className={`text-sm p-3 rounded ${
              message.includes('Error') 
                ? 'text-destructive bg-destructive/10' 
                : 'text-green-600 bg-green-100 dark:bg-green-900/20'
            }`}>
              {message}
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={saveProfile}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}