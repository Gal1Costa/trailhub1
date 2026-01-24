import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Explore from "./pages/Explore";
import MyTrails from "./pages/MyTrails";
import HikerProfile from "./pages/HikerProfile";
import GuideProfile from "./pages/GuideProfile";
import HikeDetails from "./pages/HikeDetails";
import CreateHike from "./pages/CreateHike";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAccess from "./pages/admin/AdminAccess";
import AdminLayout from "./pages/admin/layouts/AdminLayout";
import AdminRoute from "./pages/admin/AdminRoute";
import ProtectedRoute from "./pages/ProtectedRoute";
import HikesAdmin from "./pages/admin/Hikes";
import HikeEdit from "./pages/admin/HikeEdit";
import UsersAdmin from "./pages/admin/Users";
import GuidesAdmin from "./pages/admin/Guides";
import DeletedAccounts from "./pages/admin/DeletedAccounts";
import RoleRequests from "./pages/admin/RoleRequests";
import Analytics from "./pages/admin/Analytics";
import AdminDevLogin from "./pages/admin/AdminDevLogin";
import AdminAudit from "./pages/admin/AdminAudit";
import ErrorBoundary from "./ErrorBoundary";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal.jsx";
import Toast from "./components/Toast";
import { auth, onAuthStateChanged } from "./firebase";

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('login');
  const [modalKey, setModalKey] = useState(0);
  const [user, setUser] = useState(auth.currentUser);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      // If user is signed in, verify their account is not deleted
      if (u) {
        try {
          const api = (await import('./api')).default;
          await api.get('/me');
        } catch (error) {
          // The axios interceptor will handle the sign-out and redirect
          // if the account is deleted (401 + "Account deleted")
        }
      }
    });
    return () => unsub();
  }, []);

  const handleOpenAuthModal = (tab) => {
    setModalTab(tab);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };

  // Listen for custom event to open auth modal
  useEffect(() => {
    const handleOpenAuth = (event) => {
      const tab = event.detail?.tab || 'login';
      handleOpenAuthModal(tab);
    };
    window.addEventListener('openAuthModal', handleOpenAuth);
    return () => window.removeEventListener('openAuthModal', handleOpenAuth);
  }, []);

  // Listen for admin sign-in event: close modal (no toast needed)
  useEffect(() => {
    const onAdminSignedIn = (e) => {
      setModalOpen(false);
    };
    window.addEventListener('admin:signedin', onAdminSignedIn);
    return () => window.removeEventListener('admin:signedin', onAdminSignedIn);
  }, []);

  // Generic toast listener: dispatch events with new CustomEvent('app:toast', { detail: { message, type } })
  useEffect(() => {
    const onToast = (e) => {
      const d = e.detail || {};
      setToast({ message: d.message || 'Notice', type: d.type || 'info' });
      setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  // If the app is opened under an admin-specific hostname, rewrite path to /admin/access
  useEffect(() => {
    try {
      const host = window.location.hostname || '';
      if (host.includes('trailhub-admin') && !window.location.pathname.startsWith('/admin')) {
        // direct to admin access gate first
        window.history.replaceState({}, '', '/admin/access');
      }
    } catch (e) {
      // ignore in SSR or environments without window
    }
  }, []);

  return (
    <BrowserRouter>
      <AppContent 
        handleOpenAuthModal={handleOpenAuthModal}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        modalTab={modalTab}
        modalKey={modalKey}
        toast={toast}
      />
    </BrowserRouter>
  );
}

function AppContent({ handleOpenAuthModal, modalOpen, setModalOpen, modalTab, modalKey, toast }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh" }}>
      {/* Hide main site header when browsing admin pages */}
      {!isAdminPage && (
        <Header onOpenAuthModal={handleOpenAuthModal} />
      )}

      <div style={{ padding: isAdminPage ? 0 : 20 }}>

        <Routes>
            {/* ═══════════════════════════════════════════════════════════════
                ADMIN ROUTING - STRICT SECURITY MODEL
                ═══════════════════════════════════════════════════════════════
                
                PUBLIC ROUTE:
                - /admin/access (login page) - ONLY public admin route
                
                ENTRY POINT:
                - /admin → ALWAYS redirects to /admin/access (for everyone)
                - This forces all users through the authentication gate
                
                PROTECTED ROUTES (require admin authentication):
                - /admin/dashboard - Main admin dashboard
                - /admin/users, /admin/hikes, /admin/guides, etc.
                
                SECURITY FLOW:
                1. User visits /admin → redirect to /admin/access
                2. /admin/access checks authentication:
                   - Not logged in → show login form
                   - Logged in but not admin → show login form with error
                   - Logged in as admin → redirect to /admin/dashboard
                3. User visits /admin/dashboard directly → AdminRoute guard:
                   - Not admin → redirect to /admin/access
                   - Admin → allow access
                   
                CRITICAL: /admin/dashboard is NEVER accessible without
                explicit admin authentication verified by backend API.
            ═══════════════════════════════════════════════════════════════ */}
            
            {/* Public admin route - login/access page (no authentication required) */}
            <Route path="/admin/access" element={<AdminAccess />} />

            {/* Dev login (only in development) */}
            <Route path="/admin/dev-login" element={<AdminDevLogin />} />

            {/* /admin entry point - redirect everyone to /admin/access */}
            <Route path="/admin" element={<Navigate to="/admin/access" replace />} />

            {/* Protected admin routes - ALL require AdminRoute guard */}
            <Route path="/admin/dashboard" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
            </Route>
            <Route path="/admin/analytics" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Analytics />} />
            </Route>
            <Route path="/admin/audit" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminAudit />} />
            </Route>
            <Route path="/admin/hikes" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<HikesAdmin />} />
            </Route>
            <Route path="/admin/hikes/:id" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<HikeEdit />} />
            </Route>
            <Route path="/admin/users" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<UsersAdmin />} />
            </Route>
            <Route path="/admin/guides" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<GuidesAdmin />} />
            </Route>
            <Route path="/admin/role-requests" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<RoleRequests />} />
            </Route>
            <Route path="/admin/deleted" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<DeletedAccounts />} />
            </Route>
            {/* redirect root to /explore */}
            <Route path="/" element={<Navigate to="/explore" replace />} />

            {/* main pages - protected from admin access */}
            <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
            <Route path="/mytrails" element={<ProtectedRoute><MyTrails /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Navigate to="/profile/hiker" replace /></ProtectedRoute>} />
            <Route path="/profile/hiker" element={<ProtectedRoute><HikerProfile /></ProtectedRoute>} />
            <Route path="/profile/guide" element={<ProtectedRoute><GuideProfile /></ProtectedRoute>} />
            <Route path="/hikes/:id" element={<ProtectedRoute><HikeDetails /></ProtectedRoute>} />
            <Route path="/hikes/create" element={<ProtectedRoute><CreateHike /></ProtectedRoute>} />

            {/* catch-all → back to explore */}
            <Route path="*" element={<Navigate to="/explore" replace />} />
          </Routes>
        </div>

        {modalOpen && (
          <AuthModal 
            key={`${modalTab}-${modalKey}`}
            open={modalOpen} 
            onClose={() => setModalOpen(false)} 
            initialTab={modalTab} 
          />
        )}
        <Toast toast={toast} />
      </div>
    );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);