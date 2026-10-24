import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import InstitutionPage from './pages/Institution';
import CaseDetailPage from './pages/CaseDetail';
import CaseLensPage from './pages/CaseLens';
import NewComplaintPage from './pages/NewComplaint';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/institutions/:id" element={<InstitutionPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/cases/:id/caselens" element={<CaseLensPage />} />
        <Route path="/complaints/new" element={<NewComplaintPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
      Page not found.
    </div>
  );
}
