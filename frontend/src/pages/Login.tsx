import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera } from '../components/Camera';
import api from '../utils/api';
import { KeyRound, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function Login({ onLoginSuccess, addToast }: LoginProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (base64Image: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/login', {
        image: base64Image,
      });

      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Notify parent state
      onLoginSuccess(token);
      
      addToast(`Welcome back, ${user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Authentication failed. Please try again.';
      setError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8 flex justify-center">
      <div className="card">
        <div className="flex align-center gap-2 mb-3">
          <KeyRound size={20} />
          <h2 style={{ fontSize: '1.25rem' }}>FACE LOGIN</h2>
        </div>

        {error && (
          <div className="alert alert-error mb-3 flex align-center gap-2">
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-column gap-3">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Align your face within the camera boundaries below to log in.
          </p>

          <Camera onCapture={handleCapture} isLoading={isLoading} />

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
            New user? <Link to="/register" style={{ textDecoration: 'underline', color: 'var(--text-primary)' }}>Register Face Profile</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
