import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { registerForPushNotifications, addNotificationReceivedListener, addNotificationResponseListener } from '../services/notifications';
import { navigate } from '../navigation/navigationRef';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      // Registra para push notifications quando usuário loga
      if (user) {
        await registerForPushNotifications(user.uid);
      }
    });

    // Listener para notificações recebidas (app em foreground)
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('Notificação recebida:', notification);
    });

    // Listener para quando usuário clica na notificação
    responseListener.current = addNotificationResponseListener((response) => {
      console.log('Usuário clicou na notificação:', response);

      // Navega para o produto quando clicar na notificação
      const data = response.notification.request.content.data;
      if (data?.productId) {
        navigate('ProductDetail', { productId: data.productId as string });
      }
    });

    return () => {
      unsubscribe();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
