import React, { useState, useContext } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import StudentDashboard from './components/student/StudentDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import './App.css';

function AppContent() {
  const { user, loading, logout } = useContext(AuthContext);
  const [showLogin, setShowLogin] = useState(true);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated — show Login/Register
  if (!user) {
    return showLogin ? (
      <Login switchToRegister={() => setShowLogin(false)} />
    ) : (
      <Register switchToLogin={() => setShowLogin(true)} />
    );
  }

  // Authenticated — show dashboard based on role
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🎯 Gamified Programming</h1>
          <div className="user-info">
            <span>👤 {user.name} ({user.role === 'student' ? 'Student' : user.role === 'teacher' ? 'Teacher' : 'Admin'})</span>
            <button onClick={logout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {user.role === 'admin' ? (
          <AdminDashboard />
        ) : user.role === 'teacher' ? (
          <TeacherDashboard />
        ) : (
          <StudentDashboard />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

