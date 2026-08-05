import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postAuthRedirectPath } from '../lib/onboarding';

const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const prefilledEmail = useMemo(
    () => searchParams.get('email')?.trim() || '',
    [searchParams]
  );
  const fromDemo = searchParams.get('from') === 'demo';

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const { error, session, needsConfirmation } = await signUp(email, password);
      if (error) throw error;

      if (needsConfirmation || !session) {
        setConfirmationEmail(email);
        return;
      }

      const redirectPath = await postAuthRedirectPath(session.user.id);
      navigate(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (confirmationEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <p className="text-sm text-gray-700">
              We sent a confirmation link to <span className="font-medium">{confirmationEmail}</span>.
              Click the link in that email to activate your account, then sign in below.
            </p>
            <Link
              to="/login"
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to sign in
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
             {fromDemo ? 'Claim your free widget' : 'Create your account'}
           </h2>
           <p className="mt-2 text-center text-sm text-muted">
             {fromDemo
               ? 'You tried the demo — finish setup and embed Click2Call on your site.'
               : 'Start receiving web calls in minutes.'}
           </p>
           <p className="mt-2 text-center text-sm text-muted">
             Already have an account?{' '}
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
                 <label htmlFor="password" className="block text-sm font-medium text-ink">
                   Password
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
                   Confirm Password
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
                   disabled={loading}
                   className="w-full flex justify-center py-2 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-paper bg-signal hover:bg-signal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-signal disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {loading ? 'Creating Account...' : 'Create Account'}
                 </button>
               </div>
             </form>
           </div>
         </div>
       </div>
  );
};

export default SignupPage;