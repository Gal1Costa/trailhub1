// frontend/src/api.js
import axios from "axios";
import { auth } from "./firebase";

// baseURL="/api" so all calls are prefixed with /api
// Components should call api.get('/me') not api.get('/api/me')
const api = axios.create({
  baseURL: "/api",
});

// Attach Firebase ID token (if logged in) to all requests
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;

    config.headers = config.headers || {};

    // Attach Firebase ID token when available (production flow)
    if (user) {
      const token = await user.getIdToken(/* forceRefresh */ true);
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle deleted accounts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if the error is "Account deleted"
    if (error?.response?.status === 401 && 
        error?.response?.data?.error === 'Account deleted') {
      try {
        // Sign out the user
        await auth.signOut();
        
        // Show a message to the user
        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { 
            message: 'Your account has been deleted. You have been signed out.', 
            type: 'error' 
          } 
        }));
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (signOutError) {
        console.error('Failed to sign out deleted user:', signOutError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Helper: delete current authenticated user (frontend convenience)
// Used by admin features for user management
async function deleteMe() {
  try {
    const res = await api.delete('/me');
    return res.data;
  } catch (err) {
    // rethrow so callers can handle
    throw err;
  }
}

export { deleteMe };