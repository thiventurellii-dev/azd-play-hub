import { useState, useEffect, createContext, useContext, useCallback, ReactNode, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface NotifyOptions {
  autoClose?: number; // ms, 0 = manual only
  onClose?: () => void;
}

interface NotificationState {
  open: boolean;
  type: NotificationType;
  title: string;
  message: string;
  options?: NotifyOptions;
}

interface NotificationContextType {
  notify: (type: NotificationType, message: string, title?: string, options?: NotifyOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const defaultTitles: Record<NotificationType, string> = {
  success: 'Tudo certo!',
  error: 'Ops! Algo deu errado',
  info: 'Informação',
};

const icons: Record<NotificationType, ReactNode> = {
  success: <CheckCircle className="h-10 w-10 text-green-500" />,
  error: <XCircle className="h-10 w-10 text-destructive" />,
  info: <Info className="h-10 w-10 text-gold" />,
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<NotificationState>({
    open: false,
    type: 'info',
    title: '',
    message: '',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setState(s => {
      s.options?.onClose?.();
      return { ...s, open: false };
    });
  }, []);

  const notify = useCallback((type: NotificationType, message: string, title?: string, options?: NotifyOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({
      open: true,
      type,
      title: title || defaultTitles[type],
      message,
      options,
    });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (state.open && state.options?.autoClose) {
      timerRef.current = setTimeout(close, state.options.autoClose);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state.open, state.options, close]);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) close(); }}>
        <AlertDialogContent className="max-w-sm animate-scale-in">
          <AlertDialogHeader className="items-center text-center">
            <div className="animate-fade-in">{icons[state.type]}</div>
            <AlertDialogTitle className="mt-2 animate-fade-in">{state.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center animate-fade-in">
              {state.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction className="min-w-[100px] gap-2" onClick={close}>
              <CheckCircle className="h-4 w-4" /> OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
