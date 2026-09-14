'use client';
import { useEffect, useState } from 'react';

export default function useGymData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null); setError('');
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(url, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load your gym data.');
      if (active) setData(result);
    }).catch(reason => {
      if (active) setError(reason.name === 'AbortError' ? 'The request took too long. Please retry.' : reason.message);
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [url, attempt]);
  return { data, error, retry: () => setAttempt(n => n + 1) };
}
