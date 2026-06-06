import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { AIChatbot } from "../components/AIChatbot";
import {
  Users, BookOpen, Video, Radio, Activity, TrendingUp, Award,
  Shield, BarChart2, GraduationCap, FileText, Trash2, Search, X, CheckCircle
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { supabase } from "../services/supabase";
import { useToast } from "../context/ToastContext";

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuth();
  const toast = useToast();
  const {
    courses, lectures, assignments, liveClasses, enrollments,
    leaderboard, submissions, quizzes, progress, attendance
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Platform user directory (admin-managed)
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const loadUsers = React.useCallback(async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setAllUsers(data || []);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
    const channel = supabase
      .channel('admin_users_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadUsers]);

  const approveTeacher = async (id, approved) => {
    const { error } = await supabase.from('users').update({ approved }).eq('id', id);
    if (error) toast.error("Error", error.message);
    else {
      toast.success(approved ? "Teacher Approved" : "Approval Revoked", approved ? "The teacher can now manage courses." : "Teacher access paused.");
      loadUsers();
    }
  };

  const changeUserRole = async (id, role) => {
    const { error } = await supabase
      .from('users')
      .update({ role, approved: role !== 'teacher' })
      .eq('id', id);
    if (error) toast.error("Error", error.message);
    else { toast.success("Role Updated", `User role set to ${role}.`); loadUsers(); }
  };

  const deleteUser = async (id) => {
    if (id === user?.id) { toast.warning("Not Allowed", "You cannot delete your own account."); return; }
    if (!window.confirm("Remove this user's profile from the platform?")) return;
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) toast.error("Error", error.message);
    else { toast.success("User Removed", "Profile deleted."); loadUsers(); }
  };

  const visibleUsers = allUsers.filter(u => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch = !searchTerm
      || u.name?.toLowerCase().includes(searchTerm.toLowerCase())
      || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });
  const pendingTeachers = allUsers.filter(u => u.role === 'teacher' && !u.approved);

  const totalStudents = allUsers.filter(u => u.role === 'student').length || new Set(enrollments.map((e) => e.student_id)).size;
  const totalTeachers = allUsers.filter(u => u.role === 'teacher').length || new Set(courses.map((c) => c.teacher_id)).size;
  const totalEnrollments = enrollments.length;
  const avgXP = leaderboard.length
    ? Math.round(leaderboard.reduce((s, l) => s + (l.xp || 0), 0) / leaderboard.length)
    : 0;

  const courseEnrollData = courses.slice(0, 6).map(c => ({
    name: c.title.length > 20 ? c.title.substring(0, 20) + "…" : c.title,
    students: enrollments.filter(e => e.course_id === c.id).length,
    lectures: lectures.filter(l => l.course_id === c.id).length
  }));

  const xpDistData = [
    { name: "0-200 XP", value: leaderboard.filter(l => l.xp < 200).length },
    { name: "200-500", value: leaderboard.filter(l => l.xp >= 200 && l.xp < 500).length },
    { name: "500-900", value: leaderboard.filter(l => l.xp >= 500 && l.xp < 900).length },
    { name: "900+ XP", value: leaderboard.filter(l => l.xp >= 900).length },
  ];
  const COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B"];

  const submissionsByStatus = [
    { name: "Submitted", value: submissions.filter(s => s.status === "Submitted").length, fill: "#6366F1" },
    { name: "Reviewed", value: submissions.filter(s => s.status === "Reviewed").length, fill: "#10B981" },
    { name: "Pending", value: submissions.filter(s => !s.status || s.status === "Pending").length, fill: "#F59E0B" },
  ];

  const filteredLeaderboard = leaderboard.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ icon, label, value, sub, color = "text-primary" }) => (
    <div className="glass-panel p-5 rounded-2xl border border-border flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title={`Admin Panel`}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {/* ==================== TAB: DASHBOARD ==================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Platform Overview
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Real-time metrics across the entire Learn Guru platform.</p>
          </div>

          {pendingTeachers.length > 0 && (
            <button
              onClick={() => setActiveTab('users')}
              className="w-full text-left glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3 hover:bg-amber-500/10 transition-all"
            >
              <Shield className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-400">{pendingTeachers.length} teacher{pendingTeachers.length === 1 ? '' : 's'} awaiting approval</p>
                <p className="text-[10px] text-muted-foreground">Open the Users tab to review and approve teacher accounts.</p>
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-5 h-5" />} label="Students" value={totalStudents} sub={`${totalEnrollments} enrollments`} />
            <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Teachers" value={totalTeachers} sub={`${courses.length} courses`} color="text-purple-400" />
            <StatCard icon={<BookOpen className="w-5 h-5" />} label="Lectures" value={lectures.length} sub={`${quizzes.length} quizzes`} color="text-accent" />
            <StatCard icon={<Award className="w-5 h-5" />} label="Avg XP" value={avgXP} sub={`${leaderboard.length} ranked`} color="text-amber-400" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<FileText className="w-5 h-5" />} label="Assignments" value={assignments.length} sub={`${submissions.length} submissions`} color="text-emerald-400" />
            <StatCard icon={<Radio className="w-5 h-5" />} label="Live Classes" value={liveClasses.length} sub={`${attendance.length} attendance records`} color="text-rose-400" />
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Graded" value={submissions.filter(s => s.status === "Reviewed").length} sub="submissions reviewed" color="text-sky-400" />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Active Courses" value={new Set(enrollments.map(e => e.course_id)).size} sub="with enrollments" color="text-indigo-400" />
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-border">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Enrollments per Course</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseEnrollData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#28283c" />
                    <XAxis dataKey="name" fontSize={9} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={9} stroke="#64748B" tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1c1c2c', border: '1px solid #28283c', borderRadius: '8px', fontSize: '10px' }} />
                    <Bar dataKey="students" fill="#6366F1" radius={[4,4,0,0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-border">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" /> XP Distribution</h3>
              <div className="h-56 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={xpDistData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => value > 0 ? `${name} (${value})` : ''} labelLine={false} fontSize={9}>
                      {xpDistData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1c1c2c', border: '1px solid #28283c', borderRadius: '8px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Submission Status */}
          <div className="glass-panel p-5 rounded-2xl border border-border">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-400" /> Assignment Submission Status</h3>
            <div className="grid grid-cols-3 gap-3">
              {submissionsByStatus.map(s => (
                <div key={s.name} className="p-3 rounded-xl border border-border text-center">
                  <p className="text-2xl font-black" style={{ color: s.fill }}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">{s.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: ANALYTICS ==================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Platform Analytics
            </h2>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-border">
            <h3 className="text-sm font-bold mb-4">Leaderboard — All Students</h3>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-white/50 dark:bg-black/20 outline-none focus:border-primary text-foreground"
                />
              </div>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="p-2 rounded-xl border border-border">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLeaderboard.map((s, idx) => (
                <div key={s.student_id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-white/5 transition-all">
                  <span className="text-xs font-mono font-bold w-6 text-center text-muted-foreground">#{idx+1}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                    {s.avatar || s.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">Level {s.level}</p>
                  </div>
                  <span className="text-xs font-bold font-mono text-primary">{s.xp} XP</span>
                </div>
              ))}
              {filteredLeaderboard.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No students found.</p>
              )}
            </div>
          </div>

          {/* Course Analytics Table */}
          <div className="glass-panel rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-white/30 dark:bg-black/10">
              <h3 className="text-sm font-bold">Course Performance Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Course</th>
                    <th className="text-center px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Students</th>
                    <th className="text-center px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Lectures</th>
                    <th className="text-center px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Assignments</th>
                    <th className="text-center px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Submissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {courses.map(c => {
                    const enrolled = enrollments.filter(e => e.course_id === c.id).length;
                    const lects = lectures.filter(l => l.course_id === c.id).length;
                    const assigns = assignments.filter(a => a.course_id === c.id).length;
                    const subs = submissions.filter(s => {
                      const a = assignments.find(a => a.id === s.assignment_id);
                      return a?.course_id === c.id;
                    }).length;
                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition-all">
                        <td className="px-4 py-3 font-semibold max-w-xs truncate">{c.title}</td>
                        <td className="px-4 py-3 text-center font-mono text-primary">{enrolled}</td>
                        <td className="px-4 py-3 text-center font-mono">{lects}</td>
                        <td className="px-4 py-3 text-center font-mono">{assigns}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-400">{subs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: USERS ==================== */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> User Management
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Approve teachers, change roles, and manage platform accounts.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-white/50 dark:bg-black/20 outline-none focus:border-primary text-foreground"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-white/50 dark:bg-black/20 outline-none focus:border-primary text-foreground"
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="glass-panel rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="text-center px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {usersLoading && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading users…</td></tr>
                  )}
                  {!usersLoading && visibleUsers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
                  )}
                  {visibleUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-all">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                            {u.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={e => changeUserRole(u.id, e.target.value)}
                          disabled={u.id === user?.id}
                          className="px-2 py-1.5 rounded-lg border border-border bg-white/50 dark:bg-black/20 text-[11px] outline-none focus:border-primary disabled:opacity-50"
                        >
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.role === 'teacher' ? (
                          u.approved ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase">Approved</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 uppercase">Pending</span>
                          )
                        ) : (
                          <span className="text-[9px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {u.role === 'teacher' && (
                            <button
                              onClick={() => approveTeacher(u.id, !u.approved)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider border ${
                                u.approved
                                  ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400'
                                  : 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {u.approved ? 'Revoke' : 'Approve'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={u.id === user?.id}
                            className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 disabled:opacity-40"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs fallthrough to dashboard view */}
      {!["dashboard","analytics","users"].includes(activeTab) && (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground/40" />
          <h3 className="font-bold text-lg">Admin Panel</h3>
          <p className="text-xs text-muted-foreground">Select Dashboard, Users, or Analytics from the sidebar.</p>
        </div>
      )}

      <AIChatbot />
    </DashboardLayout>
  );
};
