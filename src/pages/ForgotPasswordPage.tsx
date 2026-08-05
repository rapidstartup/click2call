import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
       <div className="min-h-screen bg-surface flex flex-col justify-center py-xl sm:px-6 lg:px-8">
         <div className="sm:mx-auto sm:w-full sm:max-w-md">
           <h2 className="mt-6 text-center text-3xl font-extrabold text-ink">
             Check your email
           </h2>
           <div className="mt-8 bg-paper py-8 px-4 shadow sm:rounded-card sm:px-10">
             <p className="text-sm text-muted">
               If an account exists for <span className="font-medium text-ink">{email}</span>, we sent a
               link to reset your password.
             </p>
             <Link
               to="/login"
               className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90"
             >
               Back to sign in
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
           Reset your password
         </h2>
         <p className="mt-2 text-center text-sm text-muted">
           Enter your email and we'll send you a link to reset your password.
         </p>
         <p className="mt-2 text-center text-sm text-muted">
           Remembered it?{' '}
           <Link to="/login" className="font-medium text-signal hover:text-signal/80">
             Sign in
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
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-signal disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {loading ? 'Sending...' : 'Send reset link'}
               </button>
             </div>
           </form>
         </div>
       </div>
     </div>
   );
};

export default ForgotPasswordPage;
