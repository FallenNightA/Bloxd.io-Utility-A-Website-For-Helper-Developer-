import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster 
      position="bottom-right"
      toastOptions={{
        className: 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-lg',
        style: {
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }
      }}
    />
  );
}
