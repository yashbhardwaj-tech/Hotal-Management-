import LoginPage from "./components/LoginPage";
import { Routes, Route } from "react-router";
import Dashboard from "./components/Dashboard";

function App() {
    return (
    <div>
<Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/dashboard" element={<Dashboard />} />
</Routes>
    </div> );
}

export default App;