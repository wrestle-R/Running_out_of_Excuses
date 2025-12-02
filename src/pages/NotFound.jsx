import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 md:px-8 bg-pure-black text-pure-white font-montserrat min-h-screen flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-pure-white/20 mb-4">404</h1>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-6">
            Page Not <span className="text-pure-white/80">Found</span>
          </h2>
          <p className="text-lg text-pure-white/60 mb-8 max-w-md mx-auto">
            Looks like you've taken a wrong turn on your running route. Let's get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-full bg-pure-white text-pure-black font-semibold hover:bg-pure-white/90 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Go Home
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-full bg-pure-white/10 text-pure-white font-semibold hover:bg-pure-white/20 transition-all duration-200 border border-pure-white/10 backdrop-blur-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-pure-white/10">
          <p className="text-sm text-pure-white/40 mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => navigate('/runs')}
              className="px-4 py-2 text-sm rounded-full bg-pure-white/5 text-pure-white/70 hover:bg-pure-white/10 hover:text-pure-white transition-all duration-200"
            >
              View Runs
            </button>
            <button
              onClick={() => navigate('/refresh')}
              className="px-4 py-2 text-sm rounded-full bg-pure-white/5 text-pure-white/70 hover:bg-pure-white/10 hover:text-pure-white transition-all duration-200"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
