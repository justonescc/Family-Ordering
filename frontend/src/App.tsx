import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import AdminMembers from './pages/admin/AdminMembers';
import AdminMeals from './pages/admin/AdminMeals';
import AdminMenu from './pages/admin/AdminMenu';
import FamiliesPage from './pages/Families';
import LoginPage from './pages/Login';
import OrderPage from './pages/Order';

export default function App() {
  const token = useAuthStore((s) => s.token);
  const family = useAuthStore((s) => s.family);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/families" element={<FamiliesPage />} />
        <Route
          path="/order"
          element={token && family ? <OrderPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/menu"
          element={token && family ? <AdminMenu /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/meals"
          element={token && family ? <AdminMeals /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/members"
          element={token && family ? <AdminMembers /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={token ? '/order' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
