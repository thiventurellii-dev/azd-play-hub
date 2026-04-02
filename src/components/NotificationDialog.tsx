import { useState, createContext, useContext, useCallback, ReactNode } from 'react';
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

interface NotificationState {
  open: boolean;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  notify: (type: NotificationType, message: string, title?: string) => void;
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

  const notify = useCallback((type: NotificationType, message: string, title?: string) => {
    setState({
      open: true,
      type,
      title: title || defaultTitles[type],
      message,
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(open) => setState(s => ({ ...s, open }))}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="items-center text-center">
            {icons[state.type]}
            <AlertDialogTitle className="mt-2">{state.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {state.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction className="min-w-[100px]">OK</AlertDialogAction>
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
