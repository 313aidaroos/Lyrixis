'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RedeemButton({ trackId, isUnlocked }: { trackId: string; isUnlocked: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (isUnlocked) {
    return (
      <div className="card mt-6 bg-cyan/10 border-cyan/30">
        <p className="text-cyan font-medium">✓ Track unlocked — exports ready</p>
      </div>
    );
  }

  const handleRedeem = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });

      const data = await res.json();

      if (res.status === 402) {
        // Insufficient Ixis - redirect to Wallet
        if (data.buyUrl) {
          window.location.href = data.buyUrl;
        } else {
          setError(data.message || 'Not enough Ixis. Buy Ixis in Apixis Wallet first.');
        }
        return;
      }

      if (!res.ok) {
        setError(typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : (data.error && typeof data.error.message === 'string') ? data.error.message : 'Redemption failed');
        return;
      }

      // Success - refresh to show unlocked state
      router.refresh();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <button
        onClick={handleRedeem}
        disabled={loading}
        className="btn btn-primary w-full sm:w-auto disabled:opacity-50"
      >
        {loading ? 'Redeeming...' : 'Redeem · 300 Ixis'}
      </button>
      {error && (
        <div className="card mt-3 bg-red-500/10 border-red-500/30">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-3">
        Unlock this track&apos;s exports for 300 Ixis ($3.00). Not enough? <a href="https://apixis-wallet.vercel.app/buy" className="text-cyan hover:underline">Buy Ixis</a>
      </p>
    </div>
  );
}
