import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Clock, Loader2, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type PendingUser = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  role: string
  created_at: string
}

async function sendWhatsAppApprovalNotification(phone: string, _name: string | null) {
  // TODO: Wire up WhatsApp Business Cloud API here
  // await fetch('https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     messaging_product: 'whatsapp',
  //     to: phone,
  //     type: 'text',
  //     text: {
  //       body: `Hi${_name ? ` ${_name}` : ''}! Your Expiro account has been approved. You can now log in at ${window.location.origin}`
  //     }
  //   })
  // })
  console.log(`[WhatsApp placeholder] Approval notification would be sent to ${phone}`)
  return true
}

export default function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: pendingUsers, isLoading, error } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, phone, email, role, created_at')
        .eq('is_approved', false)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []) as PendingUser[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (user: PendingUser) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_approved: true })
        .eq('id', user.id)

      if (error) throw error

      if (user.phone) {
        await sendWhatsAppApprovalNotification(user.phone, user.name)
      }

      return user
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      toast.success(`${user.email || user.name || 'User'} has been approved`)
    },
    onError: () => {
      toast.error('Failed to approve user. Please try again.')
    },
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="mb-3 -ml-2 hover:bg-accent/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">User Approvals</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage pending access requests
              </p>
            </div>

            {pendingUsers && pendingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {pendingUsers.length} pending
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-20">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading pending users...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <p className="text-muted-foreground text-sm">Failed to load pending users.</p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['pending-users'] })}
            >
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && pendingUsers?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">All caught up</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              No pending approval requests at the moment.
            </p>
          </div>
        )}

        {!isLoading && !error && (pendingUsers?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {pendingUsers?.map((user) => (
              <Card
                key={user.id}
                className="border-border/50 shadow-sm overflow-hidden"
              >
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary uppercase">
                            {user.email?.[0] || user.name?.[0] || '?'}
                          </span>
                        </div>
                        <p className="font-semibold text-sm truncate">
                          {user.email || 'No email'}
                        </p>
                      </div>

                      <div className="ml-10 space-y-0.5">
                        {user.name && (
                          <p className="text-xs text-muted-foreground">
                            {user.name}
                          </p>
                        )}
                        {user.phone && (
                          <p className="text-xs text-muted-foreground">
                            📱 {user.phone}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Requested {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="rounded-full shrink-0 gap-1.5"
                      onClick={() => approveMutation.mutate(user)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}