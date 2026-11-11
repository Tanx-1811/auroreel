import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const ToastContext = createContext<(text: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  const show = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-2), { id, text }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className="toast">
            {i.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
