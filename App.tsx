
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import FolderDashboard from './components/FolderDashboard';
import { BudgetMonth, Folder } from './types';
import { getStoredMonths, createNewMonth, saveMonths, getStoredFolders, saveFolders, updateMonth } from './services/storageService';
import { ChevronLeft, ChevronRight, Settings, Copy, Trash2, Save, X, AlertTriangle, AlertCircle, Edit3, Grid, LayoutGrid } from 'lucide-react';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'sheet'>('dashboard');
  const [months, setMonths] = useState<BudgetMonth[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const [currentMonthId, setCurrentMonthId] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'menu' | 'confirm-delete' | 'error-delete' | 'duplicate' | 'rename'>('menu');
  const [tempName, setTempName] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  // Unsaved Changes State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedData, setUnsavedData] = useState<BudgetMonth | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    const storedMonths = getStoredMonths();
    const storedFolders = getStoredFolders();
    setMonths(storedMonths);
    setFolders(storedFolders);
  }, []);

  // Helpers
  const currentMonthIndex = currentMonthId ? months.findIndex(m => m.id === currentMonthId) : -1;
  const currentMonth = currentMonthIndex >= 0 ? months[currentMonthIndex] : null;

  // Sync temp name when settings opens or month changes
  useEffect(() => {
    if (currentMonth) {
        setTempName(currentMonth.name);
    }
  }, [currentMonth, showSettings]);

  // Handle updates from Dashboard
  const handleUpdateMonth = (updatedMonth: BudgetMonth) => {
    const newMonths = months.map(m => m.id === updatedMonth.id ? updatedMonth : m);
    setMonths(newMonths);
    // NOTE: We don't save to storage automatically here anymore if we rely on the "Save" button in dashboard
    // But Dashboard calls updateMonth service directly on "Save". 
    // This state update keeps the UI in sync.
  };

  const handleUnsavedChangesReport = (isDirty: boolean, currentData: BudgetMonth) => {
      setHasUnsavedChanges(isDirty);
      setUnsavedData(currentData);
  };
  
  const handleUpdateFolders = (newFolders: Folder[]) => {
      setFolders(newFolders);
      saveFolders(newFolders);
  };
  
  const handleUpdateMonthsList = (newMonths: BudgetMonth[]) => {
      setMonths(newMonths);
      saveMonths(newMonths);
  };

  // Navigation Interception
  const checkUnsavedChanges = (action: () => void) => {
      if (hasUnsavedChanges) {
          setPendingNavigation(() => action);
          setShowUnsavedModal(true);
      } else {
          action();
      }
  };

  const openMonth = (id: string) => {
      // No check needed when entering from dashboard as dashboard is never dirty in this context
      setCurrentMonthId(id);
      setViewMode('sheet');
      setHasUnsavedChanges(false); // Reset flag
  };
  
  const goToDashboard = () => {
      checkUnsavedChanges(() => {
        setViewMode('dashboard');
        setCurrentMonthId(null);
        setHasUnsavedChanges(false);
      });
  };

  const handlePrevMonth = () => {
      checkUnsavedChanges(() => {
        const idx = months.findIndex(m => m.id === currentMonthId);
        if (idx > 0) {
            setCurrentMonthId(months[idx - 1].id);
            setHasUnsavedChanges(false);
        }
      });
  };

  const handleNextMonth = () => {
      checkUnsavedChanges(() => {
        const idx = months.findIndex(m => m.id === currentMonthId);
        if (idx < months.length - 1) {
            setCurrentMonthId(months[idx + 1].id);
            setHasUnsavedChanges(false);
        }
      });
  };

  // Unsaved Modal Actions
  const handleSaveAndLeave = () => {
      if (unsavedData) {
          handleUpdateMonth(unsavedData);
          updateMonth(unsavedData); // Persist to storage
      }
      setShowUnsavedModal(false);
      setHasUnsavedChanges(false);
      if (pendingNavigation) pendingNavigation();
      setPendingNavigation(null);
  };

  const handleLeaveWithoutSaving = () => {
      setShowUnsavedModal(false);
      setHasUnsavedChanges(false);
      if (pendingNavigation) pendingNavigation();
      setPendingNavigation(null);
  };

  const handleCancelNavigation = () => {
      setShowUnsavedModal(false);
      setPendingNavigation(null);
  };


  // Triggered from Title Click or Menu
  const handleTitleClick = () => {
      if (!currentMonth) return;
      setTempName(currentMonth.name);
      setSettingsMode('rename');
      setShowSettings(true);
  };

  const handleRenameSave = () => {
    if (!tempName.trim() || !currentMonth) return;
    const updated = { ...currentMonth, name: tempName };
    handleUpdateMonth(updated);
    // We need to explicitly save here as this is App level state modification
    const newMonths = months.map(m => m.id === updated.id ? updated : m);
    saveMonths(newMonths);
    
    setShowSettings(false);
    setSettingsMode('menu');
  };

  const handleDuplicateClick = () => {
    if (currentMonth) {
        setDuplicateName(`${currentMonth.name} Copy`);
        setSettingsMode('duplicate');
    }
  };

  const executeDuplicate = () => {
    if (!duplicateName.trim() || !currentMonth) return;
    
    // If there are unsaved changes in current sheet, do we save them to the duplicate? 
    // Usually yes. Let's use the unsavedData if available, else currentMonth
    const sourceData = hasUnsavedChanges && unsavedData ? unsavedData : currentMonth;

    const newMonth = createNewMonth(sourceData);
    newMonth.name = duplicateName; 

    const newMonths = [...months, newMonth];
    setMonths(newMonths);
    saveMonths(newMonths);
    
    // If we duplicate, we usually switch to the new one. 
    // Check unsaved changes before switching? 
    // Actually, let's just save the current one too if we are duplicating it to be safe/consistent?
    // Or just switch. The user might want to stay.
    // Let's switch to new month.
    checkUnsavedChanges(() => {
        setCurrentMonthId(newMonth.id);
        setHasUnsavedChanges(false);
    });
    
    setShowSettings(false);
    setSettingsMode('menu');
  };

  const handleVerifyDelete = () => {
      if (months.length <= 1) {
          setSettingsMode('error-delete');
      } else {
          setSettingsMode('confirm-delete');
      }
  };

  const executeDelete = () => {
        if (!currentMonthId) return;
        const newMonths = months.filter(m => m.id !== currentMonthId);
        setMonths(newMonths);
        saveMonths(newMonths);
        
        // Go back to dashboard after delete (no need to check unsaved as we are deleting it)
        setViewMode('dashboard');
        setCurrentMonthId(null);
        setHasUnsavedChanges(false);
        
        setShowSettings(false);
        setSettingsMode('menu');
  };

  // --- RENDER FOLDER DASHBOARD ---
  if (viewMode === 'dashboard') {
      return (
          <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
             <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3 shadow-lg z-20">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-inner">
                    <LayoutGrid size={20} />
                </div>
                <span className="font-bold text-xl tracking-tight">BudgetMaster</span>
             </div>
             <div className="flex-1 overflow-hidden">
                <FolderDashboard 
                    folders={folders} 
                    months={months} 
                    onUpdateFolders={handleUpdateFolders}
                    onUpdateMonths={handleUpdateMonthsList}
                    onOpenMonth={openMonth}
                />
             </div>
          </div>
      )
  }

  // --- RENDER SHEET VIEW ---
  if (!currentMonth) return <div>Error: No month selected</div>;

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
                onClick={goToDashboard}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors border border-slate-700 group"
            >
                <LayoutGrid size={18} className="text-blue-400 group-hover:text-blue-300"/>
                <span className="font-bold text-sm">All Sheets</span>
            </button>
          </div>

          {/* Month Selector - Simplified for Single Month View */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 shadow-sm">
            <button 
                onClick={handlePrevMonth}
                disabled={currentMonthIndex === 0}
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-30 text-slate-400 hover:text-white transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            
            <span 
                onClick={handleTitleClick}
                className="px-4 font-semibold min-w-[160px] text-center text-sm sm:text-base cursor-pointer hover:text-blue-300 hover:bg-slate-700/50 rounded py-1 transition-all select-none flex items-center justify-center gap-2 group"
                title="Click to Rename"
            >
                {currentMonth.name}
                <Edit3 size={14} className="opacity-0 group-hover:opacity-50" />
            </span>

            <button 
                onClick={handleNextMonth}
                disabled={currentMonthIndex === months.length - 1}
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-30 text-slate-400 hover:text-white transition-colors"
            >
                <ChevronRight size={20} />
            </button>
          </div>

          <button 
            onClick={() => { setSettingsMode('menu'); setShowSettings(true); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all border border-slate-700"
          >
            <Settings size={18} />
            <span className="hidden sm:inline text-sm font-medium">Options</span>
          </button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <Dashboard 
        key={currentMonth.id} // Force re-render on month change to reset local state
        monthData={currentMonth} 
        onUpdate={handleUpdateMonth}
        onUnsavedChanges={handleUnsavedChangesReport}
      />

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center">
                  <div className="bg-amber-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-amber-500" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Unsaved Changes</h3>
                  <p className="text-slate-500 mb-6">
                      You have unsaved changes in this sheet. If you leave now, your changes will be lost.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleSaveAndLeave}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                      >
                          Save & Leave
                      </button>
                      <button 
                        onClick={handleLeaveWithoutSaving}
                        className="w-full bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-600 font-bold py-3 rounded-xl transition-colors"
                      >
                          Leave without Saving
                      </button>
                      <button 
                        onClick={handleCancelNavigation}
                        className="w-full text-slate-400 hover:text-slate-600 font-medium py-2 transition-colors text-sm"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Sheet Options Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Settings size={20} /> 
                        {settingsMode === 'menu' && 'Sheet Options'}
                        {settingsMode === 'rename' && 'Rename Sheet'}
                        {settingsMode === 'duplicate' && 'Duplicate Sheet'}
                        {settingsMode === 'confirm-delete' && 'Confirm Deletion'}
                        {settingsMode === 'error-delete' && 'Cannot Delete'}
                    </h3>
                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6">
                    {/* --- MENU MODE --- */}
                    {settingsMode === 'menu' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Quick Rename inside menu */}
                            <div className="pb-4 border-b border-slate-100">
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Current Sheet Name</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium text-sm"
                                    />
                                    <button 
                                        onClick={handleRenameSave}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-medium text-sm transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <button 
                                    onClick={handleDuplicateClick}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100 group"
                                >
                                    <span className="font-semibold flex items-center gap-2">
                                        <Copy size={18} /> Duplicate Month
                                    </span>
                                    <span className="text-xs bg-white px-2 py-1 rounded text-indigo-500 font-bold group-hover:text-indigo-600">Copy & Rename</span>
                                </button>

                                <button 
                                    onClick={handleVerifyDelete}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                                >
                                    <span className="font-semibold flex items-center gap-2">
                                        <Trash2 size={18} /> Delete Month
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- RENAME MODE --- */}
                    {settingsMode === 'rename' && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">New Sheet Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold text-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => { setSettingsMode('menu'); if(!showSettings) setShowSettings(false); }}
                                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleRenameSave}
                                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Update Name
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- DUPLICATE MODE --- */}
                    {settingsMode === 'duplicate' && (
                         <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Name for New Sheet</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={duplicateName}
                                    onChange={(e) => setDuplicateName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && executeDuplicate()}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-bold text-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setSettingsMode('menu')}
                                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeDuplicate}
                                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    Create Copy
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- ERROR DELETE --- */}
                    {settingsMode === 'error-delete' && (
                        <div className="text-center space-y-4 animate-fade-in">
                            <div className="flex justify-center text-amber-500 mb-2">
                                <AlertCircle size={48} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Action Not Allowed</h4>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    You cannot delete the only remaining budget sheet. Please create a new sheet before deleting this one.
                                </p>
                            </div>
                            <button 
                                onClick={() => setSettingsMode('menu')}
                                className="w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-colors mt-4"
                            >
                                Go Back
                            </button>
                        </div>
                    )}

                    {/* --- CONFIRM DELETE --- */}
                    {settingsMode === 'confirm-delete' && (
                         <div className="text-center space-y-4 animate-fade-in">
                            <div className="flex justify-center text-red-500 mb-2">
                                <AlertTriangle size={48} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Are you absolutely sure?</h4>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    You are about to delete <strong>{currentMonth ? currentMonth.name : 'this sheet'}</strong>. This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button 
                                    onClick={() => setSettingsMode('menu')}
                                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeDelete}
                                    className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
