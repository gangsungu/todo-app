import { BrowserRouter, Routes, Route } from 'react-router';
import TodoPage from '@/pages/TodoPage';
import { Login } from '@/pages/components/login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<TodoPage />} />
      </Routes>
    </BrowserRouter>
  );
}