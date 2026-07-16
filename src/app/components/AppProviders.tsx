import { Outlet } from 'react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { DataProvider } from '../context/DataContext';
import { AuthProvider } from '../auth/AuthContext';

export const AppProviders = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <DndProvider backend={HTML5Backend}>
          <Outlet />
          <Toaster position="top-right" />
        </DndProvider>
      </DataProvider>
    </AuthProvider>
  );
};
