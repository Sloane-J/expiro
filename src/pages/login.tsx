import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Phone, Loader2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "@/lib/auth";

const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M17 17h-11v-14h-2" />
    <path d="M6 5l14 1l-1 7h-13" />
  </svg>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (isSignUp) {
      if (!phone.trim()) {
        setError("Phone number is required so we can notify you when approved.");
        setLoading(false);
        return;
      }
      if (!name.trim()) {
        setError("Username is required.");
        setLoading(false);
        return;
      }

      const { error: authError } = await signUp(email, password, phone.trim(), name.trim());

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSuccess(
        "Account created! Your request is pending admin approval. You'll receive a WhatsApp message once approved."
      );
      setLoading(false);
      return;
    }

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    navigate("/home");
    setLoading(false);
  };

  const handleToggle = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setSuccess("");
    setPhone("");
    setName("");
  };

  const isDisabled = loading || !email || !password || (isSignUp && (!phone || !name));

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fu-0 { animation: fadeSlideUp 0.45s ease forwards; }
        .fu-1 { animation: fadeSlideUp 0.45s ease 0.06s forwards; opacity: 0; }
        .fu-2 { animation: fadeSlideUp 0.45s ease 0.12s forwards; opacity: 0; }
        .fu-3 { animation: fadeSlideUp 0.45s ease 0.18s forwards; opacity: 0; }
        .fu-4 { animation: fadeSlideUp 0.45s ease 0.24s forwards; opacity: 0; }
        .fu-5 { animation: fadeSlideUp 0.45s ease 0.30s forwards; opacity: 0; }
        .fu-6 { animation: fadeSlideUp 0.45s ease 0.36s forwards; opacity: 0; }

        .field {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          color: #fff;
          transition: border-color 0.2s, background 0.2s;
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .field:focus {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255, 105, 0, 0.55);
          box-shadow: 0 0 0 3px rgba(255, 105, 0, 0.1);
        }
        .field::placeholder { color: rgba(255,255,255,0.2); }
        .field-pr { padding-right: 2.75rem; }

        .field-group .field-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.25);
          transition: color 0.2s;
          pointer-events: none;
        }
        .field-group:focus-within .field-icon {
          color: #ff6900;
        }

        .submit-btn {
          background: linear-gradient(135deg, #ff6900 0%, #d45500 100%);
          transition: opacity 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 1.5rem 0;
        }
      `}</style>

      <main className="w-full max-w-sm relative z-10">

        {/* App icon + name */}
        <div className="flex flex-col items-center mb-10 fu-0">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#ff6900" }}
          >
            <ShoppingCartIcon />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? "Request Access" : "Welcome back"}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.38)" }}>
            {isSignUp ? "Create your Expiro account" : "Sign in to Expiro"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Error */}
          {error && (
            <div
              className="text-xs p-3 rounded-xl flex items-start gap-2 fu-0"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.18)",
                color: "#fca5a5",
              }}
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="text-xs p-3 rounded-xl flex items-start gap-2 fu-0"
              style={{
                background: "rgba(255,105,0,0.08)",
                border: "1px solid rgba(255,105,0,0.18)",
                color: "#ffb380",
              }}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Email */}
          <div className="fu-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Email
            </label>
            <div className="relative field-group">
              <Mail className="field-icon h-4 w-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field"
              />
            </div>
          </div>

          {/* Password */}
          <div className="fu-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Password
            </label>
            <div className="relative field-group">
              <Lock className="field-icon h-4 w-4" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field field-pr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Signup-only fields */}
          {isSignUp && (
            <>
              {/* Username */}
              <div className="fu-3">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Username
                </label>
                <div className="relative field-group">
                  <User className="field-icon h-4 w-4" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should we call you?"
                    className="field"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="fu-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  WhatsApp Number
                </label>
                <div className="relative field-group">
                  <Phone className="field-icon h-4 w-4" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 XX XXX XXXX"
                    className="field"
                  />
                </div>
                <p className="text-xs mt-1.5 ml-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                  We'll notify you on WhatsApp when your account is approved
                </p>
              </div>
            </>
          )}

          {/* Submit */}
          <div className="fu-5 pt-2">
            <button
              type="submit"
              disabled={isDisabled}
              className="submit-btn w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white font-semibold rounded-xl text-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Request Access" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="divider fu-6" />

        {/* Toggle */}
        <p className="text-center text-sm fu-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={handleToggle}
            className="font-semibold transition-opacity hover:opacity-80"
            style={{ color: "#ff6900" }}
          >
            {isSignUp ? "Sign in" : "Request Access"}
          </button>
        </p>

        <p className="text-center text-xs mt-8 fu-6" style={{ color: "rgba(128,128,128,0.51)" }}>
          Expiro — Expiry tracking for minimarts
        </p>
      </main>
    </div>
  );
}
