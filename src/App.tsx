import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AnalyzePage from './pages/AnalyzePage';
import AnalysisDetailPage from './pages/AnalysisDetailPage';
import LibraryPage from './pages/LibraryPage';
import ComparePage from './pages/ComparePage';
import PatternsPage from './pages/PatternsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/analyze/:analysisId" element={<AnalysisDetailPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
