'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/early-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setSubmitted(true);
        setEmail(''); // Clear the form
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Sorry, there was an error. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      setError('Sorry, there was an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-serif text-gray-800 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Zentra
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-rose-400 to-teal-400 mx-auto rounded-full"></div>
          </div>

          {/* Coming Soon Message */}
          <h2 className="text-3xl md:text-5xl font-light text-gray-700 mb-6">
            Something Beautiful is Coming
          </h2>
          <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            We're crafting the ultimate booking experience for beauty and wellness businesses. 
            Elegant appointments, seamless payments, and delighted customers.
          </p>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-semibold text-gray-800 mb-2">Smart Booking</h3>
              <p className="text-sm text-gray-600">Intelligent scheduling with automated reminders</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="font-semibold text-gray-800 mb-2">Easy Payments</h3>
              <p className="text-sm text-gray-600">Stripe & Square integration for seamless transactions</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="font-semibold text-gray-800 mb-2">Loyalty Rewards</h3>
              <p className="text-sm text-gray-600">Automated points system to keep clients coming back</p>
            </div>
          </div>

          {/* Email Signup */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for early access"
                  required
                  disabled={loading}
                  className="flex-1 px-6 py-4 rounded-full border-2 border-rose-200 focus:border-rose-400 focus:outline-none text-gray-700 bg-white/80 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-rose-400 to-teal-400 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Submitting...' : 'Notify Me'}
                </button>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </form>
          ) : (
            <div className="max-w-md mx-auto mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-2xl">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-green-800 font-semibold">Thank you! We'll be in touch soon.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2025 Zentra. Elevating the booking experience.</p>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&display=swap');
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
}
