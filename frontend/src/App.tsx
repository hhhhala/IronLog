import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ToastContainer from '@/components/shared/Toast';
import UpdateAnnouncement from '@/components/shared/UpdateModal';
import { initSyncListeners } from '@/services/sync';
import { useEffect } from 'react';

// Lazy imports handled by Vite automatically
import Dashboard from '@/pages/Dashboard';
import AICoach from '@/pages/AICoach';
import PlanList from '@/pages/PlanList';
import PlanDetail from '@/pages/PlanDetail';
import ActiveTraining from '@/pages/ActiveTraining';
import RecordList from '@/pages/RecordList';
import RecordDetail from '@/pages/RecordDetail';
import DataCenter from '@/pages/DataCenter';
import CalendarPage from '@/pages/CalendarPage';
import Profile from '@/pages/Profile';

export default function App() {
  useEffect(() => {
    initSyncListeners();
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <UpdateAnnouncement />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/plans" element={<PlanList />} />
          <Route path="/plans/:id" element={<PlanDetail />} />
          <Route path="/records" element={<RecordList />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/data" element={<DataCenter />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        {/* Training page - no tab bar */}
        <Route path="/training/:planId/:day?" element={<ActiveTraining />} />
      </Routes>
    </BrowserRouter>
  );
}
