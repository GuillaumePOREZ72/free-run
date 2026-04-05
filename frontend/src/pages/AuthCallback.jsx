import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_BACKEND_URL;

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');
    if (!sessionId) {
      navigate('/login');
      return;
    }

    (async () => {
      try {
        const res = await axios.post(`${API}/api/auth/session`, { session_id: sessionId }, { withCredentials: true });
        setUser(res.data);
        navigate('/dashboard', { state: { user: res.data } });
      } catch {
        navigate('/login');
      }
    })();
  }, [navigate, setUser]);

  return null;
}
