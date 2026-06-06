import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Sparkles, 
  LayoutDashboard, 
  Users,
  Award,
  Video,
  FileText,
  Radio,
  Trophy,
  MessageSquare,
  TrendingUp
} from 'lucide-react';

export const DashboardLayout = ({ 
  children, 
  title = "Dashboard", 
  activeTab = "dashboard", 
  setActiveTab = () => {} 
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, leaderboard } = useApp();
  const { language, changeLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Find user's XP and Level from Leaderboard data for hot-reloading
  const selfLeaderboardInfo = leaderboard.find(l => l.student_id === user?.id) || {
    xp: user?.xp || 950,
    level: user?.level || 2
  };

  let navLinks;
  if (user?.role === "admin") {
    navLinks = [
      { id: "dashboard", label: t("dashboard"), icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: "users", label: t("users"), icon: <Users className="w-5 h-5" /> },
      { id: "analytics", label: t("analytics"), icon: <TrendingUp className="w-5 h-5" /> }
    ];
  } else if (user?.role === "teacher") {
    // Teachers manage their own courses, lectures, assignments, live classes & students.
    // Quizzes live inside course/lecture management; Chat is not a teacher tab.
    navLinks = [
      { id: "dashboard", label: t("dashboard"), icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: "courses", label: t("courses"), icon: <BookOpen className="w-5 h-5" /> },
      { id: "lectures", label: t("lectures"), icon: <Video className="w-5 h-5" /> },
      { id: "assignments", label: t("assignments"), icon: <FileText className="w-5 h-5" /> },
      { id: "live", label: t("live"), icon: <Radio className="w-5 h-5" /> },
      { id: "leaderboard", label: t("leaderboard"), icon: <Trophy className="w-5 h-5" /> },
      { id: "analytics", label: t("analytics"), icon: <TrendingUp className="w-5 h-5" /> }
    ];
  } else {
    navLinks = [
      { id: "dashboard", label: t("dashboard"), icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: "courses", label: t("courses"), icon: <BookOpen className="w-5 h-5" /> },
      { id: "lectures", label: t("lectures"), icon: <Video className="w-5 h-5" /> },
      { id: "assignments", label: t("assignments"), icon: <FileText className="w-5 h-5" /> },
      { id: "quizzes", label: t("quizzes"), icon: <Award className="w-5 h-5" /> },
      { id: "live", label: t("live"), icon: <Radio className="w-5 h-5" /> },
      { id: "leaderboard", label: t("leaderboard"), icon: <Trophy className="w-5 h-5" /> },
      { id: "chat", label: t("chat"), icon: <MessageSquare className="w-5 h-5" /> },
      { id: "analytics", label: t("analytics"), icon: <TrendingUp className="w-5 h-5" /> }
    ];
  }

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-foreground justify-between">
      <div>
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center glow-indigo shadow-lg">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider block text-gradient-purple">LEARN GURU</span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-primary font-bold">AI Academy</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="py-6 px-4 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
          {navLinks.map((link) => {
            const isTabActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleTabClick(link.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-xs transition-all duration-200 group text-left ${
                  isTabActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'hover:bg-white/10 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`transition-transform duration-200 group-hover:scale-110 ${isTabActive ? 'text-white' : 'text-primary'}`}>
                  {link.icon}
                </div>
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile card & control options footer */}
      <div className="p-4 border-t border-border bg-black/5 dark:bg-white/5 shrink-0">
        {/* Gamified Level & XP gauge (Only for students) */}
        {user?.role === 'student' && (
          <div className="mb-4 bg-white/40 dark:bg-black/20 border border-border/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">LVL {selfLeaderboardInfo.level} Learner</span>
              <span className="text-[10px] font-mono font-bold text-primary">{selfLeaderboardInfo.xp} XP Total</span>
            </div>
            {/* Sleek level indicator */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${(selfLeaderboardInfo.xp % 400) / 4}%` }} // level caps at 400 XP intervals
              />
            </div>
            <div className="text-[8px] text-right text-muted-foreground font-mono">
              {400 - (selfLeaderboardInfo.xp % 400)} XP to next Level
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="flex items-center gap-3 p-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0">
            {user?.name?.charAt(0) || <User className="w-5 h-5" />}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-xs truncate leading-tight">{user?.name || "Demo Account"}</h4>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="flex-1 py-2 rounded-xl glass-panel border border-border text-xs bg-transparent"
            title="Language"
          >
            <option value="en">EN</option>
            <option value="hi">HI</option>
            <option value="te">TE</option>
          </select>
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="flex-1 py-2 rounded-xl glass-panel hover:bg-white/10 dark:hover:bg-white/5 flex items-center justify-center border border-border transition-all duration-200"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex-1 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/25 text-destructive border border-destructive/20 flex items-center justify-center transition-all duration-200"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background bg-mesh text-foreground flex">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 bg-white/70 dark:bg-card/45 backdrop-blur-xl border-r border-border shrink-0">
        <SidebarContent />
      </aside>

      {/* 2. Main Frame */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-white/50 dark:bg-background/40 backdrop-blur-xl border-b border-border/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger (Mobile) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-border bg-card/50 text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent capitalize">
              {title}
            </h1>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-3">
            {/* Database indicator */}
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase Connected
            </span>

            {/* Role Badge */}
            <span className={`text-[10px] px-3 py-1.5 font-bold rounded-full border tracking-wide uppercase ${
              user?.role === 'teacher' 
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5 shadow-[0_0_15px]'
                : 'bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-pink-500/5 shadow-[0_0_15px]'
            }`}>
              {user?.role || "Student"}
            </span>
          </div>
        </header>

        {/* 3. Main Workspace Content Viewport */}
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 4. Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop dismiss */}
          <div 
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          {/* Menu Card */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-card border-r border-border shadow-2xl flex flex-col z-10 animate-slide-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 border border-border text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </div>
  );
};

// Add standard inline CSS keyframe animation for the mobile drawer slide-in
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideRight {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    .animate-slide-right {
      animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}
