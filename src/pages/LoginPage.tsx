import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { postAuthRedirectPath } from '../lib/onboarding';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      const { error } = await signIn(email, password);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      const redirectPath = user ? await postAuthRedirectPath(user.id) : '/dashboard';
      navigate(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-xl sm:px-6 lg:px-8">
       <div className="sm:mx-auto sm:w-full sm:max-w-md">
         <h2 className="mt-6 text-center text-3xl font-extrabold text-ink">
           Sign in to your account
         </h2>
         <p className="mt-2 text-center text-sm text-muted">
           Or{' '}
           <Link to="/signup" className="font-medium text-signal hover:text-signal/80">
             start your 14-day free trial
           </Link>
         </p>
       </div>

       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
         <div className="bg-paper py-8 px-4 shadow sm:rounded-card sm:px-10">
           <form onSubmit={handleSubmit} className="space-y-6">
             {error && (
               <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-control relative">
                 {error}
               </div>
             )}
             
             <div>
               <label htmlFor="email" className="block text-sm font-medium text-ink">
                 Email address
               </label>
               <div className="mt-1">
                 <input
                   id="email"
                   name="email"
                   type="email"
                   autoComplete="email"
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="appearance-none block w-full px-3 py-2 border border-border rounded-control shadow-sm placeholder:text-muted focus:outline-none focus:ring-signal focus:border-signal sm:text-sm"
                 />
               </div>
             </div>

             <div>
               <label htmlFor="password" className="block text-sm font-medium text-ink">
                 Password
               </label>
               <div className="mt-1">
                 <input
                   id="password"
                   name="password"
                   type="password"
                   autoComplete="current-password"
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="appearance-none block w-full px-3 py-2 border border-border rounded-control shadow-sm placeholder:text-muted focus:outline-none focus:ring-signal focus:border-signal sm:text-sm"
                 />
               </div>
             </div>

             <div className="flex items-center justify-between">
               <div className="flex items-center">
                 <input
                   id="remember-me"
                   name="remember-me"
                   type="checkbox"
                   className="h-4 w-4 text-signal focus:ring-signal border-border rounded"
                 />
                 <label htmlFor="remember-me" className="ml-2 block text-sm text-ink">
                   Remember me
                 </label>
               </div>

               <div className="text-sm">
                 <Link to="/forgot-password" className="font-medium text-signal hover:text-signal/80">
                   Forgot your password?
                 </Link>
               </div>
             </div>

             <div>
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-signal disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {loading ? 'Signing in...' : 'Sign in'}
               </button>
             </div>
           </form>
         </div>
       </div>
     </div>
  );
};

export default LoginPage;