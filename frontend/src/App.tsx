import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import AccountsRoles from "./pages/AccountsRoles";
import Interviews from "./pages/Interviews";
import InterviewSession from "./pages/InterviewSession";
import RealInterviews from "./pages/RealInterviews";
import UserManagement from "./pages/admin/UserManagement";

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={currentUser ? <Navigate to="/" replace /> : <Register />}
      />

      {/* Protected routes */}
      <Route element={currentUser ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />

        {/* Admin-only */}
        <Route
          path="accounts-roles"
          element={currentUser?.isAdmin ? <AccountsRoles /> : <Navigate to="/" replace />}
        />
        <Route
          path="admin/users"
          element={currentUser?.isAdmin ? <UserManagement /> : <Navigate to="/" replace />}
        />

        {/* User routes */}
        <Route path="interviews" element={<Interviews />} />
        <Route path="interviews/:id" element={<InterviewSession />} />
        <Route path="real-interviews" element={<RealInterviews />} />

        {/* Redirect aliases */}
        <Route path="accounts" element={<Navigate to="/accounts-roles" replace />} />
        <Route path="roles"    element={<Navigate to="/accounts-roles" replace />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
