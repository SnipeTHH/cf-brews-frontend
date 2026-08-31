import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Beaker,
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Flame,
  HardHat,
  LayoutDashboard,
  Thermometer,
  Warehouse,
  Server, 
  BookTemplate, 
  Home, 
  Search,
  Network,
} from 'lucide-react';
import SidebarItem from './SidebarItem';
import { fetchWithRetry } from '../apiUtils'; // --- UPDATED: Import fetch utility ---

function Sidebar({ currentPage, setCurrentPage, apiStatus }) {
  const [opsOpen, setOpsOpen] = useState(true);
  // --- NEW: State for system info ---
  const [systemInfo, setSystemInfo] = useState(null);

  const pages = [
    { name: 'Home', icon: Home },
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Predictive AI', icon: BrainCircuit },
    { name: 'Semantic Search', icon: Search },
    { name: 'Customer 360', icon: Network },
    { name: 'Brewery Assistant', icon: Bot },
  ];

  const opsPages = [
    { name: 'Batches', icon: Beaker },
    { name: 'Recipes', icon: BookTemplate },
    { name: 'Vats & Sensors', icon: Thermometer },
    { name: 'Inventory', icon: Warehouse },
  ];

  // --- NEW: Fetch system info on mount ---
  useEffect(() => {
    const fetchSystemInfo = async () => {
      // Only fetch if we are online to avoid console errors during offline demos
      if (apiStatus === 'offline') return;

      try {
        // We use a very short timeout/retry here because this info isn't critical
        // If it fails once, just skip it.
        const data = await fetchWithRetry('/api/v1/system/info.cfm', {}, 1, 1000);
        if (data.success) {
          setSystemInfo(data.info);
        }
      } catch (e) {
        console.warn("Could not fetch system info", e);
      }
    };

    fetchSystemInfo();
  }, [apiStatus]);

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-gray-200">
      <div className="flex h-16 flex-shrink-0 items-center justify-between px-6">
        <div className="flex items-center">
          <Flame className="mr-3 h-8 w-8 text-orange-500" />
          <span className="text-xl font-semibold">CF-Brews</span>
        </div>

        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            apiStatus === 'online'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {apiStatus === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {pages.map((page) => (
          <SidebarItem
            key={page.name}
            icon={page.icon}
            text={page.name}
            active={currentPage === page.name}
            onClick={() => setCurrentPage(page.name)}
          />
        ))}

        {/* --- Operations Dropdown --- */}
        <div className="pt-2">
          <button
            onClick={() => setOpsOpen(!opsOpen)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          >
            <span className="flex items-center">
              <HardHat className="mr-3 h-5 w-5" />
              Operations
            </span>
            {opsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {opsOpen && (
            <div className="mt-1 space-y-1 pl-4">
              {opsPages.map((page) => (
                <SidebarItem
                  key={page.name}
                  icon={page.icon}
                  text={page.name}
                  active={currentPage === page.name}
                  onClick={() => setCurrentPage(page.name)}
                  isSubItem={true}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* --- NEW: System Info Footer --- */}
      <div className="flex-shrink-0 bg-gray-950 p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
             <Server className="h-3 w-3 mr-2" />
             Server Environment
          </div>
          <button 
            onClick={() => setCurrentPage('Changelog')}
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
              currentPage === 'Changelog'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/50'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            }`}
          >
            Changelog
          </button>
        </div>
        {systemInfo ? (
          <div className="space-y-1 text-[10px] text-gray-600 font-mono">
            <p className="truncate" title={systemInfo.cf_version}>{systemInfo.cf_version}</p>
            <p className="truncate" title={systemInfo.os_version}>{systemInfo.os_version}</p>
          </div>
        ) : (
          <div className="text-[10px] text-gray-700 animate-pulse">
            Loading runtime info...
          </div>
        )}
      </div>

    </div>
  );
}

export default Sidebar;