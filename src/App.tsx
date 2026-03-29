import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ProfesorRoute } from './components/ProfesorRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import  Dashboard  from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Report } from './pages/Report';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { Profesor } from './pages/Profesor';
import { ProfesorAlumno } from './pages/ProfesorAlumno';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/:id"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                 <Profile />
                </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/profesor" element={<ProfesorRoute><Profesor /></ProfesorRoute>} />
          <Route path="/profesor/alumno/:id" element={<ProfesorRoute><ProfesorAlumno /></ProfesorRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
