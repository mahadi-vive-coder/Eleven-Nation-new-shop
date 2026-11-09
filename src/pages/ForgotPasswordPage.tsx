import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import { authService } from '../services/authService';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const res = await authService.resetPassword(email);
    setMessage(res.message);
    setLoading(false);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#D8D4CA] rounded-2xl p-8 shadow-2xs space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="md" className="mx-auto justify-center" />
          <h1 className="text-2xl font-display font-extrabold uppercase text-[#171717] tracking-tight pt-2">
            Reset Password
          </h1>
          <p className="text-xs text-[#77746D] leading-relaxed">
            Enter your email to receive recovery instructions.
          </p>
        </div>

        {message ? (
          <div className="p-4 bg-[#42634B]/10 border border-[#42634B]/30 rounded-xl text-[#42634B] text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#42634B]" />
              <span>Link Dispatched</span>
            </div>
            <p className="text-[#77746D]">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#171717] text-[#F5F3EE] font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors cursor-pointer shadow-2xs"
            >
              {loading ? 'Sending...' : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#171717] hover:text-[#8A927A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
