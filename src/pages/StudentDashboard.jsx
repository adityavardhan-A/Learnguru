import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { QuizTaker } from '../components/QuizTaker';
import { AIChatbot } from '../components/AIChatbot';
import { useGemini } from '../hooks/useGemini';
import { supabase } from '../services/supabase';
import { 
  BookOpen, 
  CheckCircle2, 
  Trophy, 
  Award, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Video,
  FileText,
  Lock,
  Play,
  Volume2,
  Calendar,
  Clock,
  Send,
  User,
  Radio,
  Download,
  AlertCircle,
  HelpCircle,
  BarChart2,
  ChevronRight,
  Tv,
  Loader2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

export const StudentDashboard = () => {
  const { 
    courses, 
    lectures, 
    quizzes, 
    progress, 
    assignments, 
    submissions, 
    leaderboard, 
    liveClasses,
    enrollments,
    messages,
    quizAttempts,
    saveSubmission,
    updateProgress,
    sendCourseMessage,
    enrollInCourse,
    markLiveAttendance
  } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { generateSummary, generateChatReply, hasGeminiConfig, loadingAI } = useGemini();

  // Tab State
  const [activeTab, setActiveTab] = useState("dashboard");

  // Selection states inside tabs
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [selectedQuizLecture, setSelectedQuizLecture] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Assignment submissions states
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submittingLink, setSubmittingLink] = useState('');
  const [submittingText, setSubmittingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Course discussion chat (real Supabase messages)
  const [chatInput, setChatInput] = useState('');

  // AI Tutor Chat
  const [aiChatMessages, setAiChatMessages] = useState([
    { sender: "AI Tutor", text: `Hello ${user?.name?.split(' ')[0] || 'there'}! I am your Learn Guru AI Assistant. Ask me anything about your courses, lectures, assignments, quizzes, or how to use the platform.` }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatLoading, setAiChatLoading] = useState(false);

  const studentId = user?.id;
  const enrolledCourseIds = new Set(
    enrollments.filter(e => e.student_id === studentId).map(e => e.course_id)
  );
  const studentCourses = courses.filter(c => enrolledCourseIds.has(c.id));
  const studentLectures = lectures.filter(l => enrolledCourseIds.has(l.course_id));
  const courseMessages = messages.filter(m => !m.course_id || enrolledCourseIds.has(m.course_id));

  // 1. Calculations & Metrics
  const userProgress = progress.filter(p => p.student_id === studentId);
  const completedLecturesCount = userProgress.filter(p => p.completed).length;
  
  const gradedQuizzes = userProgress.filter(p => p.score !== null);
  const quizzesTakenCount = gradedQuizzes.length;
  
  const averageMasteryScore = quizzesTakenCount > 0
    ? Math.round(gradedQuizzes.reduce((acc, curr) => acc + curr.score, 0) / quizzesTakenCount)
    : 0;

  const overallCompletionPercentage = studentLectures.length > 0
    ? Math.round((completedLecturesCount / studentLectures.length) * 100)
    : 0;

  const getLectureScore = (lectureId) => {
    const record = userProgress.find(p => p.lecture_id === lectureId);
    return record?.score ?? null;
  };

  // Find self XP info
  const selfInfo = leaderboard.find(l => l.student_id === studentId) || { xp: user?.xp || 0, level: user?.level || 1 };

  // Handlers
  const handleStudyCourse = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleEnroll = async (courseId) => {
    const res = await enrollInCourse(courseId);
    if (res.success) toast.success("Enrolled!", "You can now access this course's lectures and quizzes.");
    else toast.error("Error", res.error || "Could not enroll.");
  };

  // Turn in Assignment
  const handleTurnInAssignment = async (e) => {
    e.preventDefault();
    if (!submittingLink) {
      toast.warning("Figma Link Empty", "Please input a valid submission URL.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveSubmission({
        assignment_id: selectedAssignment.id,
        file_url: submittingLink
      });

      if (res.success) {
        toast.success("Assignment Submitted!", "Your solution was uploaded. XP +150!");
        setSelectedAssignment(null);
        setSubmittingLink('');
      } else {
        toast.error("Submission Error", "Failed to upload submission.");
      }
    } catch (err) {
      toast.error("Error", "Unexpected submission error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Course discussion chat send (persists to Supabase)
  const handleSendLiveChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const firstCourseId = [...enrolledCourseIds][0];
    if (firstCourseId) {
      sendCourseMessage({ course_id: firstCourseId, content: chatInput });
    } else {
      toast.info("Enroll first", "Join a course to participate in its discussion.");
    }
    setChatInput('');
  };

  // AI Tutor send (real Gemini + persists chat history)
  const handleSendAiChat = async (e) => {
    e.preventDefault();
    if (!aiChatInput.trim()) return;

    const userText = aiChatInput;
    setAiChatMessages(prev => [...prev, { sender: "You", text: userText }]);
    setAiChatInput('');
    setAiChatLoading(true);

    try {
      await supabase.from('chat_history').insert([{ user_id: studentId, role: 'user', content: userText }]);

      if (!hasGeminiConfig) {
        const notice = "The AI tutor is unavailable because the Gemini API key is not configured.";
        setAiChatMessages(prev => [...prev, { sender: "AI Tutor", text: notice }]);
        return;
      }

      const reply = await generateChatReply(userText, { name: user?.name, role: user?.role });
      setAiChatMessages(prev => [...prev, { sender: "AI Tutor", text: reply }]);
      await supabase.from('chat_history').insert([{ user_id: studentId, role: 'assistant', content: reply }]);
    } catch (err) {
      setAiChatMessages(prev => [...prev, { sender: "AI Tutor", text: "Sorry, I couldn't process that right now. Please try again!" }]);
    } finally {
      setAiChatLoading(false);
    }
  };

  // Summarize Lecture on Dedicated View
  const handleSummarizeLecture = async (lecture) => {
    setAiLoading(true);
    setAiSummary('');
    try {
      const summary = await generateSummary(lecture.title, lecture.notes);
      setAiSummary(summary);
      toast.success("AI Notes Distilled", "Generated custom outline summaries.");
    } catch (err) {
      toast.error("AI Summarizer Error", "Failed to compile AI summary.");
    } finally {
      setAiLoading(false);
    }
  };

  // Toggle Lecture Complete in lectures tab
  const handleToggleLectureComplete = async (lecture) => {
    const isCompleted = progress.some(p => p.student_id === studentId && p.lecture_id === lecture.id && p.completed);
    const res = await updateProgress(lecture.id, !isCompleted, null);
    if (res.success) {
      toast.success(!isCompleted ? "Lecture Finished!" : "Status Updated", !isCompleted ? "XP +100 awarded! The lecture quiz is now unlocked." : "Lecture marked incomplete.");
    }
  };

  // Real analytics derived from Supabase data
  const myAttempts = (quizAttempts || []).filter(a => a.student_id === studentId);
  const quizScoreTrend = myAttempts.map((a, idx) => ({
    name: `#${idx + 1}`,
    score: a.score
  }));

  const courseProgressData = studentCourses.map(course => {
    const courseLectureIds = lectures.filter(l => l.course_id === course.id).map(l => l.id);
    const done = userProgress.filter(p => courseLectureIds.includes(p.lecture_id) && p.completed).length;
    const pct = courseLectureIds.length > 0 ? Math.round((done / courseLectureIds.length) * 100) : 0;
    return {
      name: course.title.length > 16 ? course.title.slice(0, 14) + '…' : course.title,
      progress: pct
    };
  });

  return (
    <DashboardLayout 
      title={activeTab === "live" ? "Live Stream Broadcast" : `Learn Guru ${activeTab}`}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <div className="space-y-8 animate-fade-in">
        
        {/* ==================== TAB 1: DASHBOARD OVERVIEW ==================== */}
        {activeTab === "dashboard" && (
          <>
            {/* Visual Greetings Banner Panel */}
            <div className="relative overflow-hidden glass-panel p-6 md:p-8 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glow-indigo">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-[200px] pointer-events-none"></div>
              <div>
                <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-widest mb-2 animate-pulse">
                  <Sparkles className="w-4 h-4" /> Gamified Learn Guru Hub
                </div>
                <h2 className="text-xl md:text-3xl font-extrabold tracking-tight">
                  Hello, {user?.name || "Learner"}!
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
                  Welcome to your rebranded LMS. Watch video lectures, listen to audio voice summaries, turn in assignments, and complete locked quizzes to climb the peer ranks!
                </p>
              </div>
              
              {/* Circular overall progress circle */}
              <div className="shrink-0 flex items-center gap-4 bg-white/40 dark:bg-black/20 border border-border px-5 py-4 rounded-2xl">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="24" stroke="currentColor" className="text-muted/30" strokeWidth="4" fill="transparent" />
                    <circle cx="28" cy="28" r="24" stroke="currentColor" className="text-primary" strokeWidth="4" fill="transparent" 
                      strokeDasharray={150.7}
                      strokeDashoffset={150.7 - (150.7 * overallCompletionPercentage) / 100}
                    />
                  </svg>
                  <span className="absolute text-xs font-black">{overallCompletionPercentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Overall Progress</span>
                  <span className="text-xs font-bold">{completedLecturesCount} / {studentLectures.length} Syllabus Completed</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:border-border transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Active Courses</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{studentCourses.length}</h3>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:border-border transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Completed Lectures</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{completedLecturesCount}</h3>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:border-border transition-all">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Quizzes Mastery</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{averageMasteryScore}%</h3>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:border-border transition-all">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Leaderboard Level</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">LVL {selfInfo.level}</h3>
                </div>
              </div>
            </div>

            {/* Split dashboard segments */}
            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* Left Column - Active learning paths */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Active Learning Paths
                </h3>

                <div className="grid md:grid-cols-2 gap-5">
                  {studentCourses.map(course => {
                    const courseLectures = lectures.filter(l => l.course_id === course.id);
                    const courseLectureIds = courseLectures.map(l => l.id);
                    const completedCount = userProgress.filter(p => courseLectureIds.includes(p.lecture_id) && p.completed).length;
                    const coursePct = courseLectures.length > 0 ? Math.round((completedCount / courseLectures.length) * 100) : 0;

                    return (
                      <div key={course.id} className="glass-panel rounded-2xl overflow-hidden border border-border group flex flex-col justify-between hover:shadow-xl transition-all duration-200">
                        <div className="h-32 bg-black/10 relative overflow-hidden">
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-1 rounded border border-white/10 uppercase font-mono">{courseLectures.length} Lectures</span>
                        </div>
                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="font-extrabold text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors">{course.title}</h4>
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{course.description}</p>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-border/60">
                            <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                              <span>Mastery</span>
                              <span>{coursePct}%</span>
                            </div>
                            <div className="h-1 bg-secondary rounded-full overflow-hidden mb-3">
                              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${coursePct}%` }}></div>
                            </div>
                            <button 
                              onClick={() => handleStudyCourse(course.id)}
                              className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1"
                            >
                              Launch Classroom <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column - Study Plan Calendar & Upcoming classes */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" /> Upcoming Schedule
                </h3>

                <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
                  {liveClasses.filter(lc => enrolledCourseIds.has(lc.course_id)).map(lc => {
                    const c = courses.find(course => course.id === lc.course_id) || { title: "General Stream" };
                    return (
                      <div key={lc.id} className="p-3 rounded-xl border border-border bg-black/5 dark:bg-white/5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-widest">
                          <Radio className="w-3.5 h-3.5 animate-pulse" /> {lc.status} Workshop
                        </div>
                        <h4 className="font-bold text-xs leading-snug">{lc.title}</h4>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-1">
                          <span>{lc.instructor}</span>
                          <span>{new Date(lc.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <button 
                          onClick={() => {
                            markLiveAttendance(lc.id, studentId, "present");
                            setActiveTab("live");
                          }}
                          className="w-full mt-2 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all"
                        >
                          Join Session <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="p-3.5 rounded-xl border border-dashed border-border flex items-center gap-3">
                    <Clock className="w-8 h-8 text-primary shrink-0" />
                    <div>
                      <h4 className="font-bold text-[10px] uppercase text-muted-foreground">Study Goal Tracker</h4>
                      <p className="text-xs font-bold mt-0.5">Study 30m daily to maintain XP streak!</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* ==================== TAB 2: COURSES LISTING ==================== */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Active Learning Catalog</h3>
                <p className="text-xs text-muted-foreground mt-1">Acquire technical competencies and gain XP badges.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {studentCourses.length === 0 && (
                <div className="col-span-full glass-panel p-8 rounded-2xl border border-dashed border-border text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">You haven't enrolled in any courses yet. Browse available courses below.</p>
                </div>
              )}
              {studentCourses.map(course => {
                const courseLectures = lectures.filter(l => l.course_id === course.id);
                const courseLectureIds = courseLectures.map(l => l.id);
                const completedCount = userProgress.filter(p => courseLectureIds.includes(p.lecture_id) && p.completed).length;
                const coursePct = courseLectures.length > 0 ? Math.round((completedCount / courseLectures.length) * 100) : 0;

                return (
                  <div key={course.id} className="glass-panel rounded-2xl overflow-hidden border border-border group flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                    <div className="h-44 bg-black/10 relative overflow-hidden">
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-widest">{courseLectures.length} Modules</span>
                    </div>

                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-base line-clamp-1 group-hover:text-primary transition-colors mb-2">{course.title}</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-6">{course.description}</p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border/80">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span>Syllabus Completed</span>
                            <span>{coursePct}% ({completedCount}/{courseLectures.length})</span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300" style={{ width: `${coursePct}%` }} />
                          </div>
                        </div>

                        <button
                          onClick={() => handleStudyCourse(course.id)}
                          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {coursePct > 0 ? "Continue Syllabus" : "Start Course"} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Available courses to enroll in */}
            {courses.filter(c => !enrolledCourseIds.has(c.id)).length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="pb-2 border-b border-border">
                  <h3 className="text-lg font-bold tracking-tight">Available Courses</h3>
                  <p className="text-xs text-muted-foreground mt-1">Enroll to unlock lectures, quizzes, assignments, and live classes.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.filter(c => !enrolledCourseIds.has(c.id)).map(course => {
                    const courseLectures = lectures.filter(l => l.course_id === course.id);
                    return (
                      <div key={course.id} className="glass-panel rounded-2xl overflow-hidden border border-border group flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                        <div className="h-44 bg-black/10 relative overflow-hidden">
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {course.category && <span className="absolute top-3 left-3 bg-primary/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-lg uppercase tracking-widest">{course.category}</span>}
                          <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-widest">{courseLectures.length} Modules</span>
                        </div>
                        <div className="p-5 flex-grow flex flex-col justify-between">
                          <div>
                            <h3 className="font-black text-base line-clamp-1 group-hover:text-primary transition-colors mb-2">{course.title}</h3>
                            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-6">{course.description}</p>
                          </div>
                          <button
                            onClick={() => handleEnroll(course.id)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Enroll Now <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {/* ==================== TAB 3: DEDICATED LECTURES WORKSPACE ==================== */}
        {activeTab === "lectures" && (
          <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Sidebar list of lectures */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight">Syllabus Lectures</h3>
              <div className="glass-panel p-3 rounded-2xl border border-border space-y-1.5 max-h-[75vh] overflow-y-auto">
                {studentLectures.map((lec, idx) => {
                  const active = selectedLecture?.id === lec.id;
                  const completed = progress.some(p => p.student_id === studentId && p.lecture_id === lec.id && p.completed);
                  const course = courses.find(c => c.id === lec.course_id) || { title: "Course" };
                  
                  return (
                    <button
                      key={lec.id}
                      onClick={() => {
                        setSelectedLecture(lec);
                        setAiSummary('');
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        active
                          ? 'bg-primary border-transparent text-white shadow-lg'
                          : 'border-transparent hover:bg-white/10 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                        active ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="overflow-hidden flex-grow">
                        <span className="font-bold text-xs leading-snug line-clamp-1">{lec.title}</span>
                        <span className="text-[8px] uppercase tracking-wider block mt-0.5 truncate opacity-75">{course.title}</span>
                        {completed && (
                          <span className={`flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider mt-1 ${active ? 'text-white' : 'text-emerald-400'}`}>
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Central Workspace Viewer */}
            <div className="lg:col-span-2 space-y-6">
              {selectedLecture ? (
                <div className="glass-panel p-6 rounded-3xl border border-border bg-white/40 dark:bg-card/25 space-y-6">
                  <div className="flex justify-between items-start gap-4 pb-4 border-b border-border/80">
                    <div>
                      <span className="text-[9px] uppercase font-mono tracking-widest text-primary font-bold">Lecture Lab Workspace</span>
                      <h3 className="text-xl font-black mt-0.5">{selectedLecture.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSummarizeLecture(selectedLecture)}
                        disabled={aiLoading}
                        className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 font-bold text-xs flex items-center gap-1"
                      >
                        {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />} 
                        Summarize notes
                      </button>
                      <button 
                        onClick={() => handleToggleLectureComplete(selectedLecture)}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 border transition-all ${
                          progress.some(p => p.student_id === studentId && p.lecture_id === selectedLecture.id && p.completed)
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-white dark:bg-card border-border hover:bg-muted text-foreground'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {progress.some(p => p.student_id === studentId && p.lecture_id === selectedLecture.id && p.completed) ? "Completed" : "Complete"}
                      </button>
                    </div>
                  </div>

                  {/* Voice Note Player */}
                  {selectedLecture.voice_note_url && (
                    <div className="p-4 rounded-xl border border-border bg-black/5 dark:bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Radio className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold">Voice Lecture Summary Track</h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Voice Note Audio</p>
                        </div>
                      </div>
                      <audio controls src={selectedLecture.voice_note_url} className="h-8 shrink max-w-[200px] sm:max-w-xs" />
                    </div>
                  )}

                  {/* Notes & Summary Split */}
                  <div className="grid md:grid-cols-5 gap-6">
                    <div className="md:col-span-3 space-y-4">
                      <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider pb-1 border-b border-border/80">Syllabus Text Notes</h4>
                      <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed font-normal text-foreground/90 whitespace-pre-wrap select-text h-[40vh] overflow-y-auto pr-2">
                        {selectedLecture.notes}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-4 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6">
                      <h4 className="font-bold text-xs uppercase text-indigo-400 tracking-wider pb-1 border-b border-border/80 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI Synthesis summary
                      </h4>
                      <div className="text-xs text-foreground/90 whitespace-pre-wrap select-text leading-relaxed h-[40vh] overflow-y-auto pr-2">
                        {aiSummary ? aiSummary : "No summary synthesized yet. Click 'Summarize notes' above to generate Distilled Pro Tips immediately!"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-16 rounded-3xl border border-border text-center bg-mesh py-24">
                  <Video className="w-14 h-14 text-primary mx-auto mb-4 animate-bounce-slow" />
                  <h4 className="font-black text-lg">Lecture Syllabus Workspace</h4>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                    Select any course lecture on the left panel to begin reading full detailed guides and play audio voice tracks.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: ASSIGNMENTS UPLOADS ==================== */}
        {activeTab === "assignments" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Active Homework Assignments</h3>
              <p className="text-xs text-muted-foreground mt-1">Submit design references or code folders to receive cohort grading logs.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Assignments list */}
              <div className="lg:col-span-2 space-y-4">
                {assignments.filter(ass => enrolledCourseIds.has(ass.course_id)).map(ass => {
                  const course = courses.find(c => c.id === ass.course_id) || { title: "General Program" };
                  const sub = submissions.find(s => s.assignment_id === ass.id && s.student_id === studentId);
                  
                  return (
                    <div key={ass.id} className="glass-panel p-5 rounded-2xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-2 max-w-lg">
                        <span className="text-[8px] uppercase tracking-widest font-mono text-primary font-bold px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md block w-max">{course.title}</span>
                        <h4 className="font-extrabold text-sm">{ass.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ass.instructions}</p>
                        
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold pt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due: {new Date(ass.due_date).toLocaleDateString()}</span>
                          {ass.attachment_url && (
                            <a href={ass.attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                              <Download className="w-3 h-3" /> Syllabus Guide.pdf
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 w-full sm:w-auto text-right flex flex-col gap-2.5 items-end justify-between self-stretch">
                        {sub ? (
                          <div className="space-y-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border inline-block ${
                              sub.status === 'Reviewed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                              {sub.status}
                            </span>
                            {sub.score !== undefined && (
                              <div className="text-xs font-mono font-bold mt-1 text-primary">Score: {sub.score}/100</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20">
                            Pending Submit
                          </span>
                        )}

                        {!sub && (
                          <button
                            onClick={() => setSelectedAssignment(ass)}
                            className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                          >
                            Turn In
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Turn in workspace */}
              <div>
                {selectedAssignment ? (
                  <form onSubmit={handleTurnInAssignment} className="glass-panel p-5 rounded-2xl border border-border space-y-4 sticky top-24">
                    <h4 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" /> Turn In: {selectedAssignment.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{selectedAssignment.instructions}</p>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Figma Design / HTML Submission URL</label>
                      <input 
                        type="url" 
                        required
                        placeholder="https://figma.com/file/my-ui-design-heroscreen"
                        value={submittingLink}
                        onChange={(e) => setSubmittingLink(e.target.value)}
                        className="w-full p-3 bg-white/50 dark:bg-black/20 border border-border rounded-xl text-xs outline-none focus:border-primary transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      {isSubmitting ? "Uploading..." : "Submit File (XP +150)"} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAssignment(null)}
                      className="w-full py-2 bg-transparent text-muted-foreground font-semibold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="glass-panel p-6 rounded-2xl border border-dashed border-border text-center py-10 space-y-2">
                    <FileText className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                    <h5 className="font-bold text-xs">Class Work Submission</h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      Click the "Turn In" button on any pending homework card to open the Figma/code project submission form.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: SECURE LOCKED QUIZZES CARD ==================== */}
        {activeTab === "quizzes" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-bold tracking-tight">AI Generated Syllabus Assessments</h3>
              <p className="text-xs text-muted-foreground mt-1">Tests remain strictly padlocked until the associated lecture is completed.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentLectures.map((lec) => {
                const quiz = quizzes.find(q => q.lecture_id === lec.id);
                if (!quiz) return null;

                const completed = progress.some(p => p.student_id === studentId && p.lecture_id === lec.id && p.completed);
                const score = getLectureScore(lec.id);
                const isLocked = quiz.unlock_required && !completed;

                return (
                  <div key={quiz.id} className="relative overflow-hidden rounded-2xl border glass-panel flex flex-col justify-between h-56 transition-all duration-300">
                    
                    {/* Visual locked state overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 z-10 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none">
                        <div className="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3.5 shadow-xl animate-pulse">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Assessment Padlocked</h4>
                        <p className="text-[9px] text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                          Please access **Lectures** or **Courses** to watch "{lec.title}" first to unlock!
                        </p>
                      </div>
                    )}

                    {/* Unlocked / Completed View */}
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold uppercase tracking-widest font-mono text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-md border border-emerald-500/20">Unlocked Active</span>
                          {score !== null && (
                            <span className="text-[9px] font-bold text-primary font-mono uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Best: {score}%</span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm leading-snug line-clamp-2">{lec.title}</h4>
                        <p className="text-[10px] text-muted-foreground">Contains exactly {quiz.questions_json.length} Generative MCQ assessment questions.</p>
                      </div>

                      <div className="pt-4 border-t border-border/80 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1"><Award className="w-3.5 h-3.5 text-primary" /> Reward: 250 XP</span>
                        <button
                          onClick={() => {
                            setSelectedQuizLecture(lec);
                            setQuizOpen(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 shadow-lg"
                        >
                          {score !== null ? "Retake Quiz" : "Take Quiz"} <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 6: LIVE VIRTUAL CLASSROOM ==================== */}
        {activeTab === "live" && (
          <div className="grid lg:grid-cols-4 gap-6 animate-fade-in">
            {/* Live broadcast stream view */}
            <div className="lg:col-span-3 space-y-4">
              <div className="glass-panel p-2.5 rounded-2xl border border-border bg-black/95 aspect-video relative overflow-hidden flex flex-col items-center justify-center">
                {/* Blank live class area */}
                {(() => {
                  const activeLiveClass = liveClasses.find(lc => 
                    enrolledCourseIds.has(lc.course_id) && (lc.status === 'Live' || lc.status === 'Upcoming')
                  );
                  
                  if (activeLiveClass && activeLiveClass.meeting_link) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                          <Radio className="w-8 h-8 text-rose-400 animate-pulse" />
                        </div>
                        <h3 className="text-white font-extrabold text-lg">{activeLiveClass.title}</h3>
                        <p className="text-white/50 text-xs max-w-sm leading-relaxed">Hosted by {activeLiveClass.instructor}</p>
                        <div className="bg-white/10 border border-white/10 rounded-xl px-5 py-2.5 text-center">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold block mb-1">Room ID</span>
                          <span className="text-white font-mono font-bold text-sm">{activeLiveClass.meeting_link}</span>
                        </div>
                        <a 
                          href={activeLiveClass.meeting_link.startsWith('http') ? activeLiveClass.meeting_link : `#`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markLiveAttendance(activeLiveClass.id, studentId, "present")}
                          className="px-8 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Radio className="w-4 h-4" /> Join Live Room
                        </a>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Radio className="w-8 h-8 text-white/30" />
                      </div>
                      <h3 className="text-white/70 font-extrabold text-lg">No Active Live Session</h3>
                      <p className="text-white/30 text-xs max-w-sm leading-relaxed">When your teacher schedules a live class, the Room ID will appear here. Join using the shared link to participate.</p>
                    </div>
                  );
                })()}
                
                <div className="absolute top-4 left-4 bg-rose-600/80 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 border border-rose-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span> Live Classroom
                </div>
              </div>
              
              {/* Scheduled sessions list */}
              <div className="space-y-3">
                {liveClasses.filter(lc => enrolledCourseIds.has(lc.course_id)).map(lc => {
                  const c = courses.find(course => course.id === lc.course_id) || { title: "General" };
                  return (
                    <div key={lc.id} className="p-3 bg-white/40 dark:bg-black/20 border border-border rounded-xl flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-xs flex items-center gap-1.5">
                          <Radio className={`w-3.5 h-3.5 ${lc.status === 'Live' ? 'text-rose-500 animate-pulse' : 'text-muted-foreground'}`} /> {lc.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                          <span>{lc.instructor}</span>
                          <span>{new Date(lc.date || lc.class_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            lc.status === 'Live' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            lc.status === 'Upcoming' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>{lc.status}</span>
                        </div>
                        {lc.meeting_link && (
                          <span className="text-[9px] font-mono text-primary font-bold">Room: {lc.meeting_link}</span>
                        )}
                      </div>
                      {lc.meeting_link && (
                        <a 
                          href={lc.meeting_link.startsWith('http') ? lc.meeting_link : `#`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markLiveAttendance(lc.id, studentId, "present")}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[9px] uppercase tracking-wider border border-primary/20 shrink-0 transition-all"
                        >
                          Join
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Box */}
            <div className="glass-panel rounded-2xl border border-border flex flex-col h-[60vh] justify-between overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-white/50 dark:bg-black/10 shrink-0 font-bold text-xs flex items-center justify-between">
                <span>Classroom Chat Feed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {/* Chat messages viewport */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3">
                {courseMessages.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-6">No messages yet. Start the discussion!</p>
                )}
                {courseMessages.map((msg) => (
                  <div key={msg.id} className="text-xs space-y-0.5">
                    <span className="font-bold text-[10px] text-primary block">{msg.sender_name}{msg.sender_id === studentId ? ' (You)' : ''}</span>
                    <p className="bg-muted p-2 rounded-xl text-foreground inline-block leading-relaxed max-w-[90%]">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendLiveChat} className="p-3 border-t border-border bg-white/50 dark:bg-black/10 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-grow p-2.5 bg-white/50 dark:bg-black/25 border border-border rounded-xl text-xs outline-none focus:border-primary"
                />
                <button type="submit" className="p-2.5 rounded-xl bg-primary text-white hover:scale-105 active:scale-95 transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================== TAB 7: GAMIFIED LEADERBOARD ==================== */}
        {activeTab === "leaderboard" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce shadow-lg shadow-amber-500/5 glow-indigo" />
              <h3 className="text-2xl font-black text-gradient-purple">Learn Guru Global Standings</h3>
              <p className="text-xs text-muted-foreground">Compete inside student cohorts. Gain XP by checking notes, finishing homework, and taking quizzes.</p>
            </div>

            <div className="glass-panel rounded-3xl border border-border overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-border bg-white/50 dark:bg-black/10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="col-span-2">Rank</div>
                <div className="col-span-6">Student</div>
                <div className="col-span-2 text-center">Level</div>
                <div className="col-span-2 text-right">Total XP</div>
              </div>

              <div className="divide-y divide-border/60">
                {leaderboard.map((student, idx) => {
                  const isSelf = student.student_id === studentId;
                  const rankIcons = ["🥇", "🥈", "🥉"];
                  
                  return (
                    <div key={student.student_id} className={`grid grid-cols-12 gap-3 px-6 py-4 items-center transition-all ${
                      isSelf ? 'bg-primary/5 border-y border-primary/20 text-foreground font-semibold shadow-inner shadow-primary/5' : 'hover:bg-white/5 dark:hover:bg-white/5'
                    }`}>
                      <div className="col-span-2 font-mono font-bold text-sm">
                        {rankIcons[idx] ? rankIcons[idx] : `#${idx + 1}`}
                      </div>

                      <div className="col-span-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/10 to-accent/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                          {student.avatar || student.name.charAt(0)}
                        </div>
                        <span className="truncate text-xs font-bold leading-tight">{student.name} {isSelf && "(You)"}</span>
                      </div>

                      <div className="col-span-2 text-center text-xs font-bold font-mono text-indigo-400">
                        LVL {student.level}
                      </div>

                      <div className="col-span-2 text-right text-xs font-bold font-mono text-primary">
                        {student.xp} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 8: PEER & AI TUTOR CHAT PANEL ==================== */}
        {activeTab === "chat" && (
          <div className="max-w-4xl mx-auto glass-panel rounded-3xl border border-border flex flex-col h-[70vh] justify-between overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-white/50 dark:bg-black/10 shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg animate-pulse shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm leading-tight">Learn Guru AI Academic Assistant</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Powered by the Gemini cognitive engine</p>
              </div>
            </div>

            {/* Chat Body viewport */}
            <div className="flex-grow p-6 overflow-y-auto space-y-4">
              {aiChatMessages.map((msg, idx) => {
                const isUser = msg.sender === "You";
                return (
                  <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-scale-up`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="space-y-0.5 max-w-[80%]">
                      <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest block">{msg.sender}</span>
                      <p className={`p-3 rounded-2xl text-xs leading-relaxed inline-block border select-text ${
                        isUser 
                          ? 'bg-primary border-transparent text-white font-semibold shadow-lg shadow-primary/5' 
                          : 'glass-panel border-border bg-white/40 dark:bg-card/45 text-foreground/90'
                      }`}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              })}
              {aiChatLoading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shrink-0 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono font-bold animate-pulse">AI Tutor is typing...</span>
                </div>
              )}
              {courseMessages.slice(-6).map((msg) => (
                <div key={msg.id} className="text-[10px] text-muted-foreground">
                  {msg.sender_name}: {msg.content}
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAiChat} className="p-4 border-t border-border bg-white/50 dark:bg-black/10 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="Ask me anything: 'Explain glassmorphism borders', or 'What is startTransition?'"
                className="flex-grow p-3 bg-white/50 dark:bg-black/25 border border-border rounded-xl text-xs outline-none focus:border-primary transition-all text-foreground"
              />
              <button 
                type="submit"
                disabled={aiChatLoading} 
                className="px-5 py-3 rounded-xl bg-primary text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg disabled:opacity-50 disabled:pointer-events-none shrink-0"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        )}

        {/* ==================== TAB 9: PERFORMANCE ANALYTICS ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Syllabus Performance Analytics</h3>
              <p className="text-xs text-muted-foreground mt-1">Examine your score distributions, XP progression, and total weekly hours studied.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* XP progression line graph */}
              <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
                <h4 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" /> Quiz Score History
                </h4>
                <div className="h-64 w-full">
                  {quizScoreTrend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Take a quiz to see your score history.</div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={quizScoreTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1c1c2c', border: '1px solid #28283c', borderRadius: '8px', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorXp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Study Hours bar chart */}
              <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
                <h4 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" /> Course Completion (%)
                </h4>
                <div className="h-64 w-full">
                  {courseProgressData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Enroll in a course to track completion.</div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1c1c2c', border: '1px solid #28283c', borderRadius: '8px', fontSize: '10px' }} />
                      <Bar dataKey="progress" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Embedded Assessment Modal Overlay */}
      {quizOpen && selectedQuizLecture && (
        <QuizTaker
          lesson={selectedQuizLecture}
          quiz={quizzes.find(q => q.lecture_id === selectedQuizLecture.id)}
          onClose={() => {
            setQuizOpen(false);
            setSelectedQuizLecture(null);
          }}
        />
      )}
      <AIChatbot />
    </DashboardLayout>
  );
};
