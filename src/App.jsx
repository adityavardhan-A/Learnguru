import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppRouter } from './routes/AppRouter';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <LanguageProvider>
          <AppProvider>
            <AppRouter />
          </AppProvider>
        </LanguageProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
