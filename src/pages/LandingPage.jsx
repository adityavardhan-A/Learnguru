import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  BookOpen, 
  Terminal, 
  Layers, 
  Cpu, 
  GraduationCap, 
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Video,
  FileText,
  Award,
  Radio,
  Trophy,
  MessageSquare
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-mesh text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-white">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/40 dark:bg-background/20 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center glow-indigo shadow-lg">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase">
              Learn <span className="text-primary font-mono lowercase">Guru</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/login"
              className="text-sm font-semibold hover:text-primary transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link 
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Presentation */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-6 max-w-7xl mx-auto text-center z-10">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider mb-8 animate-bounce-slow">
          <Cpu className="w-3.5 h-3.5" /> Next-Gen AI LMS Platform
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Architect the Future of <br className="hidden md:inline" />
          <span className="text-gradient-purple font-black">Learning Management</span>
        </h1>

        <p className="text-muted-foreground text-base md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Learn Guru is a premium Coursera-grade SaaS LMS. Manage structured Lectures (with videos, study notes, audio players, and AI summaries), host student Assignments (with submission status trackers), take locked Quizzes, join Live Streams, and dominate gamified Leaderboards.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold flex items-center justify-center gap-2 group shadow-xl shadow-primary/10 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
          >
            Create Your Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="#get-started"
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-panel hover:bg-white/90 dark:hover:bg-card/50 text-foreground font-bold flex items-center justify-center gap-2 border border-border transition-all duration-200"
          >
            Explore Roles
          </a>
        </div>

        {/* Dashboard Preview Panel */}
        <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden glass-panel border border-white/20 dark:border-white/5 p-3 md:p-4 shadow-2xl animate-fade-in glow-indigo">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white/40 dark:bg-black/10 rounded-t-xl">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="px-6 py-1 rounded bg-muted/60 text-[10px] font-mono text-muted-foreground tracking-wider select-none truncate max-w-xs md:max-w-md">
              https://learnguru.vercel.app/dashboard
            </div>
            <Terminal className="w-4 h-4 text-muted-foreground" />
          </div>
          <img 
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80" 
            alt="Learn Guru Platform Interface"
            className="w-full h-auto max-h-[480px] object-cover rounded-b-xl opacity-90 filter dark:brightness-90 transition-opacity duration-300"
          />
        </div>
      </section>

      {/* 3. Feature Highlights Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-border/80">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-16">
          Equipped with <span className="text-gradient-purple">Premium Course Modules</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-all duration-300 border border-border">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-6">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3">Structured Lecture Flows</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Each module packs high-fidelity YouTube video streams, complete notes tabs, active audio Voice Notes players, and distills complex ideas with a one-click AI Summarizer engine.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-all duration-300 border border-border">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3">Homework & Assignments</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Dedicated assignments layout allows teachers to attach instruction documents and set clear due dates. Students submit solution links or text files and track reviews and scores.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-all duration-300 border border-border">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-6">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-3">Locked AI Quizzes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Enforce standard academic sequences: quizzes are locked under secure padlock states and unlock instantly the second students mark lectures as completed.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-all duration-300 border border-border">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-6">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3">Interactive Live Classes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Schedule or broadcast virtual classroom sessions. Built-in streams integrate real-time interactive peer chats, live discussions, and dynamic session joiners.
            </p>
          </div>

          {/* Card 5 */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-all duration-300 border border-border">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3">Gamified Leaderboards</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Earn XP points upon marking lectures complete, turning in projects, and getting top scores on quizzes. Track real-time ranks, level up, and see cohort standings!
            </p>
          </div>

          {/* Card 6 */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-all duration-300 border border-border">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3">Peer & AI Help Chat</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Consult with peer students or trigger direct consultations with our premium **Learn Guru AI Tutor** to get academic guidance, syntax explanations, or essay help immediately.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Get Started by Role */}
      <section id="get-started" className="py-20 px-6 max-w-7xl mx-auto border-t border-border/80 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-accent/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>

        <h2 className="text-3xl font-extrabold tracking-tight mb-4">
          Get Started with <span className="text-gradient-purple">Learn Guru</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-12 text-sm leading-relaxed">
          Create your free account to join as a teacher or a student. Teacher accounts are reviewed by an administrator before activation.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Teacher signup */}
          <div className="glass-panel p-8 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 relative group overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-[100px] pointer-events-none"></div>
            <GraduationCap className="w-10 h-10 text-purple-400 mb-6 mx-auto" />
            <h3 className="text-xl font-bold mb-2">Teacher Workspace</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Create courses, manage lectures (videos & voice notes), generate AI quizzes with Gemini, schedule live classes, and grade submissions.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold w-full shadow-lg shadow-purple-500/10 active:scale-[0.98] transition-all duration-200"
            >
              Sign Up as Teacher
            </button>
          </div>

          {/* Student signup */}
          <div className="glass-panel p-8 rounded-2xl border border-pink-500/20 hover:border-pink-500/40 relative group overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-bl-[100px] pointer-events-none"></div>
            <BookOpen className="w-10 h-10 text-pink-400 mb-6 mx-auto" />
            <h3 className="text-xl font-bold mb-2">Student Classroom</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Enroll in courses, mark lectures complete to unlock quizzes, submit assignments, climb the XP leaderboard, and chat with the AI tutor.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold w-full shadow-lg shadow-pink-500/10 active:scale-[0.98] transition-all duration-200"
            >
              Sign Up as Student
            </button>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="border-t border-border py-12 px-6 bg-black/5 dark:bg-black/20 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xs tracking-wider uppercase">Learn Guru</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Learn Guru. Built using React + Tailwind + Gemini + Supabase.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-500" /> SECURE CONTEXT</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
