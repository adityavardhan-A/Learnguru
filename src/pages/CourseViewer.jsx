import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGemini } from '../hooks/useGemini';
import { QuizTaker } from '../components/QuizTaker';
import { 
  ChevronLeft, 
  Sparkles, 
  CheckCircle, 
  PlayCircle, 
  BookOpen, 
  FileText, 
  ArrowRight,
  Award,
  Video,
  Menu,
  X,
  Copy,
  Loader2,
  Lock,
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export const CourseViewer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { courses, lectures, quizzes, progress, enrollments, updateProgress } = useApp();
  const { generateSummary, loadingAI } = useGemini();

  const [activeLecture, setActiveLecture] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [quizOpen, setQuizOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Custom Audio State for Voice Notes
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const studentId = user?.id;

  // 1. Fetch Course details
  const activeCourse = courses.find(c => c.id === courseId);
  const isEnrolled = user?.role !== "student" || enrollments.some(
    (e) => e.student_id === studentId && e.course_id === courseId
  );
  const courseLectures = lectures.filter(l => l.course_id === courseId).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));

  // Set first lecture as default
  useEffect(() => {
    if (courseLectures.length > 0 && !activeLecture) {
      setActiveLecture(courseLectures[0]);
    }
  }, [courseLectures, activeLecture]);

  // Handle Audio events
  useEffect(() => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [activeLecture]);

  if (!activeCourse || !isEnrolled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-bold text-lg">Course Not Found</h3>
        <button
          onClick={() => navigate('/student')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // 2. Parsers
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      return null;
    }
    return `https://www.youtube.com/embed/${videoId}`;
  };

  // 3. Status checks
  const isLectureCompleted = (lectureId) => {
    return progress.some(p => p.student_id === studentId && p.lecture_id === lectureId && p.completed);
  };

  const getLectureScore = (lectureId) => {
    const record = progress.find(p => p.student_id === studentId && p.lecture_id === lectureId);
    return record?.score !== undefined ? record.score : null;
  };

  const activeLectureQuiz = quizzes.find(q => q.lecture_id === activeLecture?.id);
  const activeLectureCompleted = activeLecture ? isLectureCompleted(activeLecture.id) : false;
  const activeLectureScore = activeLecture ? getLectureScore(activeLecture.id) : null;

  // Enforce locked quizzes state rule
  const isQuizLocked = activeLectureQuiz?.unlock_required && !activeLectureCompleted;

  // Audio Handlers
  const handleTogglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(() => {
        toast.warning("Audio Load Fail", "Could not play the voice note.");
      });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 0;
    setAudioCurrentTime(current);
    setAudioProgress(duration > 0 ? (current / duration) * 100 : 0);
  };

  const handleAudioLoadedMetadata = () => {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration || 0);
  };

  const handleAudioSeek = (e) => {
    if (!audioRef.current) return;
    const pct = parseFloat(e.target.value);
    const duration = audioRef.current.duration || 0;
    const newTime = (pct / 100) * duration;
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
    setAudioProgress(pct);
  };

  const formatTime = (timeInSecs) => {
    if (isNaN(timeInSecs)) return "00:00";
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 4. Action: Toggle completed
  const handleToggleComplete = async () => {
    if (!activeLecture) return;
    const isCompleted = isLectureCompleted(activeLecture.id);
    const res = await updateProgress(activeLecture.id, !isCompleted, null);
    if (res.success) {
      toast.success(
        !isCompleted ? "Lecture Completed!" : "Status Updated",
        !isCompleted 
          ? `XP Gained +100! Congratulations on completing "${activeLecture.title}"! The associated quiz has unlocked.` 
          : "Lecture marked incomplete."
      );
    } else {
      toast.error("Error", "Failed to update learning progress.");
    }
  };

  // 5. Action: Summarize via Gemini
  const handleSummarizeWithAI = async () => {
    if (activeLecture?.ai_summary) {
      setSummaryOpen(true);
      setAiSummary(activeLecture.ai_summary);
      toast.success("AI Summary Loaded", "Displayed pre-generated summary!");
      return;
    }

    if (!activeLecture?.notes) {
      toast.warning("Empty Notes", "There are no written notes to summarize in this lecture.");
      return;
    }

    setSummaryOpen(true);
    setAiSummary('');
    try {
      const summary = await generateSummary(activeLecture.title, activeLecture.notes);
      setAiSummary(summary);
      toast.success("AI Summarization Deployed", "Lecture notes summarized beautifully using Gemini AI!");
    } catch {
      toast.error("AI Error", "Could not complete summary generation.");
      setSummaryOpen(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(aiSummary);
    toast.success("Copied to Clipboard", "AI Summary markdown copied successfully.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex relative selection:bg-primary/20">
      
      {/* 1. Left Classroom Syllabus Sidebar Drawer */}
      <aside 
        className={`${
          sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
        } fixed lg:sticky top-0 z-40 h-screen bg-white/80 dark:bg-card/45 backdrop-blur-xl border-r border-border flex flex-col justify-between transition-all duration-300 overflow-hidden shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Back Navigation & toggle */}
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <button
              onClick={() => navigate(user?.role === 'teacher' ? '/teacher' : '/student')}
              className="flex items-center gap-1.5 font-bold text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Exit Class
            </button>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg border border-border hover:bg-muted text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbnail preview */}
          {sidebarOpen && (
            <div className="p-4 border-b border-border bg-black/5 dark:bg-white/5 shrink-0 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-black/10 overflow-hidden shrink-0">
                <img 
                  src={activeCourse.thumbnail} 
                  alt={activeCourse.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs truncate leading-snug">{activeCourse.title}</h4>
                <span className="text-[9px] uppercase font-mono tracking-widest text-primary font-bold font-black">Learn Guru LMS</span>
              </div>
            </div>
          )}

          {/* Lecture listings */}
          <div className="flex-grow overflow-y-auto p-3 space-y-1.5">
            {sidebarOpen && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 block mb-2 mt-1">Course Lectures</span>
            )}
            
            {courseLectures.map((lecture, idx) => {
              const active = activeLecture?.id === lecture.id;
              const completed = isLectureCompleted(lecture.id);
              const score = getLectureScore(lecture.id);
              const hasQuiz = quizzes.some(q => q.lecture_id === lecture.id);

              return (
                <button
                  key={lecture.id}
                  onClick={() => {
                    setActiveLecture(lecture);
                    setSummaryOpen(false);
                    setAiSummary('');
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-start gap-3.5 transition-all duration-200 group ${
                    active
                      ? 'bg-primary border-transparent text-white shadow-lg shadow-primary/10'
                      : 'border-transparent hover:bg-white/10 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                    active
                      ? 'bg-white/20 text-white border border-white/10'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>

                  {sidebarOpen && (
                    <div className="overflow-hidden flex-grow">
                      <span className="font-bold text-xs leading-snug line-clamp-2">{lecture.title}</span>
                      
                      {/* Meta badges */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {completed && (
                          <span className={`flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-emerald-400'}`}>
                            <CheckCircle className="w-3 h-3" /> Completed
                          </span>
                        )}
                        {score !== null && (
                          <span className={`text-[9px] font-mono px-1 rounded ${active ? 'bg-white/20 text-white' : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'}`}>
                            Grade: {score}%
                          </span>
                        )}
                        {hasQuiz && !completed && (
                          <span className={`flex items-center gap-0.5 text-[9px] font-semibold ${active ? 'text-white' : 'text-purple-400'}`}>
                            <Sparkles className="w-3 h-3" /> Quiz Locked
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* 2. Central Classroom Workspace */}
      <div className="flex-grow flex flex-col min-w-0 min-h-screen">
        
        {/* Mobile menu toggle bar */}
        <header className="sticky top-0 z-30 lg:hidden bg-white/40 dark:bg-background/20 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl border border-border bg-card/50 text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-black text-xs tracking-wider">LEARN GURU SYLLABUS</span>
          <div className="w-9" />
        </header>

        {activeLecture ? (
          <div className="p-5 md:p-8 space-y-6 max-w-5xl w-full mx-auto flex-grow flex flex-col justify-between">
            {/* Lecture details container */}
            <div className="space-y-6">
              
              {/* Syllabus Title Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-primary font-black">Active Lecture Module</span>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">{activeLecture.title}</h2>
                </div>
                
                {/* AI Summary button */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSummarizeWithAI}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" /> Summarize Notes
                  </button>
                </div>
              </div>

              {/* YouTube Video Player Embed */}
              {activeLecture.youtube_video_url && getYoutubeEmbedUrl(activeLecture.youtube_video_url) ? (
                <div className="glass-panel p-2.5 rounded-2xl border border-border overflow-hidden shrink-0 glow-indigo">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20">
                    <iframe
                      src={getYoutubeEmbedUrl(activeLecture.youtube_video_url)}
                      title={activeLecture.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-8 rounded-2xl text-center border border-dashed border-border flex flex-col items-center justify-center gap-3 py-10 shrink-0">
                  <Video className="w-10 h-10 text-muted-foreground/60" />
                  <div>
                    <h4 className="font-bold text-sm">No Embedded Video Demonstration</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                      This chapter consists of conceptual study guides, audio voice notes, and multiple-choice quizzes.
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Voice Notes Player Deck */}
              {activeLecture.voice_note_url && (
                <div className="glass-panel p-4 md:p-5 rounded-2xl border border-border bg-gradient-to-r from-primary/5 via-accent/5 to-transparent shrink-0">
                  <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Prof. Sterling's Voice Lecture Summary
                  </div>

                  {/* Audio Engine (Hidden DOM elements) */}
                  <audio 
                    ref={audioRef}
                    src={activeLecture.voice_note_url}
                    onTimeUpdate={handleAudioTimeUpdate}
                    onLoadedMetadata={handleAudioLoadedMetadata}
                    onEnded={() => setIsPlayingAudio(false)}
                  />

                  {/* Visual Interface */}
                  <div className="flex items-center gap-4">
                    {/* Play button */}
                    <button
                      onClick={handleTogglePlayAudio}
                      className="w-11 h-11 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </button>

                    {/* Progress Slider */}
                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground font-bold">
                        <span>{formatTime(audioCurrentTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioProgress}
                        onChange={handleAudioSeek}
                        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Volume icon */}
                    <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground shrink-0 px-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-mono font-bold">STEREO</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Study Notes Markdown Pane */}
              <div className="glass-panel p-6 md:p-8 rounded-2xl border border-border bg-white/40 dark:bg-card/25">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 pb-2 border-b border-border/80">
                  <FileText className="w-4.5 h-4.5 text-primary" /> Written Study Notes
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed space-y-4 font-normal text-foreground/90 whitespace-pre-wrap select-text">
                  {activeLecture.notes || "Written lecture references are blank."}
                </div>
              </div>
            </div>

            {/* Bottom Actions Row: Progress completes & Quiz trigger */}
            {user?.role === 'student' && (
              <div className="pt-6 mt-8 border-t border-border shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Complete checkbox */}
                <button
                  onClick={handleToggleComplete}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                    activeLectureCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                      : 'border-border bg-white dark:bg-card hover:bg-muted text-foreground'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 ${activeLectureCompleted ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  {activeLectureCompleted ? "Lecture Marked Completed" : "Mark Lecture Completed"}
                </button>

                {/* Take quiz trigger with STRICT locked states */}
                {activeLectureQuiz ? (
                  isQuizLocked ? (
                    <div className="relative group w-full sm:w-auto">
                      <button
                        disabled
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-muted text-muted-foreground font-black text-sm flex items-center justify-center gap-2 border border-border cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Quiz Locked
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/80 dark:bg-card text-white text-[10px] px-3 py-2 rounded-lg border border-border shrink-0 text-center w-52 shadow-2xl z-50">
                        🔒 Take Quiz rule: Mark the lecture completed above to unlock!
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setQuizOpen(true)}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all animate-pulse"
                    >
                      <Award className="w-5 h-5 animate-bounce-slow" />
                      {activeLectureScore !== null ? `Retake Quiz (Best: ${activeLectureScore}%)` : "Challenge AI Quiz"}
                    </button>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <HelpCircle className="w-4 h-4" /> No Quiz Deployed.
                  </span>
                )}
              </div>
            )}

          </div>
        ) : (
          /* Landing skeleton */
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-mesh animate-fade-in">
            <BookOpen className="w-14 h-14 text-primary mb-4 animate-bounce-slow" />
            <h3 className="font-extrabold text-lg">Learn Guru Digital Classroom</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              Select one of the syllabus chapters on the left curriculum panel to launch interactive video notes and audio feeds.
            </p>
          </div>
        )}
      </div>

      {/* 3. Collapsible Right Pane Drawer: AI Notes Summarizer */}
      {summaryOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col justify-between animate-slide-left">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/10">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-extrabold text-sm tracking-wider uppercase">AI Summarizer Drawer</span>
            </div>
            <button
              onClick={() => {
                setSummaryOpen(false);
                setAiSummary('');
              }}
              className="p-1.5 rounded-xl border border-border hover:bg-muted text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary body viewport */}
          <div className="flex-grow p-6 overflow-y-auto selection:bg-primary/20">
            {loadingAI ? (
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-muted animate-pulse rounded-full w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded-full w-2/3" />
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded-md" />
                  <div className="h-4 bg-muted animate-pulse rounded-md w-11/12" />
                  <div className="h-4 bg-muted animate-pulse rounded-md w-5/6" />
                  <div className="h-4 bg-muted animate-pulse rounded-md w-3/4" />
                </div>
                <div className="space-y-3 pt-4">
                  <div className="h-20 bg-muted animate-pulse rounded-xl" />
                </div>
              </div>
            ) : aiSummary ? (
              <div className="prose prose-slate dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed space-y-4 font-normal text-foreground/90 whitespace-pre-wrap select-text animate-fade-in">
                {aiSummary}
              </div>
            ) : (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-xs text-muted-foreground font-mono">Synthesizing summaries via Gemini API...</p>
              </div>
            )}
          </div>

          {/* Footer actions copy */}
          {aiSummary && !loadingAI && (
            <div className="p-4 border-t border-border shrink-0 bg-white/50 dark:bg-black/10">
              <button
                onClick={handleCopySummary}
                className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Copy className="w-4 h-4" /> Copy AI Summary Markdown
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Active Quiz Taker modal */}
      {quizOpen && activeLecture && activeLectureQuiz && (
        <QuizTaker
          lesson={activeLecture}
          quiz={activeLectureQuiz}
          onClose={() => setQuizOpen(false)}
        />
      )}

    </div>
  );
};

// Add standard inline CSS keyframe animation for mobile slide-in
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideLeft {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .animate-slide-left {
      animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}
