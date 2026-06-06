import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pages
import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { TeacherDashboard } from '../pages/TeacherDashboard';
import { StudentDashboard } from '../pages/StudentDashboard';
import { CourseViewer } from '../pages/CourseViewer';
import { AdminDashboard } from '../pages/AdminDashboard';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Role-Based Route Guard
const RoleRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (!allowed.includes(user.role)) {
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/student" replace />;
  }
  return children;
};

// Elegant Animated Loading Screen
export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background bg-mesh flex flex-col items-center justify-center z-50">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full border-t-2 border-r-2 border-primary animate-spin"></div>
        <div className="absolute w-20 h-20 rounded-full border-b-2 border-l-2 border-accent animate-spin" style={{ animationDirection: 'reverse' }}></div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent animate-pulse-slow"></div>
      </div>
      <h3 className="mt-8 font-bold text-lg text-foreground tracking-wider animate-pulse">
        LEARN GURU
      </h3>
      <p className="text-xs text-muted-foreground mt-2 font-mono">Initializing Learning Core...</p>
    </div>
  );
};

// Mini redirect component to dispatch role routes
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/student" replace />;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dynamic Redirect Dashboard Route */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        } />

        {/* Teacher Routes */}
        <Route path="/teacher" element={
          <RoleRoute allowedRole="teacher">
            <TeacherDashboard />
          </RoleRoute>
        } />

        {/* Student Routes */}
        <Route path="/student" element={
          <RoleRoute allowedRole="student">
            <StudentDashboard />
          </RoleRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <RoleRoute allowedRole="admin">
            <AdminDashboard />
          </RoleRoute>
        } />

        {/* Shared Course Viewer (Protected) */}
        <Route path="/course/:courseId" element={
          <ProtectedRoute>
            <CourseViewer />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
