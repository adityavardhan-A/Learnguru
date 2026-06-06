-- =========================================================================
-- Learn Guru — Supabase PostgreSQL Schema
-- Run this entire script in the Supabase SQL Editor.
-- Safe to re-run: tables use IF NOT EXISTS, policies are dropped first,
-- and the seed section is idempotent.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- TABLES
-- =========================================================================

-- 1. USERS (profile mirror of auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. COURSES
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  thumbnail TEXT DEFAULT 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

-- 4. LECTURES
CREATE TABLE IF NOT EXISTS public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  youtube_video_url TEXT,
  voice_note_url TEXT,
  ai_summary TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. LECTURE PROGRESS
CREATE TABLE IF NOT EXISTS public.lecture_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, lecture_id)
);

-- 6. QUIZZES (one per lecture)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL UNIQUE REFERENCES public.lectures(id) ON DELETE CASCADE,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlock_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. QUIZ ATTEMPTS (score history)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Pending', 'Submitted', 'Reviewed')),
  score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

-- 10. LIVE CLASSES
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructor TEXT NOT NULL,
  provider TEXT DEFAULT 'Custom',
  meeting_link TEXT,
  class_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Scheduled', 'Live', 'Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (live_class_id, student_id)
);

-- 12. MESSAGES (course discussion chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'teacher', 'student')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. CHAT HISTORY (Gemini AI tutor)
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. LEADERBOARD (live view over users, ranked by XP)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  id AS student_id,
  name,
  xp,
  level,
  RANK() OVER (ORDER BY xp DESC) AS rank
FROM public.users
WHERE role = 'student';

-- =========================================================================
-- INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_courses_teacher        ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lectures_course        ON public.lectures(course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_order         ON public.lectures(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enrollments_student    ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course     ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_student       ON public.lecture_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lecture       ON public.lecture_progress(lecture_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lecture        ON public.quizzes(lecture_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student       ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz          ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course     ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student    ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_live_course            ON public.live_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class       ON public.attendance(live_class_id);
CREATE INDEX IF NOT EXISTS idx_messages_course        ON public.messages(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_user              ON public.chat_history(user_id);

-- =========================================================================
-- TRIGGERS
-- =========================================================================

-- Auto-create a public.users row when a new auth user signs up.
-- Teachers start unapproved and must be approved by an admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
BEGIN
  INSERT INTO public.users (id, name, email, role, approved, xp, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    v_role,
    v_role <> 'teacher',
    0,
    1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history     ENABLE ROW LEVEL SECURITY;

-- USERS
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users FOR UPDATE USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS users_delete_admin ON public.users;
CREATE POLICY users_delete_admin ON public.users FOR DELETE USING (public.is_admin());

-- COURSES
DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS courses_insert ON public.courses;
CREATE POLICY courses_insert ON public.courses FOR INSERT WITH CHECK (
  auth.uid() = teacher_id AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher' AND approved = true
  )
);
DROP POLICY IF EXISTS courses_update ON public.courses;
CREATE POLICY courses_update ON public.courses FOR UPDATE USING (auth.uid() = teacher_id OR public.is_admin());
DROP POLICY IF EXISTS courses_delete ON public.courses;
CREATE POLICY courses_delete ON public.courses FOR DELETE USING (auth.uid() = teacher_id OR public.is_admin());

-- ENROLLMENTS
DROP POLICY IF EXISTS enroll_select ON public.enrollments;
CREATE POLICY enroll_select ON public.enrollments FOR SELECT USING (
  auth.uid() = student_id OR public.is_admin()
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = enrollments.course_id AND c.teacher_id = auth.uid())
);
DROP POLICY IF EXISTS enroll_insert ON public.enrollments;
CREATE POLICY enroll_insert ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS enroll_delete ON public.enrollments;
CREATE POLICY enroll_delete ON public.enrollments FOR DELETE USING (auth.uid() = student_id OR public.is_admin());

-- LECTURES
DROP POLICY IF EXISTS lectures_select ON public.lectures;
CREATE POLICY lectures_select ON public.lectures FOR SELECT USING (true);
DROP POLICY IF EXISTS lectures_manage ON public.lectures;
CREATE POLICY lectures_manage ON public.lectures FOR ALL USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = lectures.course_id AND c.teacher_id = auth.uid()
  )
);

-- LECTURE PROGRESS
DROP POLICY IF EXISTS progress_owner ON public.lecture_progress;
CREATE POLICY progress_owner ON public.lecture_progress FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS progress_staff_read ON public.lecture_progress;
CREATE POLICY progress_staff_read ON public.lecture_progress FOR SELECT USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
);

-- QUIZZES
DROP POLICY IF EXISTS quizzes_select ON public.quizzes;
CREATE POLICY quizzes_select ON public.quizzes FOR SELECT USING (true);
DROP POLICY IF EXISTS quizzes_manage ON public.quizzes;
CREATE POLICY quizzes_manage ON public.quizzes FOR ALL USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.lectures l JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = quizzes.lecture_id AND c.teacher_id = auth.uid()
  )
);

-- QUIZ ATTEMPTS
DROP POLICY IF EXISTS attempts_owner ON public.quiz_attempts;
CREATE POLICY attempts_owner ON public.quiz_attempts FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS attempts_staff_read ON public.quiz_attempts;
CREATE POLICY attempts_staff_read ON public.quiz_attempts FOR SELECT USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
);

