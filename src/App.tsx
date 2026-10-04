import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import AppRoutes from './routes/AppRoutes';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SidebarProvider>
          <AppRoutes />
        </SidebarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
