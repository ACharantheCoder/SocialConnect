import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import CitizenDashboard from "./pages/CitizenDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function ComingSoon() {
  const { user, logout } = useAuth();
  return (
    <div className="p-6">
      <p>{user.role} dashboard coming soon.</p>
      <button onClick={logout} className="underline">
        Logout
      </button>
    </div>
  );
}

function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            user.role === "Citizen" ? (
              <Navigate to="/citizen" replace />
            ) : (
              <ComingSoon />
            )
          ) : (
            <AuthPage />
          )
        }
      />
      <Route
        path="/citizen"
        element={
          <ProtectedRoute roles={["Citizen"]}>
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
