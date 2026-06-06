import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Mail, Lock, LogIn } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning("Validation Error", "Please fill in all credentials.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success("Welcome back!", `Successfully logged in as ${res.user.name}.`);
        if (res.user.role === 'teacher') navigate('/teacher');
        else if (res.user.role === 'admin') navigate('/admin');
        else navigate('/student');
      } else {
        toast.error("Auth Failure", res.error || "Incorrect login credentials.");
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6 select-none relative">
      {/* Dynamic colorful blobs */}
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-border shadow-2xl relative">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg glow-indigo">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight leading-tight">Welcome to Learn Guru</h2>
          <p className="text-xs text-muted-foreground mt-2">Log in to manage courses, submit assignments, and complete AI-powered quizzes.</p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <LogIn className="w-4.5 h-4.5" />
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Reroute Footer */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};
