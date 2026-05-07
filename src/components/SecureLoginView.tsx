
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SecureLoginView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, user: authUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(authUser?.role === 'admin' ? '/admin' : '/user');
      return;
    }

    const performSecureLogin = async () => {
      const storageKey = `sec_login_${token}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, 'true');
      
      try {
        const res = await fetch('/api/auth/login-secure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (res.ok) {
          const data = await res.json();
          login(data.token, data.user);
          toast.success('Secure login successful');
          navigate(data.user.role === 'admin' ? '/admin' : '/user');
        } else {
          sessionStorage.removeItem(storageKey);
          toast.error('Invalid or expired secure link');
          navigate('/');
        }
      } catch (err) {
        sessionStorage.removeItem(storageKey);
        console.error('Secure login error:', err);
        toast.error('Connection error');
        navigate('/');
      }
    };

    if (token) {
      performSecureLogin();
    }
  }, [token, login, navigate, isAuthenticated, authUser]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Validating secure link...</h2>
        <p className="text-slate-500 mt-2">Please wait while we verify your credentials.</p>
      </div>
    </div>
  );
}
