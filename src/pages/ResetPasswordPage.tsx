import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [readyState, setReadyState] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses the recovery link's hash tokens and fires PASSWORD_RECOVERY
    // once it establishes a temporary session for the password update.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReadyState('ready');
      }
    });

    // If the tab was already signed in with a recovery session before this
    // listener attached, fall back to checking for a session directly.
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setReadyState((current) => (current === 'ready' ? current : session ? 'ready' : 'invalid'));
      });
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
       <div className="min-h-screen bg-surface flex flex-col justify-center py-xl sm:px-6 lg:px-8">
         <div className="sm:mx-auto sm:w-full sm:max-w-md">
           <h2 className="mt-6 text-center text-3xl font-extrabold text-ink">
             Password updated
           </h2>
           <div className="mt-8 bg-paper py-8 px-4 shadow sm:rounded-card sm:px-10">
             <p className="text-sm text-muted">Your password has been reset. Sign in with your new password.</p>
             <button
               type="button"
               onClick={() => navigate('/login')}
               className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90"
             >
               Go to sign in
             </button>
           </div>
         </div>
       </div>
    );
  }

   if (readyState === 'invalid') {
     return (
       <div className="min-h-screen bg-surface flex flex-col justify-center py-xl sm:px-6 lg:px-8">
         <div className="sm:mx-auto sm:w-full sm:max-w-md">
           <h2 className="mt-6 text-center text-3xl font-extrabold text-ink">
             Link expired
           </h2>
           <div className="mt-8 bg-paper py-8 px-4 shadow sm:rounded-card sm:px-10">
             <p className="text-sm text-muted">
               This password reset link is invalid or has expired. Request a new one to continue.
             </p>
             <Link
               to="/forgot-password"
               className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90"
             >
               Request a new link
             </Link>
           </div>
         </div>
       </div>
     );
   }

   return (
     <div className="min-h-screen bg-surface flex flex-col justify-center py-xl sm:px-6 lg:px-8">
       <div className="sm:mx-auto sm:w-full sm:max-w-md">
         <h2 className="mt-6 text-center text-3xl font-extrabold text-ink">
           Set a new password
         </h2>
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
               <label htmlFor="password" className="block text-sm font-medium text-ink">
                 New password
               </label>
               <div className="mt-1">
                 <input
                   id="password"
                   name="password"
                   type="password"
                   autoComplete="new-password"
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="appearance-none block w-full px-3 py-2 border border-border rounded-control shadow-sm placeholder:text-muted focus:outline-none focus:ring-signal focus:border-signal sm:text-sm"
                 />
               </div>
             </div>

             <div>
               <label htmlFor="confirm-password" className="block text-sm font-medium text-ink">
                 Confirm new password
               </label>
               <div className="mt-1">
                 <input
                   id="confirm-password"
                   name="confirm-password"
                   type="password"
                   autoComplete="new-password"
                   required
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   className="appearance-none block w-full px-3 py-2 border border-border rounded-control shadow-sm placeholder:text-muted focus:outline-none focus:ring-signal focus:border-signal sm:text-sm"
                 />
               </div>
             </div>

             <div>
               <button
                 type="submit"
                 disabled={loading || readyState === 'checking'}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-signal disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {readyState === 'checking' ? 'Verifying link...' : loading ? 'Saving...' : 'Reset password'}
               </button>
             </div>
           </form>
         </div>
       </div>
     </div>
   );
};

export default ResetPasswordPage;
