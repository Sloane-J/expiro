import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
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

      const { error: authError } = await signUp(email, password, phone.trim());

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0a0a0f]">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #4f46e5 40%, transparent 70%)",
            filter: "blur(60px)",
            animation: "float1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, #8b5cf6 0%, #7c3aed 40%, transparent 70%)",
            filter: "blur(80px)",
            animation: "float2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{
            background:
              "radial-gradient(circle, #a5b4fc 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(1.08); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeSlideUp 0.5s ease forwards;
        }
        .animate-fade-up-delay-1 {
          animation: fadeSlideUp 0.5s ease 0.1s forwards;
          opacity: 0;
        }
        .animate-fade-up-delay-2 {
          animation: fadeSlideUp 0.5s ease 0.2s forwards;
          opacity: 0;
        }
        .animate-fade-up-delay-3 {
          animation: fadeSlideUp 0.5s ease 0.3s forwards;
          opacity: 0;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .glass-input {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
          transition: border-color 0.2s, background 0.2s;
        }
        .glass-input:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(99, 102, 241, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
        .glass-input::placeholder {
          color: rgba(255,255,255,0.25);
        }
        .primary-btn {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border: none;
          box-shadow: 0 4px 24px rgba(99, 102, 241, 0.35);
          transition: all 0.2s;
        }
        .primary-btn:hover:not(:disabled) {
          box-shadow: 0 6px 32px rgba(99, 102, 241, 0.5);
          transform: translateY(-1px);
        }
        .primary-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <main className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="animate-fade-up flex flex-col items-center mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
            }}
          >
            <span className="text-white font-black text-2xl tracking-tighter">E</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            {isSignUp
              ? "Request access to Expiro"
              : "Sign in to your account"}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 animate-fade-up-delay-1">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error */}
            {error && (
              <div
                className="text-xs p-3 rounded-xl flex items-start gap-2"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                }}
              >
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                className="text-xs p-3 rounded-xl flex items-start gap-2"
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  color: "#86efac",
                }}
              >
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.5)" }}
                htmlFor="email"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 glass-input rounded-xl text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.5)" }}
                htmlFor="password"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="h-11 glass-input rounded-xl text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Phone (signup only) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  htmlFor="phone"
                >
                  WhatsApp Number *
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  className="h-11 glass-input rounded-xl text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  We'll notify you on WhatsApp when your account is approved
                </p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm text-white rounded-xl mt-2 primary-btn"
              disabled={loading || !email || !password || (isSignUp && !phone)}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSignUp ? (
                "Request Access"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Toggle */}
        <div className="text-center mt-5 animate-fade-up-delay-2">
          <button
            type="button"
            className="text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setSuccess("");
              setPhone("");
            }}
          >
            {isSignUp ? (
              <>Already have an account?{" "}
                <span style={{ color: "#818cf8" }} className="font-medium">Sign in</span>
              </>
            ) : (
              <>Don't have an account?{" "}
                <span style={{ color: "#818cf8" }} className="font-medium">Request access</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-8 animate-fade-up-delay-3"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          Expiro — Expiry tracking for minimarts
        </p>
      </main>
    </div>
  );
}