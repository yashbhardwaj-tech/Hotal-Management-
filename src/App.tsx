import { Routes, Route, Navigate } from "react-router";
import Dashboard from "./components/Dashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

function App() {
  return (
    <Routes>
      {/* The menu is the front door — no login in the way */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* Sign-in happens inside this guard, only when needed */}
      <Route path="/admin" element={<ProtectedAdminRoute />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;