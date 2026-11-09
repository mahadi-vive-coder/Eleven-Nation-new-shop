import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(fullName, email, phone, password);
      navigate('/account');
    } catch {
      setError('Registration failed. Please check your information.');
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
            Create an Account
          </h1>
          <p className="text-xs text-[#77746D] leading-relaxed">
            Join the Eleven Nation community for exclusive kit drops and priority shipping.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#8B2E2E]/10 border border-[#8B2E2E]/30 text-[#8B2E2E] text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Phone Number (BD) *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Email Address *
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

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
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
                <span>Complete Registration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#D8D4CA] text-xs text-[#77746D]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#171717] hover:text-[#8A927A] underline transition-colors">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
