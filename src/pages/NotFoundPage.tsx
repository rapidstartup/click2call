import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center py-xl px-4 text-center">
       <p className="text-sm font-semibold text-signal">404</p>
       <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">Page not found</h1>
       <p className="mt-4 max-w-md text-base text-muted">
         The page you're looking for doesn't exist or may have moved.
       </p>
       <div className="mt-8 flex items-center gap-4">
         <Link
           to="/"
           className="rounded-control bg-signal px-4 py-2 text-sm font-medium text-paper shadow-sm hover:bg-signal/90"
         >
           Go home
         </Link>
         <Link
           to="/dashboard"
           className="text-sm font-medium text-signal hover:text-signal/80"
         >
           Go to dashboard
         </Link>
       </div>
     </div>
  );
};

export default NotFoundPage;
