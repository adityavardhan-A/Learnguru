import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Mail, Lock, User, UserPlus, GraduationCap, BookOpen } from 'lucide-react';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'teacher' | 'admin'
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.warning("Validation Error", "Please fill in all inputs.");
      return;
    }

    setLoading(true);
    try {
      const res = await signup(name, email, password, role);
      if (res.success) {
        if (res.user) {
          // Session returned immediately (email confirmation disabled)
          toast.success("Account Created!", `Welcome to Learn Guru, ${name}!`);
          if (role === 'teacher') navigate('/teacher');
          else if (role === 'admin') navigate('/admin');
          else navigate('/student');
        } else {
          toast.success("Verification Needed", res.message || "Registration successful! Please check your email.");
          navigate('/login');
        }
      } else {
        toast.error("Auth Failure", res.error || "Failed to complete signup.");
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6 select-none relative">
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-accent/10 dark:bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-border shadow-2xl relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg glow-indigo">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight leading-tight">Create Account</h2>
          <p className="text-xs text-muted-foreground mt-2">Join Learn Guru and start modeling premium educational experiences.</p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              />
            </div>
          </div>

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

          {/* Role selector cards */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
                  role === 'student'
                    ? 'border-pink-500 bg-pink-500/10 text-pink-400 font-semibold shadow-[0_0_15px_rgba(236,72,153,0.05)]'
                    : 'border-border bg-white/50 dark:bg-black/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-xs">Student Portal</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
                  role === 'teacher'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-semibold shadow-[0_0_15px_rgba(168,85,247,0.05)]'
                    : 'border-border bg-white/50 dark:bg-black/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="text-xs">Teacher Portal</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
                  role === 'admin'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold'
                    : 'border-border bg-white/50 dark:bg-black/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-xs">Admin</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            <UserPlus className="w-4.5 h-4.5" />
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