-- ASSIGNMENTS
DROP POLICY IF EXISTS assignments_select ON public.assignments;
CREATE POLICY assignments_select ON public.assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS assignments_manage ON public.assignments;
CREATE POLICY assignments_manage ON public.assignments FOR ALL USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()
  )
);

-- SUBMISSIONS
DROP POLICY IF EXISTS submissions_owner ON public.submissions;
CREATE POLICY submissions_owner ON public.submissions FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS submissions_staff_read ON public.submissions;
CREATE POLICY submissions_staff_read ON public.submissions FOR SELECT USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
);
DROP POLICY IF EXISTS submissions_staff_grade ON public.submissions;
CREATE POLICY submissions_staff_grade ON public.submissions FOR UPDATE USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
);

-- LIVE CLASSES
DROP POLICY IF EXISTS live_select ON public.live_classes;
CREATE POLICY live_select ON public.live_classes FOR SELECT USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = live_classes.course_id AND c.teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = live_classes.course_id AND e.student_id = auth.uid())
);
DROP POLICY IF EXISTS live_manage ON public.live_classes;
CREATE POLICY live_manage ON public.live_classes FOR ALL USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = live_classes.course_id AND c.teacher_id = auth.uid()
  )
);

-- ATTENDANCE
DROP POLICY IF EXISTS attendance_owner ON public.attendance;
CREATE POLICY attendance_owner ON public.attendance FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS attendance_staff_read ON public.attendance;
CREATE POLICY attendance_staff_read ON public.attendance FOR SELECT USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
);

-- MESSAGES
DROP POLICY IF EXISTS messages_read ON public.messages;
CREATE POLICY messages_read ON public.messages FOR SELECT USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = messages.course_id AND c.teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = messages.course_id AND e.student_id = auth.uid())
);
DROP POLICY IF EXISTS messages_send ON public.messages;
CREATE POLICY messages_send ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = messages.course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = messages.course_id AND e.student_id = auth.uid())
  )
);

-- CHAT HISTORY (private to each user)
DROP POLICY IF EXISTS chat_owner ON public.chat_history;
CREATE POLICY chat_owner ON public.chat_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- REALTIME PUBLICATION
-- =========================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'courses','lectures','quizzes','lecture_progress','quiz_attempts',
    'assignments','submissions','live_classes','enrollments','attendance','messages','users'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- already in publication
    END;
  END LOOP;
END $$;

-- =========================================================================
-- SEED DATA — 10 engineering courses, each with 10 lectures.
-- Idempotent. Requires at least one teacher to exist (sign up a teacher
-- and approve them, then re-run this section). Video and voice URLs are
-- intentionally left empty.
-- =========================================================================
DO $$
DECLARE
  v_teacher UUID;
  v_course  UUID;
  rec       RECORD;
  i         INT;
BEGIN
  SELECT id INTO v_teacher FROM public.users WHERE role = 'teacher' ORDER BY created_at LIMIT 1;
  IF v_teacher IS NULL THEN
    SELECT id INTO v_teacher FROM public.users ORDER BY created_at LIMIT 1;
  END IF;
  IF v_teacher IS NULL THEN
    RAISE NOTICE 'Seed skipped: no users yet. Create a teacher account, then re-run the seed section.';
    RETURN;
  END IF;

  FOR rec IN
    SELECT * FROM (VALUES
      ('Introduction to Engineering Mathematics', 'Calculus, linear algebra, and differential equations that underpin all engineering disciplines.', 'Mathematics', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80'),
      ('Programming Fundamentals with Python', 'Core programming concepts, control flow, data types, and problem solving using Python.', 'Programming', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80'),
      ('Engineering Graphics and Design', 'Technical drawing, orthographic projection, and CAD fundamentals for design communication.', 'Design', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80'),
      ('Data Structures and Algorithms', 'Arrays, linked lists, trees, graphs, sorting, searching, and complexity analysis.', 'Computer Science', 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80'),
      ('Digital Logic Design', 'Boolean algebra, logic gates, combinational and sequential circuits, and FSMs.', 'Electronics', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'),
      ('Object-Oriented Programming using Java', 'Classes, objects, inheritance, polymorphism, and design principles in Java.', 'Programming', 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=800&q=80'),
      ('Database Management Systems', 'Relational modelling, SQL, normalization, transactions, and indexing.', 'Computer Science', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80'),
      ('Computer Networks', 'OSI and TCP/IP models, routing, switching, and core network protocols.', 'Networking', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'),
      ('Operating Systems', 'Processes, threads, scheduling, memory management, and file systems.', 'Computer Science', 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80'),
      ('Software Engineering and Project Management', 'SDLC, agile methodologies, requirements, testing, and project planning.', 'Software Engineering', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80')
    ) AS c(title, description, category, thumbnail)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE title = rec.title) THEN
      INSERT INTO public.courses (teacher_id, title, description, category, thumbnail)
      VALUES (v_teacher, rec.title, rec.description, rec.category, rec.thumbnail)
      RETURNING id INTO v_course;

      FOR i IN 1..10 LOOP
        INSERT INTO public.lectures
          (course_id, title, description, notes, youtube_video_url, voice_note_url, ai_summary, order_index)
        VALUES (
          v_course,
          'Lecture ' || i || ': ' || rec.title,
          'Module ' || i || ' of ' || rec.title || '.',
          '',  -- notes (teacher fills in)
          '',  -- youtube_video_url (empty by default)
          '',  -- voice_note_url (empty by default)
          '',  -- ai_summary (generated later via Gemini)
          i
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;
