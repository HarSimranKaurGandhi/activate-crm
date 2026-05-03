import { RouterProvider } from 'react-router';
import { router } from './routes';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <DndProvider backend={HTML5Backend}>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </DndProvider>
      </DataProvider>
    </AuthProvider>
  );
}
