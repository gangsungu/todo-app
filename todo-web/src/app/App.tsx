import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import TodoPage from '@/pages/TodoPage';
import { Login } from '@/pages/components/login';
import { RequireAuth } from '@/pages/components/RequireAuth';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <TodoPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}