import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Landing from '@/pages/Landing';

// Route-level code splitting: the photography site pulls in its own CSS and
// gallery data, so a visitor who never opens it never downloads it.
const Portfolio = lazy(() => import('@/pages/Portfolio'));
const Photography = lazy(() => import('@/pages/Photography'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/portfolio/programming" element={<Portfolio />} />
        <Route path="/portfolio/photography" element={<Photography />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  );
}
