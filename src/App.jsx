import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CafeMenu from './pages/menu_screen';
import AdminDashboard from './pages/dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CafeMenu />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;