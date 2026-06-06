import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

const XP_PER_LECTURE = 100;
const XP_PER_ASSIGNMENT = 150;
const XP_PER_LEVEL = 400;

const mapLeaderboard = (rows = []) =>
  rows.map((u) => ({
    student_id: u.id,
    name: u.name,
    xp: u.xp || 0,
    level: u.level || 1,
    avatar: (u.name || '?').charAt(0)
  }));

export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [lectureProgress, setLectureProgress] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Theme preference (UI-only, stored locally)
  const [theme, setTheme] = useState(() => localStorage.getItem('learnguru_theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('learnguru_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const refreshLeaderboard = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name, xp, level')
      .order('xp', { ascending: false });
    setLeaderboard(mapLeaderboard(data || []));
  };

  const awardXP = async (studentId, amount) => {
    if (!amount) return;
    const { data: userRecord } = await supabase
      .from('users')
      .select('xp')
      .eq('id', studentId)
      .single();
    if (!userRecord) return;
    const updatedXP = (userRecord.xp || 0) + amount;
    const updatedLevel = Math.floor(updatedXP / XP_PER_LEVEL) + 1;
    await supabase.from('users').update({ xp: updatedXP, level: updatedLevel }).eq('id', studentId);
    await refreshLeaderboard();
  };

  // Load all data once a user is authenticated
  useEffect(() => {
    const loadAllData = async () => {
      if (!user) {
        setCourses([]); setLectures([]); setQuizzes([]); setLectureProgress([]);
        setQuizAttempts([]); setAssignments([]); setSubmissions([]); setLeaderboard([]);
        setLiveClasses([]); setEnrollments([]); setMessages([]); setAttendance([]);
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const isStudent = user.role === 'student';

        const [
          coursesRes, lecturesRes, quizzesRes, assignmentsRes,
          liveRes, enrollRes, messagesRes, attendanceRes
        ] = await Promise.all([
          supabase.from('courses').select('*').order('created_at', { ascending: false }),
          supabase.from('lectures').select('*').order('order_index', { ascending: true }),
          supabase.from('quizzes').select('*'),
          supabase.from('assignments').select('*').order('created_at', { ascending: false }),
          supabase.from('live_classes').select('*').order('class_date', { ascending: true }),
          supabase.from('enrollments').select('*'),
          supabase.from('messages').select('*').order('created_at', { ascending: true }),
          supabase.from('attendance').select('*')
        ]);

        setCourses(coursesRes.data || []);
        setLectures(lecturesRes.data || []);
        setQuizzes(quizzesRes.data || []);
        setAssignments(assignmentsRes.data || []);
        setLiveClasses(liveRes.data || []);
        setEnrollments(enrollRes.data || []);
        setMessages(messagesRes.data || []);
        setAttendance(attendanceRes.data || []);

        // Progress & submissions: students see their own, staff see all
        const progressQuery = supabase.from('lecture_progress').select('*');
        const submissionsQuery = supabase.from('submissions').select('*');
        const attemptsQuery = supabase.from('quiz_attempts').select('*').order('created_at', { ascending: true });
        if (isStudent) {
          progressQuery.eq('student_id', user.id);
          submissionsQuery.eq('student_id', user.id);
          attemptsQuery.eq('student_id', user.id);
        }
        const [progressRes, submissionsRes, attemptsRes] = await Promise.all([
          progressQuery, submissionsQuery, attemptsQuery
        ]);
        setLectureProgress(progressRes.data || []);
        setSubmissions(submissionsRes.data || []);
        setQuizAttempts(attemptsRes.data || []);

        await refreshLeaderboard();
      } catch (err) {
        console.error('Learn Guru data sync error:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadAllData();
  }, [user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('learnguru_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
        if (payload.eventType === 'INSERT') setCourses((p) => [payload.new, ...p.filter((c) => c.id !== payload.new.id)]);
        else if (payload.eventType === 'UPDATE') setCourses((p) => p.map((c) => (c.id === payload.new.id ? payload.new : c)));
        else if (payload.eventType === 'DELETE') setCourses((p) => p.filter((c) => c.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures' }, (payload) => {
        if (payload.eventType === 'INSERT') setLectures((p) => [...p.filter((l) => l.id !== payload.new.id), payload.new].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        else if (payload.eventType === 'UPDATE') setLectures((p) => p.map((l) => (l.id === payload.new.id ? payload.new : l)).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        else if (payload.eventType === 'DELETE') setLectures((p) => p.filter((l) => l.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, (payload) => {
        if (payload.eventType === 'INSERT') setQuizzes((p) => [...p.filter((q) => q.id !== payload.new.id), payload.new]);
        else if (payload.eventType === 'UPDATE') setQuizzes((p) => p.map((q) => (q.id === payload.new.id ? payload.new : q)));
        else if (payload.eventType === 'DELETE') setQuizzes((p) => p.filter((q) => q.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lecture_progress' }, (payload) => {
        if (payload.eventType === 'INSERT') setLectureProgress((p) => [...p.filter((x) => x.id !== payload.new.id), payload.new]);
        else if (payload.eventType === 'UPDATE') setLectureProgress((p) => p.map((x) => (x.id === payload.new.id ? payload.new : x)));
        else if (payload.eventType === 'DELETE') setLectureProgress((p) => p.filter((x) => x.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, (payload) => {
        if (payload.eventType === 'INSERT') setQuizAttempts((p) => [...p.filter((x) => x.id !== payload.new.id), payload.new]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
        if (payload.eventType === 'INSERT') setAssignments((p) => [payload.new, ...p.filter((a) => a.id !== payload.new.id)]);
        else if (payload.eventType === 'UPDATE') setAssignments((p) => p.map((a) => (a.id === payload.new.id ? payload.new : a)));
        else if (payload.eventType === 'DELETE') setAssignments((p) => p.filter((a) => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
        if (payload.eventType === 'INSERT') setSubmissions((p) => [payload.new, ...p.filter((s) => s.id !== payload.new.id)]);
        else if (payload.eventType === 'UPDATE') setSubmissions((p) => p.map((s) => (s.id === payload.new.id ? payload.new : s)));
        else if (payload.eventType === 'DELETE') setSubmissions((p) => p.filter((s) => s.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, (payload) => {
        if (payload.eventType === 'INSERT') setLiveClasses((p) => [...p.filter((l) => l.id !== payload.new.id), payload.new].sort((a, b) => new Date(a.class_date) - new Date(b.class_date)));
        else if (payload.eventType === 'UPDATE') setLiveClasses((p) => p.map((l) => (l.id === payload.new.id ? payload.new : l)).sort((a, b) => new Date(a.class_date) - new Date(b.class_date)));
        else if (payload.eventType === 'DELETE') setLiveClasses((p) => p.filter((l) => l.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, (payload) => {
        if (payload.eventType === 'INSERT') setEnrollments((p) => [...p.filter((e) => e.id !== payload.new.id), payload.new]);
        else if (payload.eventType === 'DELETE') setEnrollments((p) => p.filter((e) => e.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
        if (payload.eventType === 'INSERT') setAttendance((p) => [...p.filter((a) => a.id !== payload.new.id), payload.new]);
        else if (payload.eventType === 'UPDATE') setAttendance((p) => p.map((a) => (a.id === payload.new.id ? payload.new : a)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages((p) => [...p.filter((m) => m.id !== payload.new.id), payload.new].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setLeaderboard((prev) => prev
            .map((u) => (u.student_id === payload.new.id ? { ...u, name: payload.new.name, xp: payload.new.xp || 0, level: payload.new.level || 1 } : u))
            .sort((a, b) => b.xp - a.xp));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ---- COURSE CRUD ----
  const saveCourse = async (courseData) => {
    try {
      const payload = {
        teacher_id: user.id,
        title: courseData.title,
        description: courseData.description,
        category: courseData.category || 'General',
        thumbnail: courseData.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'
      };
      if (courseData.id) {
        const { error } = await supabase.from('courses').update(payload).eq('id', courseData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert([payload]);
        if (error) throw error;
      }
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      setCourses(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteCourse = async (id) => {
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      setCourses((p) => p.filter((c) => c.id !== id));
      setLectures((p) => p.filter((l) => l.course_id !== id));
      setAssignments((p) => p.filter((a) => a.course_id !== id));
      setEnrollments((p) => p.filter((e) => e.course_id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- LECTURE CRUD ----
  const saveLecture = async (lectureData) => {
    try {
      const payload = {
        course_id: lectureData.course_id,
        title: lectureData.title,
        description: lectureData.description || '',
        youtube_video_url: lectureData.youtube_video_url || '',
        notes: lectureData.notes || '',
        voice_note_url: lectureData.voice_note_url || '',
        ai_summary: lectureData.ai_summary || '',
        order_index: Number(lectureData.order_index) || (lectures.filter((l) => l.course_id === lectureData.course_id).length + 1)
      };
      let dbSaved;
      if (lectureData.id) {
        const { data, error } = await supabase.from('lectures').update(payload).eq('id', lectureData.id).select().single();
        if (error) throw error;
        dbSaved = data;
      } else {
        const { data, error } = await supabase.from('lectures').insert([payload]).select().single();
        if (error) throw error;
        dbSaved = data;
      }
      const { data: updated } = await supabase.from('lectures').select('*').order('order_index', { ascending: true });
      setLectures(updated || []);
      return { success: true, data: dbSaved };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const reorderLectures = async (courseId, lectureId, direction) => {
    try {
      const courseLectures = lectures
        .filter((l) => l.course_id === courseId)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const currentIndex = courseLectures.findIndex((l) => l.id === lectureId);
      if (currentIndex === -1) return { success: false, error: 'Lecture not found' };

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= courseLectures.length) {
        return { success: false, error: 'Cannot move in this direction' };
      }

      const current = courseLectures[currentIndex];
      const target = courseLectures[targetIndex];

      const { error: e1 } = await supabase.from('lectures').update({ order_index: target.order_index }).eq('id', current.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('lectures').update({ order_index: current.order_index }).eq('id', target.id);
      if (e2) throw e2;

      const { data: updated } = await supabase.from('lectures').select('*').order('order_index', { ascending: true });
      setLectures(updated || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteLecture = async (id) => {
    try {
      const { error } = await supabase.from('lectures').delete().eq('id', id);
      if (error) throw error;
      setLectures((p) => p.filter((l) => l.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- QUIZ SAVE ----
  const saveQuiz = async (quizData) => {
    try {
      const unlockRequired = quizData.unlock_required !== undefined ? quizData.unlock_required : true;
      const existing = quizzes.find((q) => q.lecture_id === quizData.lecture_id);
      if (existing) {
        const { error } = await supabase
          .from('quizzes')
          .update({ questions_json: quizData.questions_json, unlock_required: unlockRequired })
          .eq('lecture_id', quizData.lecture_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('quizzes')
          .insert([{ lecture_id: quizData.lecture_id, questions_json: quizData.questions_json, unlock_required: unlockRequired }]);
        if (error) throw error;
      }
      const { data } = await supabase.from('quizzes').select('*');
      setQuizzes(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteQuiz = async (lectureId) => {
    try {
      const { error } = await supabase.from('quizzes').delete().eq('lecture_id', lectureId);
      if (error) throw error;
      setQuizzes((p) => p.filter((q) => q.lecture_id !== lectureId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- PROGRESS UPDATE (+XP) ----
  const updateLectureProgress = async (lectureId, completed, score = null) => {
    try {
      const studentId = user.id;
      const existing = lectureProgress.find((p) => p.lecture_id === lectureId && p.student_id === studentId);
      const completedFresh = completed && (!existing || !existing.completed);
      const scoreImproved = score !== null && (!existing || existing.score === null || score > existing.score);

      if (existing) {
        const { error } = await supabase
          .from('lecture_progress')
          .update({
            completed,
            score: score !== null ? Math.max(score, existing.score ?? 0) : existing.score,
            completed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lecture_progress')
          .insert([{ student_id: studentId, lecture_id: lectureId, completed, score }]);
        if (error) throw error;
      }

      if (completedFresh || scoreImproved) {
        let extraXP = 0;
        if (completedFresh) extraXP += XP_PER_LECTURE;
        if (scoreImproved) extraXP += Math.round((score || 0) * 1.5);
        await awardXP(studentId, extraXP);
      }

      const { data } = await supabase.from('lecture_progress').select('*').eq('student_id', studentId);
      setLectureProgress(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- QUIZ ATTEMPTS (score history) ----
  const recordQuizAttempt = async (quizId, lectureId, score, total) => {
    try {
      const studentId = user.id;
      const { error } = await supabase.from('quiz_attempts').insert([{
        quiz_id: quizId,
        lecture_id: lectureId,
        student_id: studentId,
        score,
        total_questions: total
      }]);
      if (error) throw error;
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });
      setQuizAttempts(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- ASSIGNMENTS CRUD ----
  const saveAssignment = async (assignmentData) => {
    try {
      const payload = {
        course_id: assignmentData.course_id,
        title: assignmentData.title,
        instructions: assignmentData.instructions,
        due_date: assignmentData.due_date,
        attachment_url: assignmentData.attachment_url || ''
      };
      if (assignmentData.id) {
        const { error } = await supabase.from('assignments').update(payload).eq('id', assignmentData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('assignments').insert([payload]);
        if (error) throw error;
      }
      const { data } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
      setAssignments(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteAssignment = async (id) => {
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
      setAssignments((p) => p.filter((a) => a.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- SUBMISSIONS & GRADING ----
  const saveSubmission = async (submissionData) => {
    try {
      const studentId = user.id;
      const existing = submissions.find(
        (s) => s.assignment_id === submissionData.assignment_id && s.student_id === studentId
      );
      if (existing) {
        const { error } = await supabase
          .from('submissions')
          .update({ file_url: submissionData.file_url, status: 'Submitted' })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('submissions').insert([{
          assignment_id: submissionData.assignment_id,
          student_id: studentId,
          file_url: submissionData.file_url,
          status: 'Submitted'
        }]);
        if (error) throw error;
        await awardXP(studentId, XP_PER_ASSIGNMENT);
      }
      const { data } = await supabase.from('submissions').select('*').eq('student_id', studentId);
      setSubmissions(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const gradeSubmission = async (submissionId, gradeData) => {
    try {
      const parsedScore = Number(typeof gradeData === 'number' ? gradeData : gradeData.score);
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'Reviewed',
          feedback: typeof gradeData === 'number' ? '' : (gradeData.feedback || ''),
          score: parsedScore
        })
        .eq('id', submissionId);
      if (error) throw error;
      const { data } = await supabase.from('submissions').select('*');
      setSubmissions(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- LIVE CLASS CRUD ----
  const scheduleLiveClass = async (liveData) => {
    try {
      const payload = {
        course_id: liveData.course_id,
        title: liveData.title,
        instructor: liveData.instructor || user.name,
        provider: liveData.provider || 'Custom',
        meeting_link: liveData.meeting_link || liveData.stream_url || '',
        class_date: liveData.class_date || liveData.date || new Date().toISOString(),
        status: liveData.status || 'Upcoming'
      };
      if (liveData.id) {
        const { error } = await supabase.from('live_classes').update(payload).eq('id', liveData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('live_classes').insert([payload]);
        if (error) throw error;
      }
      const { data } = await supabase.from('live_classes').select('*').order('class_date', { ascending: true });
      setLiveClasses(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteLiveClass = async (id) => {
    try {
      const { error } = await supabase.from('live_classes').delete().eq('id', id);
      if (error) throw error;
      setLiveClasses((p) => p.filter((l) => l.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- ENROLLMENT ----
  const enrollInCourse = async (courseId) => {
    try {
      const studentId = user.id;
      const { error } = await supabase.from('enrollments').insert([{ course_id: courseId, student_id: studentId }]);
      if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error;
      const { data } = await supabase.from('enrollments').select('*');
      setEnrollments(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- COURSE MESSAGES ----
  const sendCourseMessage = async (messageData) => {
    try {
      const payload = {
        course_id: messageData.course_id,
        sender_id: user.id,
        sender_name: user.name || 'User',
        sender_role: user.role || 'student',
        content: messageData.content
      };
      const { error } = await supabase.from('messages').insert([payload]);
      if (error) throw error;
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      setMessages(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- ATTENDANCE ----
  const markLiveAttendance = async (liveClassId, studentId = user?.id, status = 'present') => {
    try {
      if (!studentId) return { success: false, error: 'Missing student' };
      const existing = attendance.find((a) => a.live_class_id === liveClassId && a.student_id === studentId);
      if (existing) {
        const { error } = await supabase.from('attendance').update({ status }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance').insert([{ live_class_id: liveClassId, student_id: studentId, status }]);
        if (error) throw error;
      }
      const { data } = await supabase.from('attendance').select('*');
      setAttendance(data || []);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AppContext.Provider value={{
      courses,
      lectures,
      quizzes,
      progress: lectureProgress,
      quizAttempts,
      assignments,
      submissions,
      leaderboard,
      liveClasses,
      enrollments,
      messages,
      attendance,
      loadingData,
      theme,
      toggleTheme,
      saveCourse,
      deleteCourse,
      saveLecture,
      deleteLecture,
      reorderLectures,
      saveQuiz,
      deleteQuiz,
      updateProgress: updateLectureProgress,
      recordQuizAttempt,
      saveSubmission,
      gradeSubmission,
      saveAssignment,
      deleteAssignment,
      scheduleLiveClass,
      saveLiveClass: scheduleLiveClass,
      deleteLiveClass,
      enrollInCourse,
      sendCourseMessage,
      markLiveAttendance
    }}>
      {children}
    </AppContext.Provider>
  );
};
