import React, { useState, useEffect } from 'react';
import { NotesProvider } from './context/NotesContext';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import LoadingSpinner from './components/LoadingSpinner';
import { useNotes } from './context/NotesContext';

const AppContent = () => {
  const { loading } = useNotes();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-container">
      {isMobile && (
        <button 
          className="mobile-menu-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      )}
      <Sidebar 
        isOpen={isMobile ? sidebarOpen : true} 
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />
      <MainContent />
      {loading && <LoadingSpinner />}
      {isMobile && sidebarOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <NotesProvider>
      <AppContent />
    </NotesProvider>
  );
};

export default App;
