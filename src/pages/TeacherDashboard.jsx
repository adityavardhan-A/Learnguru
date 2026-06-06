import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGemini } from '../hooks/useGemini';
import { AIChatbot } from '../components/AIChatbot';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  Plus, 
  BookOpen, 
  BookMarked, 
  Users, 
  Trophy, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight,
  Sparkles, 
  ExternalLink,
  Loader2,
  ListRestart,
  Video,
  FileText,
  Clock,
  Download,
  AlertCircle,
  Radio,
  Send,
  CheckCircle,
  User,
  GraduationCap
} from 'lucide-react';

export const TeacherDashboard = () => {
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
    saveCourse, 
    deleteCourse, 
    saveLecture, 
    deleteLecture,
    reorderLectures,
    saveQuiz,
    deleteQuiz,
    saveAssignment,
    deleteAssignment,
    gradeSubmission,
    saveLiveClass,
    deleteLiveClass,
    messages
  } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const { generateQuiz, loadingAI } = useGemini();

  // Tab State
  const [activeTab, setActiveTab] = useState("dashboard");

  // Selected state for navigation
  const [selectedCourse, setSelectedCourse] = useState(null); 
  
  // Modal & form controllers
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ id: null, title: '', description: '', category: '', thumbnail: '' });
  
  const [lectureModalOpen, setLectureModalOpen] = useState(false);
  const [lectureForm, setLectureForm] = useState({ id: null, title: '', description: '', youtube_video_url: '', voice_note_url: '', notes: '', ai_summary: '' });

  // Quiz Editor State
  const [quizEditorOpen, setQuizEditorOpen] = useState(false);
  const [editingQuizLecture, setEditingQuizLecture] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ id: null, course_id: '', title: '', instructions: '', due_date: '', attachment_url: '' });

  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveForm, setLiveForm] = useState({ id: null, title: '', course_id: '', instructor: user?.name || '', provider: 'Google Meet', status: 'Upcoming', date: '', meeting_link: '' });

  // Grading states
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingScore, setGradingScore] = useState('');
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  // Live Class Chat (Course Messages)
  // Derived directly from real-time messages array

  // 1. Calculations & Metrics
  const teacherCourses = courses.filter(c => c.teacher_id === user?.id);
  const totalLecturesCount = lectures.filter(l => teacherCourses.some(c => c.id === l.course_id)).length;
  const totalSubmissionsCount = submissions.length;
  
  const uniqueStudentsCount = new Set(
    enrollments
      .filter(e => teacherCourses.some(c => c.id === e.course_id))
      .map(e => e.student_id)
  ).size || 0;

  // Average quiz score across this teacher's lectures (real data)
  const teacherLectureIds = lectures
    .filter(l => teacherCourses.some(c => c.id === l.course_id))
    .map(l => l.id);
  const teacherScores = progress
    .filter(p => teacherLectureIds.includes(p.lecture_id) && p.score !== null && p.score !== undefined)
    .map(p => p.score);
  const averageScoreValue = teacherScores.length > 0
    ? Math.round(teacherScores.reduce((a, b) => a + b, 0) / teacherScores.length)
    : 0;

  // Recharts enrollment data mapping (real enrollment counts)
  const enrollmentChartData = teacherCourses.map(course => ({
    name: course.title.length > 20 ? course.title.substring(0, 18) + '...' : course.title,
    students: enrollments.filter(e => e.course_id === course.id).length
  }));

  const quizPerformanceData = teacherCourses.map((course) => {
    const lectureIds = lectures.filter(l => l.course_id === course.id).map(l => l.id);
    const scores = progress.filter(p => lectureIds.includes(p.lecture_id) && p.score !== null && p.score !== undefined).map(p => p.score);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      course: course.title.length > 10 ? course.title.substring(0, 10) + '...' : course.title,
      average: avg
    };
  });

  // 2. Action: Save Course
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    if (!courseForm.title) {
      toast.warning("Title Required", "Please name your course.");
      return;
    }

    const payload = {
      id: courseForm.id,
      title: courseForm.title,
      description: courseForm.description,
      category: courseForm.category || 'General',
      thumbnail: courseForm.thumbnail || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80`
    };

    const res = await saveCourse(payload);
    if (res.success) {
      toast.success("Success", courseForm.id ? "Course details updated." : "New course deployed successfully!");
      setCourseModalOpen(false);
      setCourseForm({ id: null, title: '', description: '', category: '', thumbnail: '' });
      if (courseForm.id) {
        setSelectedCourse(prev => ({ ...prev, ...payload }));
      }
    } else {
      toast.error("Error", res.error || "Failed to submit course form.");
    }
  };

  // 3. Action: Delete Course
  const handleCourseDelete = async (id, title) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${title}"? All lectures and quizzes will be deleted permanently.`)) {
      const res = await deleteCourse(id);
      if (res.success) {
        toast.success("Deleted", "Course removed successfully.");
        if (selectedCourse?.id === id) {
          setSelectedCourse(null);
        }
      } else {
        toast.error("Error", "Could not remove course.");
      }
    }
  };

  // 4. Action: Save Lecture
  const handleLectureSubmit = async (e) => {
    e.preventDefault();
    if (!lectureForm.title) {
      toast.warning("Validation Failed", "Lecture must have a title.");
      return;
    }

    const res = await saveLecture({
      id: lectureForm.id,
      course_id: selectedCourse.id,
      title: lectureForm.title,
      description: lectureForm.description || '',
      youtube_video_url: lectureForm.youtube_video_url || '',
      voice_note_url: lectureForm.voice_note_url || '',
      notes: lectureForm.notes || '',
      ai_summary: lectureForm.ai_summary || ''
    });

    if (res.success) {
      toast.success("Lecture Saved", lectureForm.id ? "Lecture notes updated successfully." : "Lecture added to course curriculum.");
      setLectureModalOpen(false);
      setLectureForm({ id: null, title: '', description: '', youtube_video_url: '', voice_note_url: '', notes: '', ai_summary: '' });
    } else {
      toast.error("Error", res.error || "Failed to commit lecture.");
    }
  };

  // 5. Action: Delete Lecture
  const handleLectureDelete = async (id, title) => {
    if (window.confirm(`Delete lecture "${title}"?`)) {
      const res = await deleteLecture(id);
      if (res.success) {
        toast.success("Lecture Removed", "Syllabus updated.");
      } else {
        toast.error("Error", "Failed to delete lecture.");
      }
    }
  };

  // 5b. Local File Reading & Audio Parsing Handlers
  const handleNotesFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLectureForm(prev => ({ ...prev, notes: event.target.result }));
      toast.success("File Loaded", `Loaded written notes from "${file.name}" successfully!`);
    };
    reader.onerror = () => {
      toast.error("Read Fail", "Could not read the selected text file.");
    };
    reader.readAsText(file);
  };

  const handleVoiceNoteFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLectureForm(prev => ({ ...prev, voice_note_url: event.target.result }));
      toast.success("Audio Loaded", `Voice note audio file "${file.name}" loaded successfully!`);
    };
    reader.onerror = () => {
      toast.error("Read Fail", "Could not read the selected audio file.");
    };
    reader.readAsDataURL(file);
  };

  // 6. Action: Generate Quiz via Gemini
  const handleAIGeneratedQuiz = async (lecture) => {
    if (!lecture.notes) {
      toast.warning("Empty Notes", "Please write or summarize some lecture notes before generating a quiz.");
      return;
    }

    toast.info("Consulting Gemini", "Parsing syllabus notes to generate standards-based quiz. Please wait...");
    try {
      const questions = await generateQuiz(lecture.title, lecture.notes);
      setQuizQuestions(questions);
      setEditingQuizLecture(lecture);
      setQuizEditorOpen(true);
      toast.success("Quiz Generated", "Customize and edit your 5-MCQ generated questions below before publishing!");
    } catch (err) {
      toast.error("Generative AI Timeout", err.message || "Failed to parse notes using Gemini API.");
    }
  };

  // 6b. Quiz Editor Panel Event Actions
  const handleQuizQuestionChange = (qIdx, field, value) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      return { ...q, [field]: value };
    }));
  };

  const handleQuizOptionChange = (qIdx, optIdx, value) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const nextOptions = [...q.options];
      nextOptions[optIdx] = value;
      return { ...q, options: nextOptions };
    }));
  };

  const handleQuizCorrectAnswerChange = (qIdx, selectedLetter) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const optIdx = selectedLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
      return { ...q, answer: q.options[optIdx] };
    }));
  };

  const handleAddQuizQuestion = () => {
    setQuizQuestions(prev => [
      ...prev,
      {
        question: "New Custom MCQ Question text",
        options: ["Option A text", "Option B text", "Option C text", "Option D text"],
        answer: "Option A text",
        explanation: "This is a detailed explanation of why Option A is correct."
      }
    ]);
  };

  const handleRemoveQuizQuestion = (qIdx) => {
    if (quizQuestions.length <= 1) {
      toast.warning("Validation", "A quiz must have at least one question.");
      return;
    }
    setQuizQuestions(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const handlePublishQuiz = async () => {
    const validatedQuestions = [];
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.question.trim()) {
        toast.warning("Empty Question", `Question ${i + 1} cannot be blank.`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        toast.warning("Empty Option", `All options for Question ${i + 1} must be filled.`);
        return;
      }
      const answer = q.options.includes(q.answer) ? q.answer : q.options[0];
      validatedQuestions.push({
        ...q,
        answer
      });
    }

    const quizPayload = {
      lecture_id: editingQuizLecture.id,
      questions_json: validatedQuestions
    };

    const res = await saveQuiz(quizPayload);
    if (res.success) {
      toast.success("Quiz Published", "MCQ assessment successfully updated and published to cohort courses!");
      setQuizEditorOpen(false);
      setQuizQuestions([]);
      setEditingQuizLecture(null);
    } else {
      toast.error("Publish Fail", res.error || "Could not publish quiz.");
    }
  };

  const handleEditExistingQuiz = (lecture, existingQuiz) => {
    setQuizQuestions(existingQuiz.questions_json);
    setEditingQuizLecture(lecture);
    setQuizEditorOpen(true);
  };

  // 7. Action: Save Assignment
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title || !assignmentForm.course_id) {
      toast.warning("Validation Failed", "Please provide a title and select a course.");
      return;
    }

    const res = await saveAssignment({
      ...assignmentForm,
      due_date: assignmentForm.due_date || new Date(Date.now() + 86400000 * 7).toISOString()
    });

    if (res.success) {
      toast.success(assignmentForm.id ? "Assignment Updated" : "Assignment Deployed", "Saved and visible to students!");
      setAssignmentModalOpen(false);
      setAssignmentForm({ id: null, course_id: '', title: '', instructions: '', due_date: '', attachment_url: '' });
    } else {
      toast.error("Error", "Failed to save assignment.");
    }
  };

  const openAssignmentEdit = (a) => {
    setAssignmentForm({
      id: a.id,
      course_id: a.course_id,
      title: a.title,
      instructions: a.instructions || '',
      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 10) : '',
      attachment_url: a.attachment_url || ''
    });
    setAssignmentModalOpen(true);
  };

  const handleAssignmentDelete = async (id) => {
    if (window.confirm("Delete this assignment? All related submissions will be removed.")) {
      const res = await deleteAssignment(id);
      if (res.success) toast.success("Deleted", "Assignment removed.");
      else toast.error("Error", res.error || "Failed to delete.");
    }
  };

  const handleQuizDelete = async (lectureId) => {
    if (window.confirm("Delete this quiz?")) {
      const res = await deleteQuiz(lectureId);
      if (res.success) toast.success("Quiz Deleted", "The quiz was removed from this lecture.");
      else toast.error("Error", res.error || "Failed to delete quiz.");
    }
  };

  // 8. Action: Grade Submission
  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const scoreVal = parseInt(gradingScore);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      toast.warning("Invalid Score", "Grade must be an integer between 0 and 100.");
      return;
    }

    setIsGrading(true);
    try {
      const res = await gradeSubmission(selectedSubmission.id, {
        score: scoreVal,
        feedback: gradingFeedback
      });
      if (res.success) {
        toast.success("Homework Graded", `Student score of ${scoreVal}% saved successfully!`);
        setSelectedSubmission(null);
        setGradingScore('');
        setGradingFeedback('');
      } else {
        toast.error("Error", "Failed to update grades.");
      }
    } catch (err) {
      toast.error("Error", "Grading failed.");
    } finally {
      setIsGrading(false);
    }
  };

  // 9. Action: Save Live Class
  const handleLiveSubmit = async (e) => {
    e.preventDefault();
    if (!liveForm.title || !liveForm.course_id) {
      toast.warning("Validation Failed", "Please fill in all live session forms.");
      return;
    }

    const res = await saveLiveClass({
      ...liveForm,
      class_date: liveForm.date || new Date().toISOString()
    });

    if (res.success) {
      toast.success(liveForm.id ? "Live Class Updated" : "Live Class Scheduled", "Saved and visible to enrolled students!");
      setLiveModalOpen(false);
      setLiveForm({ id: null, title: '', course_id: '', instructor: user?.name || '', provider: 'Google Meet', status: 'Upcoming', date: '', meeting_link: '' });
    } else {
      toast.error("Error", res.error || "Failed to save live class.");
    }
  };

  const openLiveEdit = (lc) => {
    setLiveForm({
      id: lc.id,
      title: lc.title,
      course_id: lc.course_id,
      instructor: lc.instructor || user?.name || '',
      provider: lc.provider || 'Google Meet',
      status: lc.status || 'Upcoming',
      date: lc.class_date ? new Date(lc.class_date).toISOString().slice(0, 16) : '',
      meeting_link: lc.meeting_link || ''
    });
    setLiveModalOpen(true);
  };

  const handleLiveDelete = async (id) => {
    if (window.confirm("Delete this live class? This cannot be undone.")) {
      const res = await deleteLiveClass(id);
      if (res.success) toast.success("Deleted", "Live class removed.");
      else toast.error("Error", res.error || "Failed to delete.");
    }
  };

  const openCourseEdit = (c) => {
    setCourseForm({ id: c.id, title: c.title, description: c.description, category: c.category || '', thumbnail: c.thumbnail });
    setCourseModalOpen(true);
  };

  if (user && user.role === 'teacher' && user.approved === false) {
    return (
      <DashboardLayout title="Pending Approval" activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black">Your teacher account is pending approval</h2>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            An administrator needs to approve your account before you can create and manage courses. Please check back shortly.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={selectedCourse ? `Manage Course: ${selectedCourse.title}` : `Learn Guru Teacher ${activeTab}`}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <div className="space-y-8 animate-fade-in">
        
        {/* ==================== TAB 1: TEACHER DASHBOARD OVERVIEW ==================== */}
        {activeTab === "dashboard" && !selectedCourse && (
          <>
            {/* Visual greeting card */}
            <div className="relative overflow-hidden glass-panel p-6 md:p-8 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glow-indigo">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-[200px] pointer-events-none"></div>
              <div>
                <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-widest mb-2 animate-pulse">
                  <Sparkles className="w-4 h-4" /> Instructor Workspace
                </div>
                <h2 className="text-xl md:text-3xl font-extrabold tracking-tight">
                  Welcome, {user?.name || "Professor"}!
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
                  Draft lectures, upload voice note recordings, set assignment deliverables, grade homework solutions, and schedule live broadcast slots for cohort classes.
                </p>
              </div>
              
              <div className="shrink-0 bg-white/40 dark:bg-black/20 border border-border px-5 py-4 rounded-2xl flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-primary" />
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Instructor Role</span>
                  <span className="text-xs font-black">Authorized Course Curator</span>
                </div>
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Active Catalog</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{teacherCourses.length} Courses</h3>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <BookMarked className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Syllabus Lectures</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{totalLecturesCount} chapters</h3>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Active Cohort</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{uniqueStudentsCount} Enrolled</h3>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Avg Cohort Grade</span>
                  <h3 className="text-xl md:text-2xl font-black mt-0.5">{averageScoreValue}% accuracy</h3>
                </div>
              </div>
            </div>

            {/* Curriculum grid */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/80">
                <h3 className="text-lg font-bold tracking-tight">Active Curriculums</h3>
                <button
                  onClick={() => {
                    setCourseForm({ id: null, title: '', description: '', category: '', thumbnail: '' });
                    setCourseModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Create Course
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teacherCourses.map(course => {
                  const lessonCount = lectures.filter(l => l.course_id === course.id).length;
                  return (
                    <div key={course.id} className="glass-panel rounded-2xl overflow-hidden border border-border group flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                      <div className="h-40 bg-black/10 relative overflow-hidden">
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className="absolute top-2.5 right-2.5 bg-black/80 text-[9px] font-bold text-white px-2.5 py-1 rounded border border-white/10 uppercase tracking-widest">{lessonCount} Lectures</span>
                      </div>
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm line-clamp-1 group-hover:text-primary transition-colors">{course.title}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{course.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                          <button
                            onClick={() => setSelectedCourse(course)}
                            className="flex-grow py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1"
                          >
                            Manage Curriculum <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openCourseEdit(course)} className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleCourseDelete(course.id, course.title)} className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: MANAGE COURSES CATALOG ==================== */}
        {activeTab === "courses" && !selectedCourse && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Manage Courses</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure study outlines, cover pages, and classroom tracks.</p>
              </div>
              <button
                onClick={() => {
                  setCourseForm({ id: null, title: '', description: '', category: '', thumbnail: '' });
                  setCourseModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Create Course
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacherCourses.map(course => {
                const lessonCount = lectures.filter(l => l.course_id === course.id).length;
                return (
                  <div key={course.id} className="glass-panel rounded-2xl overflow-hidden border border-border group flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                    <div className="h-44 bg-black/10 relative overflow-hidden">
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-widest">{lessonCount} Lectures</span>
                    </div>
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-base line-clamp-1 group-hover:text-primary transition-colors mb-2">{course.title}</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{course.description}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/80">
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="flex-grow py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          Manage Syllabus <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openCourseEdit(course)} className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleCourseDelete(course.id, course.title)} className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== SELECTED COURSE: CURRICULUM DETAIL ==================== */}
        {selectedCourse && (
          <div className="space-y-6 animate-fade-in">
            {/* Header navigation bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground block">Curriculum outlines</span>
                  <h2 className="font-extrabold text-xl tracking-tight">{selectedCourse.title}</h2>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0 font-bold">
                <button
                  onClick={() => openCourseEdit(selectedCourse)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs flex items-center justify-center gap-1.5 transition-all text-foreground"
                >
                  <Edit3 className="w-4 h-4" /> Edit Course
                </button>
                <button
                  onClick={() => {
                    setLectureForm({ id: null, title: '', description: '', youtube_video_url: '', voice_note_url: '', notes: '', ai_summary: '' });
                    setLectureModalOpen(true);
                  }}
                  className="flex-grow sm:flex-initial px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add Lecture Note
                </button>
              </div>
            </div>

            {/* Outlines of Lectures */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Course Outlines & Quizzes</h3>
              {lectures.filter(l => l.course_id === selectedCourse.id).length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center border border-dashed border-border/80">
                  <BookMarked className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h4 className="font-bold text-base">This course is empty</h4>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                    Draft a study lecture to begin. Write standard outline notes, add video streams, and trigger Gemini AI quiz generation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lectures.filter(l => l.course_id === selectedCourse.id).map((lecture, idx) => {
                    const hasQuiz = quizzes.some(q => q.lecture_id === lecture.id);
                    const currentQuiz = quizzes.find(q => q.lecture_id === lecture.id);
                    const courseLecturesList = lectures.filter(l => l.course_id === selectedCourse.id);
                    return (
                      <div key={lecture.id} className="glass-panel p-5 rounded-2xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/20 transition-all duration-200">
                        <div className="flex gap-4">
                          {/* Reordering Chevron buttons and index */}
                          <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                title="Move Up"
                                onClick={async () => {
                                  const res = await reorderLectures(selectedCourse.id, lecture.id, "up");
                                  if (res.success) {
                                    toast.success("Reordered", "Lecture moved up successfully.");
                                  } else {
                                    toast.warning("Cannot Move", res.error || "Failed to move up.");
                                  }
                                }}
                                disabled={idx === 0}
                                className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:pointer-events-none transition-all text-[8px]"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                title="Move Down"
                                onClick={async () => {
                                  const res = await reorderLectures(selectedCourse.id, lecture.id, "down");
                                  if (res.success) {
                                    toast.success("Reordered", "Lecture moved down successfully.");
                                  } else {
                                    toast.warning("Cannot Move", res.error || "Failed to move down.");
                                  }
                                }}
                                disabled={idx === courseLecturesList.length - 1}
                                className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:pointer-events-none transition-all text-[8px]"
                              >
                                ▼
                              </button>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm md:text-base">{lecture.title}</h4>
                            {lecture.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lecture.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                              {lecture.youtube_video_url && <span className="text-sky-400">Video Embedded</span>}
                              {lecture.voice_note_url && <span className="text-indigo-400">Voice Note Uploaded</span>}
                              <span>Notes: {lecture.notes?.length || 0} characters</span>
                              {hasQuiz ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest font-mono">Quiz Active</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest font-mono">No Quiz Deployed</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 md:justify-end">
                          <button
                            onClick={() => handleAIGeneratedQuiz(lecture)}
                            disabled={loadingAI}
                            className={`flex-grow md:flex-initial px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                              hasQuiz
                                ? 'bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 border-purple-500/15'
                                : 'bg-gradient-to-r from-primary to-accent text-white shadow-lg border-transparent'
                            }`}
                          >
                            {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                            {hasQuiz ? "Regenerate Quiz" : "Generate Quiz (Gemini)"}
                          </button>

                          {hasQuiz && (
                            <button
                              onClick={() => handleEditExistingQuiz(lecture, currentQuiz)}
                              className="px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5"
                            >
                              Edit Quiz Questions
                            </button>
                          )}

                          {hasQuiz && (
                            <button
                              onClick={() => handleQuizDelete(lecture.id)}
                              className="px-3 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 font-extrabold text-xs flex items-center justify-center gap-1.5"
                              title="Delete quiz"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setLectureForm({
                                id: lecture.id,
                                title: lecture.title,
                                description: lecture.description || '',
                                youtube_video_url: lecture.youtube_video_url || '',
                                voice_note_url: lecture.voice_note_url || '',
                                notes: lecture.notes || '',
                                ai_summary: lecture.ai_summary || ''
                              });
                              setLectureModalOpen(true);
                            }}
                            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground animate-hover"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleLectureDelete(lecture.id, lecture.title)}
                            className="p-2.5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: DEDICATED SYLLABUS LECTURES ==================== */}
        {activeTab === "lectures" && !selectedCourse && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Syllabus Outlines & Lectures</h3>
              <p className="text-xs text-muted-foreground mt-1">Select any course card below to launch the curriculum outline detail dashboard.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacherCourses.map(course => {
                const lessonCount = lectures.filter(l => l.course_id === course.id).length;
                return (
                  <div key={course.id} className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:shadow-xl transition-all">
                    <div>
                      <h4 className="font-extrabold text-sm line-clamp-1">{course.title}</h4>
                      <p className="text-xs text-muted-foreground mt-2">{lessonCount} syllabus lectures drafted.</p>
                    </div>
                    <button 
                      onClick={() => setSelectedCourse(course)}
                      className="mt-4 w-full py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1"
                    >
                      Open Syllabus Notes <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: ASSIGNMENT CREATOR & SUBMISSION GRADING CENTER ==================== */}
        {activeTab === "assignments" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Course Assignments & Grading Center</h3>
                <p className="text-xs text-muted-foreground mt-1">Draft research topics and review student homework submissions instantly.</p>
              </div>
              <button
                onClick={() => {
                  setAssignmentForm({ id: null, course_id: teacherCourses[0]?.id || '', title: '', instructions: '', due_date: '', attachment_url: '' });
                  setAssignmentModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Create Homework
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* Left Column: List of Homework Outlines & Active Submissions list */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-widest mb-4">Your Assignments</h4>
                  {assignments.filter(a => teacherCourses.some(c => c.id === a.course_id)).length === 0 ? (
                    <div className="glass-panel p-6 rounded-2xl border border-dashed border-border text-center py-8 space-y-2">
                      <FileText className="w-7 h-7 text-muted-foreground/60 mx-auto" />
                      <p className="text-[10px] text-muted-foreground">No assignments yet. Create one to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.filter(a => teacherCourses.some(c => c.id === a.course_id)).map(a => {
                        const course = courses.find(c => c.id === a.course_id) || { title: 'Course' };
                        const subCount = submissions.filter(s => s.assignment_id === a.id).length;
                        return (
                          <div key={a.id} className="glass-panel p-4 rounded-xl border border-border flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className="text-[8px] font-bold uppercase tracking-widest font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{course.title}</span>
                              <h5 className="font-bold text-xs mt-1.5 truncate">{a.title}</h5>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold mt-1">
                                {a.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(a.due_date).toLocaleDateString()}</span>}
                                <span>{subCount} submission{subCount === 1 ? '' : 's'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => openAssignmentEdit(a)}
                                className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Edit assignment"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAssignmentDelete(a.id)}
                                className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400"
                                title="Delete assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-widest mb-4">Cohort Student Deliverables</h4>
                  
                  {submissions.length === 0 ? (
                    <div className="glass-panel p-8 rounded-2xl border border-dashed border-border text-center py-12 space-y-2">
                      <FileText className="w-8 h-8 text-muted-foreground/60 mx-auto animate-pulse" />
                      <h5 className="font-bold text-xs">Grading Board is Clean</h5>
                      <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                        No submissions uploaded yet. Student submissions will appear here for grading.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map(sub => {
                        const ass = assignments.find(a => a.id === sub.assignment_id) || { title: "Homework" };
                        const studentName = leaderboard.find(l => l.student_id === sub.student_id)?.name || "Student";
                        
                        return (
                          <div key={sub.id} className="glass-panel p-4 rounded-xl border border-border flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[8px] font-bold uppercase tracking-widest font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{ass.title}</span>
                              <h5 className="font-bold text-xs mt-1.5 flex items-center gap-1"><User className="w-3.5 h-3.5 text-accent" /> {studentName}</h5>
                              <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 font-mono hover:underline block mt-1.5 truncate max-w-xs sm:max-w-md">{sub.file_url}</a>
                            </div>
                            <div className="text-right shrink-0">
                              {sub.status === 'Reviewed' ? (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase">Graded</span>
                                  <div className="text-xs font-mono font-bold text-primary mt-1">Score: {sub.score}/100</div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedSubmission(sub);
                                    setGradingScore('');
                                  }}
                                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg shadow-md"
                                >
                                  Grade File
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Grading Deck */}
              <div>
                {selectedSubmission ? (
                  <form onSubmit={handleGradeSubmit} className="glass-panel p-5 rounded-2xl border border-border space-y-4 sticky top-24">
                    <h4 className="font-bold text-xs uppercase text-primary tracking-widest border-b border-border pb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-4.5 h-4.5" /> Assessment Scoring Panel
                    </h4>
                    <div className="space-y-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Student solution link</span>
                      <a href={selectedSubmission.file_url} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline block truncate">{selectedSubmission.file_url}</a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Numeric Grade (0 - 100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        placeholder="e.g. 95"
                        value={gradingScore}
                        onChange={(e) => setGradingScore(e.target.value)}
                        className="w-full p-3 bg-white/50 dark:bg-black/20 border border-border rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Feedback</label>
                      <textarea
                        value={gradingFeedback}
                        onChange={(e) => setGradingFeedback(e.target.value)}
                        rows={3}
                        placeholder="Share rubric feedback..."
                        className="w-full p-3 bg-white/50 dark:bg-black/20 border border-border rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isGrading}
                      className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg"
                    >
                      {isGrading ? "Saving Grade..." : "Submit Student Grade"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(null)}
                      className="w-full py-2 bg-transparent text-muted-foreground font-semibold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="glass-panel p-6 rounded-2xl border border-dashed border-border text-center py-10 space-y-2">
                    <GraduationCap className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                    <h5 className="font-bold text-xs">Instructor Grade Deck</h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      Click the "Grade File" button on any pending student homework card to open the evaluation score form.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 5: LIVE VIRTUAL STUDIO ==================== */}
        {activeTab === "live" && (
          <div className="grid lg:grid-cols-4 gap-6 animate-fade-in">
            {/* Live broadcast studio */}
            <div className="lg:col-span-3 space-y-4">
              <div className="glass-panel p-2.5 rounded-2xl border border-border bg-black/95 aspect-video relative overflow-hidden flex flex-col items-center justify-center">
                {/* Blank live studio placeholder */}
                <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <Radio className="w-8 h-8 text-rose-400 animate-pulse" />
                  </div>
                  <h3 className="text-white font-extrabold text-lg">Live Studio Ready</h3>
                  <p className="text-white/50 text-xs max-w-sm leading-relaxed">Schedule a new broadcast session and share the meeting Room ID with your students to begin a live class.</p>
                </div>
                
                <div className="absolute top-4 left-4 bg-rose-600/80 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 border border-rose-500/40">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Instructor Studio
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-white/40 dark:bg-black/20 border border-border rounded-xl">
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-rose-500" /> Live Broadcast Control Panel
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Schedule sessions with a Room ID. Students join using the shared link.</p>
                </div>
                <button
                  onClick={() => {
                    setLiveForm({ id: null, title: '', course_id: teacherCourses[0]?.id || '', instructor: user?.name || '', provider: 'Google Meet', status: 'Upcoming', date: '', meeting_link: '' });
                    setLiveModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Schedule Stream
                </button>
              </div>

              {/* Scheduled live classes list */}
              <div className="space-y-3">
                {liveClasses.filter(lc => teacherCourses.some(c => c.id === lc.course_id)).map(lc => {
                  const c = courses.find(course => course.id === lc.course_id) || { title: "General" };
                  return (
                    <div key={lc.id} className="glass-panel p-4 rounded-xl border border-border flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            lc.status === 'Live' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
                            lc.status === 'Upcoming' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>{lc.status}</span>
                          <span className="text-[8px] font-mono text-muted-foreground">{c.title}</span>
                        </div>
                        <h5 className="font-bold text-xs">{lc.title}</h5>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                          <span>{lc.instructor}</span>
                          <span>{new Date(lc.date || lc.class_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {lc.meeting_link && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold text-accent font-mono bg-accent/10 px-2 py-0.5 rounded border border-accent/20">{lc.provider || 'Custom'}</span>
                            <span className="text-[9px] font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Room ID: {lc.meeting_link}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {lc.meeting_link && (
                          <a href={lc.meeting_link.startsWith('http') ? lc.meeting_link : `#`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[9px] uppercase tracking-wider border border-primary/20 transition-all">
                            Open Room
                          </a>
                        )}
                        <button
                          onClick={() => openLiveEdit(lc)}
                          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit live class"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleLiveDelete(lc.id)}
                          className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400"
                          title="Delete live class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions Feed */}
            <div className="glass-panel rounded-2xl border border-border flex flex-col h-[60vh] justify-between overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-white/50 dark:bg-black/10 shrink-0 font-bold text-xs flex items-center justify-between">
                <span>Student Questions Feed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="flex-grow p-4 overflow-y-auto space-y-3">
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className="p-3 bg-muted rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-[10px] text-primary">
                      <span>{msg.sender_name || 'Student'}</span>
                      <span className="text-[8px] text-muted-foreground font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed font-semibold">{msg.content}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-border bg-white/50 dark:bg-black/10 shrink-0 text-center text-[10px] text-muted-foreground font-semibold">
                Answering questions live on stream.
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: GAMIFIED LEADERBOARD ==================== */}
        {activeTab === "leaderboard" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce shadow-lg" />
              <h3 className="text-2xl font-black text-gradient-purple">Student Cohort Standings</h3>
              <p className="text-xs text-muted-foreground font-semibold">Monitor ranks, levels, and accumulated XP points of your student body.</p>
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
                  const rankIcons = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={student.student_id} className="grid grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-white/5 transition-all">
                      <div className="col-span-2 font-mono font-bold text-sm">
                        {rankIcons[idx] ? rankIcons[idx] : `#${idx + 1}`}
                      </div>
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/10 to-accent/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                          {student.avatar || student.name.charAt(0)}
                        </div>
                        <span className="truncate text-xs font-bold">{student.name}</span>
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

        {/* ==================== TAB 7: INSTRUCTOR PERFORMANCE ANALYTICS ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Curriculum Cohort Performance</h3>
              <p className="text-xs text-muted-foreground mt-1">Examine student enrollment distributions and score averages.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Enrollment chart */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Students Enrolled Per Course
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={enrollmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-white/5" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#1c1c2c', border: '1px solid #28283c', borderRadius: '8px', fontSize: '10px' }}
                      />
                      <Bar dataKey="students" fill="url(#indigoGrad)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#4F46E5" />
                        </linearGradient>
                      </defs>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Performance chart */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent" /> Student Assessment Score Averages
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={quizPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-white/5" />
                      <XAxis dataKey="course" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ background: '#1c1c2c', border: '1px solid #28283c', borderRadius: '8px', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="average" stroke="#EC4899" fill="url(#pinkGrad)" strokeWidth={2} />
                      <defs>
                        <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#EC4899" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 1. Modal Dialog: Create/Edit Course */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCourseModalOpen(false)} />
          
          <div className="relative w-full max-w-lg glass-panel p-6 md:p-8 rounded-2xl border border-border shadow-2xl animate-scale-up">
            <h3 className="font-extrabold text-xl mb-6">
              {courseForm.id ? "Edit Course Meta" : "Create New Learning Course"}
            </h3>

            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="Mastering Interface Glassmorphism..."
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Short Sub-heading / Description</label>
                <textarea
                  placeholder="Write a synopsis of your course contents..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm resize-none text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Programming, Mathematics, Networks"
                  value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Image Thumbnail URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... (blank for default)"
                  value={courseForm.thumbnail}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 font-bold">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs shadow-lg"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal Dialog: Add/Edit Lecture */}
      {lectureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLectureModalOpen(false)} />
          
          <div className="relative w-full max-w-3xl glass-panel p-6 md:p-8 rounded-2xl border border-border shadow-2xl animate-scale-up h-[90vh] flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-xl mb-4">
                {lectureForm.id ? "Edit Curriculum Lecture" : "Draft Course Lecture Notes"}
              </h3>
            </div>

            <form onSubmit={handleLectureSubmit} className="flex-grow space-y-4 overflow-y-auto pr-2 py-2 text-foreground">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Lecture Title</label>
                <input
                  type="text"
                  required
                  placeholder="Designing premium backing layers..."
                  value={lectureForm.title}
                  onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Lecture Synopsis / Description</label>
                <textarea
                  placeholder="Provide a concise description of the lecture goals..."
                  value={lectureForm.description}
                  onChange={(e) => setLectureForm({ ...lectureForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm resize-none text-foreground"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">YouTube Video URL</label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={lectureForm.youtube_video_url}
                    onChange={(e) => setLectureForm({ ...lectureForm, youtube_video_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Voice Note Audio URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceNoteFileUpload}
                        className="hidden"
                        id="voice-file-upload"
                      />
                      <label
                        htmlFor="voice-file-upload"
                        className="cursor-pointer px-3 py-1 text-[10px] font-bold bg-secondary hover:bg-muted border border-border rounded-lg text-foreground flex items-center gap-1 transition-all"
                      >
                        Upload Audio (.mp3)
                      </label>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. mp3 file link or base64 data"
                    value={lectureForm.voice_note_url}
                    onChange={(e) => setLectureForm({ ...lectureForm, voice_note_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Lecture Notes (Markdown Supported)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-semibold">Or upload .txt/.md:</span>
                    <input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleNotesFileUpload}
                      className="hidden"
                      id="notes-file-upload"
                    />
                    <label
                      htmlFor="notes-file-upload"
                      className="cursor-pointer px-3 py-1 text-[10px] font-bold bg-secondary hover:bg-muted border border-border rounded-lg text-foreground flex items-center gap-1 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" /> Upload File
                    </label>
                  </div>
                </div>
                <textarea
                  required
                  placeholder="Write clear, informative, styled notes here..."
                  value={lectureForm.notes}
                  onChange={(e) => setLectureForm({ ...lectureForm, notes: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm resize-y font-mono text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">AI Summary (Pre-generated / Editable)</label>
                <textarea
                  placeholder="Write or review AI summary points here..."
                  value={lectureForm.ai_summary}
                  onChange={(e) => setLectureForm({ ...lectureForm, ai_summary: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm resize-none text-foreground font-sans"
                />
              </div>
            </form>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4 shrink-0 font-bold">
              <button
                type="button"
                onClick={() => setLectureModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-border text-xs hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLectureSubmit}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs shadow-lg"
              >
                Save Lecture Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal Dialog: Create/Edit Assignment */}
      {assignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAssignmentModalOpen(false)} />
          
          <div className="relative w-full max-w-lg glass-panel p-6 md:p-8 rounded-2xl border border-border shadow-2xl animate-scale-up">
            <h3 className="font-extrabold text-xl mb-6">{assignmentForm.id ? 'Edit Assignment' : 'Create Assignment'}</h3>

            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Select Course Outlines</label>
                <select
                  required
                  value={assignmentForm.course_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, course_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                >
                  <option value="" disabled>Choose active course...</option>
                  {teacherCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Homework Title</label>
                <input
                  type="text"
                  required
                  placeholder="UI Design: Implementing glassmorphic panels..."
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Instructions / Tasks</label>
                <textarea
                  required
                  placeholder="Explain exactly what figma links or React code assets students must submit..."
                  value={assignmentForm.instructions}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm resize-none text-foreground"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={assignmentForm.due_date}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Syllabus PDF / Ref attachment Link</label>
                  <input
                    type="url"
                    placeholder="https://example.com/guide.pdf"
                    value={assignmentForm.attachment_url}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, attachment_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 font-bold">
                <button
                  type="button"
                  onClick={() => setAssignmentModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs shadow-lg"
                >
                  {assignmentForm.id ? 'Update Assignment' : 'Deploy Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal Dialog: Schedule Live Broadcast */}
      {liveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLiveModalOpen(false)} />
          
          <div className="relative w-full max-w-lg glass-panel p-6 md:p-8 rounded-2xl border border-border shadow-2xl animate-scale-up">
            <h3 className="font-extrabold text-xl mb-6">{liveForm.id ? 'Edit Live Class' : 'Schedule Live Class'}</h3>

            <form onSubmit={handleLiveSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Select Course</label>
                <select
                  required
                  value={liveForm.course_id}
                  onChange={(e) => setLiveForm({ ...liveForm, course_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                >
                  <option value="" disabled>Choose course...</option>
                  {teacherCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Broadcast Stream Title</label>
                <input
                  type="text"
                  required
                  placeholder="Interactive Q&A: Advanced React Refactoring..."
                  value={liveForm.title}
                  onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Broadcaster Instructor Name</label>
                <input
                  type="text"
                  required
                  value={liveForm.instructor}
                  onChange={(e) => setLiveForm({ ...liveForm, instructor: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Meeting Provider</label>
                <select
                  value={liveForm.provider}
                  onChange={(e) => setLiveForm({ ...liveForm, provider: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Teams">Microsoft Teams</option>
                  <option value="Custom">Custom URL</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Broadcast Schedule Time</label>
                <input
                  type="datetime-local"
                  required
                  value={liveForm.date}
                  onChange={(e) => setLiveForm({ ...liveForm, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Meeting Room ID / Link</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. abc-defg-hij or https://meet.google.com/..."
                  value={liveForm.meeting_link}
                  onChange={(e) => setLiveForm({ ...liveForm, meeting_link: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-sm text-foreground"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">Share this Room ID with students so they can join the live session.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 font-bold">
                <button
                  type="button"
                  onClick={() => setLiveModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs shadow-lg"
                >
                  {liveForm.id ? 'Update Class' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Modal Dialog: Review & Edit AI Generated Quiz */}
      {quizEditorOpen && editingQuizLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 select-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQuizEditorOpen(false)} />
          
          <div className="relative w-full max-w-3xl glass-panel p-6 md:p-8 rounded-2xl border border-border shadow-2xl animate-scale-up h-[90vh] flex flex-col justify-between select-text">
            <div className="border-b border-border pb-3 mb-4 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-primary font-bold">Interactive Curriculum Assessor</span>
                <h3 className="font-extrabold text-lg md:text-xl">Review & Edit Lecture Quiz: {editingQuizLecture.title}</h3>
              </div>
              <span className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1 font-mono text-xs font-black">{quizQuestions.length} Questions</span>
            </div>

            <div className="flex-grow space-y-6 overflow-y-auto pr-2 py-2 text-foreground">
              {quizQuestions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs font-mono">No questions drafted. Click below to add.</div>
              ) : (
                quizQuestions.map((q, qIdx) => {
                  const correctLetter = String.fromCharCode(65 + Math.max(0, q.options.indexOf(q.answer)));
                  return (
                    <div key={qIdx} className="p-4 md:p-5 rounded-2xl border border-border bg-white/20 dark:bg-card/30 relative space-y-4 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleRemoveQuizQuestion(qIdx)}
                        className="absolute top-4 right-4 text-rose-500 hover:text-rose-600 p-1.5 rounded-lg border border-rose-500/10 hover:bg-rose-500/10"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="space-y-1.5 max-w-[90%]">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Question {qIdx + 1}</label>
                        <textarea
                          required
                          value={q.question}
                          onChange={(e) => handleQuizQuestionChange(qIdx, "question", e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-xs text-foreground font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((option, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div key={optIdx} className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Option {letter}</span>
                              <input
                                type="text"
                                required
                                value={option}
                                onChange={(e) => handleQuizOptionChange(qIdx, optIdx, e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-xs text-foreground"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/50">
                        <div className="space-y-1 sm:col-span-1">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Correct Option</label>
                          <select
                            value={correctLetter}
                            onChange={(e) => handleQuizCorrectAnswerChange(qIdx, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-xs text-foreground"
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Explanation</label>
                          <input
                            type="text"
                            required
                            value={q.explanation || ""}
                            onChange={(e) => handleQuizQuestionChange(qIdx, "explanation", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary outline-none text-xs text-foreground"
                            placeholder="Why is this option correct?"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleAddQuizQuestion}
                  className="px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs flex items-center justify-center gap-1.5 mx-auto transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Question Card
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4 shrink-0 font-bold">
              <button
                type="button"
                onClick={() => {
                  setQuizEditorOpen(false);
                  setQuizQuestions([]);
                  setEditingQuizLecture(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-border text-xs hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishQuiz}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-xs shadow-lg"
              >
                Publish MCQ Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      <AIChatbot />
    </DashboardLayout>
  );
};
