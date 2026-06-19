'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const messages = [
  'Reviewing your profile…',
  'Analysing income signals…',
  'Computing personalised rate…',
  'Preparing your offer…',
];

export default function ProcessingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 1800);

    fetch(`/api/session/${params.id}/offer`, { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((offer) => {
        clearInterval(msgTimer);
        try { sessionStorage.setItem(`offer_${params.id}`, JSON.stringify(offer)); } catch {/* quota */}
        router.push(`/session/${params.id}/offer`);
      })
      .catch(() => {
        clearInterval(msgTimer);
        setError('Something went wrong. Please try again.');
      });

    return () => clearInterval(msgTimer);
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => { setError(''); window.location.reload(); }}
              className="px-6 py-2 bg-(--color-brand) text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-(--color-brand) border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-xl font-semibold text-(--color-brand)">{messages[msgIdx]}</p>
            <p className="text-gray-500 text-sm mt-2">This takes about 10 seconds</p>
          </>
        )}
      </div>
    </div>
  );
}
