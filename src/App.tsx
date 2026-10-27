import { Route, Routes } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Portfolio from '@/pages/Portfolio';
import Photography from '@/pages/Photography';

// One persistent canvas survives navigation between the two learning pages.
export default function App() {
  return <Routes><Route path="/portfolio/programming" element={<Portfolio/>}/><Route path="/portfolio/photography" element={<Photography/>}/><Route path="*" element={<Landing/>}/></Routes>;
}
