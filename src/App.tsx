import LoginPage from "./components/LoginPage";
import { Routes, Route } from "react-router";
import Dashboard from "./components/Dashboard";
import Admin from "./components/Admin";

function App() {
    return (
    <div>
<Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/admin" element={<Admin />} />
</Routes>
    </div> );
}

export default App;