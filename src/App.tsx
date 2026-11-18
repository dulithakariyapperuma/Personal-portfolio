import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Landing from '@/pages/Landing';
import RouteCurtain from '@/components/RouteCurtain';
import '@/design/tokens.css';

// Route-level code splitting. Each portfolio is its own world with its own
// stylesheet and dependencies, so a visitor who never opens one never pays
// to download it. The landing page stays eager — it is the entry point.
const DckOs = lazy(() => import('@/dck/DckOs'));
const Photography = lazy(() => import('@/pages/Photography'));

export default function App() {
  return (
    <>
      <RouteCurtain />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/portfolio/programming" element={<DckOs />} />
          <Route path="/portfolio/photography" element={<Photography />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </>
  );
}
