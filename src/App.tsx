
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import DatesPage from './pages/DatesPage'
import DateForm from './pages/DateForm'
import DateDetail from './pages/DateDetail'
import IdeasPage from './pages/IdeasPage'
import DrawPage from './pages/DrawPage'
import ScratchPage from './pages/ScratchPage'
import BrasaPage from './pages/BrasaPage'
import HistoryPage from './pages/HistoryPage'
import FinancePage from './pages/FinancePage'
import ProfilePage from './pages/ProfilePage'
import SharePage from './pages/SharePage'
import PartnerPage from './pages/PartnerPage'
import PartnerViewPage from './pages/PartnerViewPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-56 shrink-0" />
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0 mt-12 md:mt-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/share/:token" element={<SharePage />} />

      {/* Protected */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dates" element={<DatesPage />} />
        <Route path="/dates/new" element={<DateForm />} />
        <Route path="/dates/:id" element={<DateDetail />} />
        <Route path="/dates/:id/edit" element={<DateForm />} />
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/ideas/draw" element={<DrawPage />} />
        <Route path="/ideas/scratch" element={<ScratchPage />} />
        <Route path="/ideas/brasa" element={<BrasaPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/partner/view/:partnerId" element={<PartnerViewPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LoginRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <LoginPage />
}
