import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import { toast } from 'sonner';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, isAdminAuthenticated, adminUser } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated && adminUser) {
      navigate(ROUTES.ADMIN, { replace: true });
    }
  }, [isAdminAuthenticated, adminUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(username, password, 'admin');
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        toast.success(`Welcome back, ${res.user?.username || username}!`);
        navigate(ROUTES.ADMIN);
      }
    } catch (err) {
      setErrorMsg('Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-slate-950 font-sans overflow-hidden">
      {/* Left Illustration Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white p-12 flex-col justify-center items-center relative overflow-hidden h-full">
        <div className="max-w-md space-y-6">
          <div className="bg-white/90 p-4 rounded-3xl shadow-xl backdrop-blur-md inline-block">
            <CompanyLogo size="xl" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-wide text-white uppercase">System Portal</h2>
            <p className="text-xs font-bold text-lime-400 mt-1 uppercase tracking-widest">Divine Empire Event System</p>
          </div>
          <div className="space-y-3 pt-4 border-t border-white/10 text-sm font-medium text-slate-200">
            <div className="flex items-center gap-2"><span className="text-blue-400 font-bold">✓</span> Supabase Cloud Database Connected</div>
            <div className="flex items-center gap-2"><span className="text-blue-400 font-bold">✓</span> Realtime Event & Winner Engine</div>
            <div className="flex items-center gap-2"><span className="text-blue-400 font-bold">✓</span> Participant Analytics & Management</div>
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 bg-white p-6 sm:p-12 flex flex-col items-center justify-center h-full overflow-y-auto">
        <div className="w-full max-w-md space-y-5">
          
          <div>
            <h2 className="text-2xl font-black text-slate-900">Sign In </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Access the portal with your registered credentials.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">{errorMsg}</div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Dummy hidden inputs to prevent browser password manager autofill */}
            <input type="text" name="prevent_autofill_user" className="hidden" tabIndex={-1} autoComplete="off" />
            <input type="password" name="prevent_autofill_pass" className="hidden" tabIndex={-1} autoComplete="off" />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User size={13} /> Username
              </label>
              <input 
                type="text" 
                name="portal_username_input"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Lock size={13} /> Password
              </label>
              <div className="relative w-full">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="portal_password_input"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 pr-11 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-semibold">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 rounded-md cursor-pointer"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-extrabold text-sm hover:bg-slate-950 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
