import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signIn, signUp } from '@/lib/auth'
import { 
  Loader2, 
  Eye, 
  EyeOff,
  LogIn 
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password)

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!isSignUp) navigate('/home')
    setLoading(false)
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex flex-col items-center justify-start font-sans overflow-x-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-[#d9ff6615] via-transparent to-transparent pointer-events-none" />
      
      <main className="w-full max-w-[430px] px-8 pt-8 pb-12 flex flex-col relative z-10">
        {/* Central Orb/Logo - Recreating the image effect */}
        <div className="flex justify-center mb-12">
          <div className="relative h-32 w-32">
             {/* Outermost Glow */}
             <div className="absolute inset-0 rounded-full bg-[#d9ff66] blur-[40px] opacity-20 animate-pulse" />
             {/* The Orb */}
             <div className="relative h-full w-full rounded-full bg-gradient-to-b from-[#d9ff66] to-[#6a8500] p-[2px]">
                <div className="h-full w-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                   <div className="h-full w-full bg-gradient-to-tr from-[#d9ff6633] to-transparent" />
                   <div className="absolute h-20 w-20 rounded-full bg-[#d9ff66] blur-[25px] opacity-40" />
                </div>
             </div>
          </div>
        </div>

        {/* Header Text */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back!'}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-[260px] mx-auto">
            {isSignUp 
              ? 'Join us to start your smart, personalized experience.' 
              : 'Sign in to access smart, personalized travel plans made for you.'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-[13px] text-red-400 bg-red-400/10 p-3.5 rounded-xl border border-red-400/20 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">
                Email address*
              </label>
              <Input
                type="email"
                placeholder="example@gmail.com"
                className="h-14 bg-[#141414] border-white/5 focus:border-[#d9ff66]/50 focus:ring-0 text-white rounded-2xl placeholder:text-gray-600 transition-all text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">
                Password*
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="h-14 bg-[#141414] border-white/5 focus:border-[#d9ff66]/50 focus:ring-0 text-white rounded-2xl placeholder:text-gray-600 transition-all text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Custom Checkbox and Forgot Password */}
          <div className="flex items-center justify-between px-1">
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div className={`
                h-5 w-5 rounded-md border transition-all flex items-center justify-center
                ${rememberMe ? 'bg-[#d9ff66] border-[#d9ff66]' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}
              `}>
                {rememberMe && <div className="h-2.5 w-2.5 bg-black rounded-[1px]" />}
              </div>
              <span className="text-[13px] text-gray-400 select-none">Remember me</span>
            </div>
            {!isSignUp && (
              <button type="button" className="text-[13px] text-gray-400 hover:text-[#d9ff66] transition-colors font-medium">
                Forgot Password?
              </button>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit"
            className="w-full h-14 bg-[#d9ff66] hover:bg-[#e6ff99] text-black font-bold rounded-full text-base shadow-[0_10px_20px_rgba(217,255,102,0.15)] active:scale-[0.98] transition-all"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="h-5 w-5" /> {isSignUp ? 'Sign up' : 'Sign in'}
              </span>
            )}
          </Button>
        </form>
        
        {/* Footer Toggle */}
        <div className="mt-12 text-center">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-400 text-[14px]"
          >
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span className="text-white font-bold hover:text-[#d9ff66] transition-colors">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </span>
          </button>
        </div>
      </main>
    </div>
  )
}