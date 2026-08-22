import LoginPage from "./components/LoginPage";
import { Routes, Route } from "react-router";
import Dashboard from "./components/Dashboard";
import Admin from "./components/Admin";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

function App() {
    return (
        <div>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<ProtectedAdminRoute />} />
            </Routes>
        </div>);
}

export default App;