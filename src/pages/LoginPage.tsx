import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError('Please enter your email or phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(identifier, password);
      navigate('/account');
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please verify your email or phone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#D8D4CA] rounded-2xl p-8 shadow-2xs space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="md" className="mx-auto justify-center" />
          <h1 className="text-2xl font-display font-extrabold uppercase text-[#171717] tracking-tight pt-2">
            Sign In to Eleven Nation
          </h1>
          <p className="text-xs text-[#77746D] leading-relaxed">
            Access your order history, saved addresses, and express checkout.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#8B2E2E]/10 border border-[#8B2E2E]/30 text-[#8B2E2E] text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Email or Phone Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@example.com or 017XXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#171717]">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] text-[#8A927A] hover:underline font-semibold">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-[#171717] text-[#F5F3EE] font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#D8D4CA] text-xs text-[#77746D]">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-[#171717] hover:text-[#8A927A] underline transition-colors">
            Create an Account
          </Link>
        </div>

        <div className="p-3 bg-[#F5F3EE] border border-[#D8D4CA] rounded-xl text-[11px] text-[#77746D] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#8A927A] shrink-0" />
          <span>Secure, encrypted login session. Your account details remain private.</span>
        </div>
      </div>
    </div>
  );
};
