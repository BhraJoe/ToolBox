import { Outlet, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import Header from './Header';
import { getToolByRoute, getCategoryById } from '../../data/tools';

function getPageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/settings') return 'Settings';

  // Check if it's a tool route
  const tool = getToolByRoute(pathname);
  if (tool) return tool.name;

  // Check if it's a category route
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const cat = getCategoryById(segments[0]);
    if (cat) return cat.name;
  }

  return 'ToolBox';
}

export default function Layout() {
  const { isCollapsed } = useSidebar();
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="app-layout">
      <Sidebar />
      <MobileSidebar />
      <div
        className={`app-main ${
          isCollapsed ? 'app-main--sidebar-collapsed' : 'app-main--sidebar-open'
        }`}
      >
        <Header title={title} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
