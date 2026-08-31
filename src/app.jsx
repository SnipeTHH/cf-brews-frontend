import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PageContent from './components/PageContent';

export default function App() {
  const [currentPage, setCurrentPage] = useState('Home');
  const [apiStatus, setApiStatus] = useState('checking');
  const [assistantTab, setAssistantTab] = useState('chat');

  // --- 1. INITIAL HEALTH CHECK (Runs once on mount) ---
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`/health.cfm`);
        if (response.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (error) {
        console.error('API health check failed:', error);
        setApiStatus('offline');
      }
    };
    checkApiStatus();
  }, []);

  // --- 2. NEW: GLOBAL OFFLINE LISTENER ---
  // This listens for the 'api-offline' event dispatched by fetchWithRetry
  // in apiUtils.js whenever a background API call fails repeatedly.
  useEffect(() => {
    const handleOfflineEvent = () => {
      console.warn('Global fetch failure detected. Setting app to offline.');
      setApiStatus('offline');
    };

    window.addEventListener('api-offline', handleOfflineEvent);

    // Cleanup listener when App unmounts
    return () => {
      window.removeEventListener('api-offline', handleOfflineEvent);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 font-sans">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        apiStatus={apiStatus} 
      />
      <main className="flex-1 overflow-y-auto p-8">
        <PageContent 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          assistantTab={assistantTab}
          setAssistantTab={setAssistantTab}
          apiStatus={apiStatus} 
        />
      </main>
    </div>
  );
}