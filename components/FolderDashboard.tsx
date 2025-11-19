import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Folder, BudgetMonth, TransactionType, SectionId } from '../types';
import { Folder as FolderIcon, FileSpreadsheet, Plus, ChevronRight, Home, CheckCircle2, X, MoreVertical, Edit, Trash2, Palette, FilePlus, FolderPlus, Copy, AlertTriangle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { createNewMonth, createBlankMonth } from '../services/storageService';

interface FolderDashboardProps {
    folders: Folder[];
    months: BudgetMonth[];
    onUpdateFolders: (folders: Folder[]) => void;
    onUpdateMonths: (months: BudgetMonth[]) => void;
    onOpenMonth: (monthId: string) => void;
}

// Format Helper
const formatGBP = (val: number) => `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Draggable Sheet Icon
const DraggableSheet = ({ 
    month, 
    isSelected, 
    onClick, 
    onContextMenu,
    onHover,
    onLeave
}: { 
    month: BudgetMonth, 
    isSelected: boolean, 
    onClick: (e: React.MouseEvent) => void, 
    onContextMenu: (e: React.MouseEvent) => void,
    onHover: () => void,
    onLeave: () => void
}) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `sheet_${month.id}`,
        data: { type: 'sheet', id: month.id }
    });

    return (
        <div 
            ref={setNodeRef} 
            {...attributes} 
            {...listeners}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            className={`
                group flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 w-32 relative
                ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-slate-200/50'}
                ${isDragging ? 'opacity-30' : 'opacity-100'}
            `}
        >
            <div className="relative pointer-events-none">
                <div className={`w-16 h-20 bg-white border rounded-lg shadow-sm flex items-center justify-center mb-2 ${isSelected ? 'border-blue-300' : 'border-slate-200'}`}>
                    <FileSpreadsheet className={`${isSelected ? 'text-blue-500' : 'text-emerald-600'}`} size={32} />
                </div>
                {isSelected && <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-0.5"><CheckCircle2 size={12} /></div>}
            </div>
            <span className={`text-xs font-medium text-center truncate w-full px-1 ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>
                {month.name}
            </span>
        </div>
    );
};

// Droppable Folder Icon
const DroppableFolder = ({ folder, onDoubleClick, isSelected, onClick, onContextMenu }: { folder: Folder, onDoubleClick: () => void, isSelected: boolean, onClick: (e: React.MouseEvent) => void, onContextMenu: (e: React.MouseEvent) => void }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `folder_${folder.id}`,
        data: { type: 'folder', id: folder.id }
    });

    // Determine color style
    let colorClass = "text-blue-400";
    let bgClass = "";
    if (folder.color) {
         if(folder.color === 'red') colorClass = "text-red-500";
         if(folder.color === 'green') colorClass = "text-emerald-500";
         if(folder.color === 'purple') colorClass = "text-purple-500";
         if(folder.color === 'orange') colorClass = "text-orange-500";
         if(folder.color === 'pink') colorClass = "text-pink-500";
         if(folder.color === 'gray') colorClass = "text-slate-500";
    }

    return (
        <div 
            ref={setNodeRef}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            className={`
                flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 w-32 relative
                ${isOver ? 'bg-blue-100 scale-110 ring-2 ring-blue-400' : ''}
                ${isSelected && !isOver ? 'bg-slate-200 ring-2 ring-slate-400' : 'hover:bg-slate-200/50'}
            `}
        >
             <div className="relative pointer-events-none">
                <FolderIcon 
                    className={`${isOver || isSelected ? 'text-blue-500' : colorClass} drop-shadow-sm transition-colors`} 
                    size={64} 
                    fill="currentColor" 
                    fillOpacity={0.2}
                />
            </div>
            <span className={`text-xs font-medium text-center truncate w-full px-1 mt-2 ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                {folder.name}
            </span>
        </div>
    );
};


const FolderDashboard: React.FC<FolderDashboardProps> = ({ folders, months, onUpdateFolders, onUpdateMonths, onOpenMonth }) => {
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [selection, setSelection] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    
    // Hover Preview State
    const [hoveredMonthId, setHoveredMonthId] = useState<string | null>(null);
    
    // Modal State
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showColorModal, setShowColorModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    const [inputText, setInputText] = useState("");
    const [targetId, setTargetId] = useState<string | null>(null); // For rename/color context
    const [targetType, setTargetType] = useState<'folder'|'sheet'|null>(null);
    
    // Delete State - supports multiple items
    const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, type: 'empty' | 'folder' | 'sheet', id?: string } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Filter Items for View
    const visibleFolders = folders.filter(f => f.parentId === currentFolderId);
    const visibleMonths = months.filter(m => m.folderId === currentFolderId);

    // -- Drag & Drop Sensors --
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

    // -- Handlers --

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu]);

    const handleContextMenu = (e: React.MouseEvent, type: 'empty' | 'folder' | 'sheet', id?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            type,
            id
        });
        // Auto-select item on right click if not already selected
        if (id && !selection.includes(id)) {
            setSelection([id]);
        }
    };

    const handleItemClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (contextMenu) setContextMenu(null);
        
        if (e.ctrlKey || e.metaKey) {
            setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelection([id]);
        }
    };

    const handleBackgroundClick = () => {
        setSelection([]);
        setContextMenu(null);
    };

    const handleDragStart = () => {
        setDragActive(true);
        setContextMenu(null);
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setDragActive(false);
        const { active, over } = event;
        
        if (!over) return;

        const activeType = active.data.current?.type;
        const activeId = active.data.current?.id;
        const overType = over.data.current?.type;
        const overId = over.data.current?.id;

        // Logic: Dropping Sheets into a Folder
        if (activeType === 'sheet' && overType === 'folder') {
            const targetFolderId = overId;

            let itemsToMove = [activeId];
            if (selection.includes(activeId)) {
                itemsToMove = [...new Set([...selection, activeId])];
            }

            const updatedMonths = months.map(m => {
                if (itemsToMove.includes(m.id)) {
                    return { ...m, folderId: targetFolderId };
                }
                return m;
            });

            onUpdateMonths(updatedMonths);
            setSelection([]);
        }
    };

    // -- Calculations for Preview --
    const getMonthSummary = (month: BudgetMonth) => {
        let income = 0;
        let expenses = 0;

        // 1. Sum Transactions
        month.transactions.forEach(t => {
            const isStandard = Object.values(TransactionType).includes(t.type as TransactionType);
            let isIncome = false;
            let isExpense = false;

            if (t.type === TransactionType.INCOMING) {
                isIncome = true;
            } else if (isStandard) {
                isExpense = true;
            } else {
                // Custom Type Logic
                const style = month.sectionStyles[t.type];
                if (style?.type === 'income') isIncome = true;
                else isExpense = true;
            }

            if (isIncome) income += t.amount;
            if (isExpense) expenses += t.amount;
        });

        // 2. Sum Sliders (assuming all sliders are expenses for now, per dashboard logic)
        Object.values(month.sliders).forEach(group => {
            group.forEach(s => expenses += s.value);
        });

        return { income, expenses, remaining: income - expenses };
    };

    const previewSummary = useMemo(() => {
        if (!hoveredMonthId) return null;
        const month = months.find(m => m.id === hoveredMonthId);
        if (!month) return null;
        return { ...getMonthSummary(month), name: month.name };
    }, [hoveredMonthId, months]);


    // -- Actions --

    const createFolder = () => {
        if (!inputText.trim()) return;
        const newFolder: Folder = { id: uuidv4(), name: inputText.trim(), parentId: currentFolderId };
        onUpdateFolders([...folders, newFolder]);
        setInputText("");
        setShowNewFolderModal(false);
    };

    const createSheet = () => {
        const newSheet = createBlankMonth(currentFolderId);
        onUpdateMonths([...months, newSheet]);
        setContextMenu(null);
    };

    const renameItem = () => {
        if (!targetId || !inputText.trim()) return;

        if (targetType === 'folder') {
            onUpdateFolders(folders.map(f => f.id === targetId ? { ...f, name: inputText.trim() } : f));
        } else if (targetType === 'sheet') {
            onUpdateMonths(months.map(m => m.id === targetId ? { ...m, name: inputText.trim() } : m));
        }
        setShowRenameModal(false);
        setInputText("");
    };

    const initiateDelete = (id: string) => {
        // If the item right-clicked is part of the selection, delete the whole selection.
        // Otherwise, delete just that item.
        if (selection.includes(id)) {
            setItemsToDelete(selection);
        } else {
            setItemsToDelete([id]);
        }
        setShowDeleteModal(true);
        setContextMenu(null);
    };

    const confirmDelete = () => {
        if (itemsToDelete.length === 0) return;
        
        // Determine types
        const folderIdsToDelete = itemsToDelete.filter(id => folders.some(f => f.id === id));
        const sheetIdsToDelete = itemsToDelete.filter(id => months.some(m => m.id === id));

        // 1. Handle Folders: Move contents to current view (orphan safety) before deleting
        let nextMonths = months.map(m => {
            if (m.folderId && folderIdsToDelete.includes(m.folderId)) {
                return { ...m, folderId: currentFolderId };
            }
            return m;
        });

        // 2. Handle Sheets: Delete explicit sheet selections (overriding orphan safety if selected)
        if (sheetIdsToDelete.length > 0) {
            nextMonths = nextMonths.filter(m => !sheetIdsToDelete.includes(m.id));
        }

        // 3. Update State
        onUpdateMonths(nextMonths);
        onUpdateFolders(folders.filter(f => !folderIdsToDelete.includes(f.id)));
        
        setShowDeleteModal(false);
        setItemsToDelete([]);
        setSelection([]);
    };

    const duplicateSheet = (id: string) => {
        const source = months.find(m => m.id === id);
        if (source) {
            const newSheet = createNewMonth(source);
            newSheet.folderId = currentFolderId; // Ensure it stays in current view
            onUpdateMonths([...months, newSheet]);
        }
        setContextMenu(null);
    };

    const setFolderColor = (color: string) => {
        if (targetId) {
            onUpdateFolders(folders.map(f => f.id === targetId ? { ...f, color } : f));
        }
        setShowColorModal(false);
    };

    // -- Context Menu Actions Helpers --
    const triggerRename = () => {
        if (contextMenu?.id) {
            const id = contextMenu.id;
            setTargetId(id);
            setTargetType(contextMenu.type as 'folder' | 'sheet');
            // Pre-fill name
            const name = contextMenu.type === 'folder' 
                ? folders.find(f => f.id === id)?.name 
                : months.find(m => m.id === id)?.name;
            setInputText(name || "");
            setShowRenameModal(true);
            setContextMenu(null);
        }
    }

    const triggerColor = () => {
         if (contextMenu?.id) {
            setTargetId(contextMenu.id);
            setShowColorModal(true);
            setContextMenu(null);
         }
    }


    // Navigation Breadcrumbs
    const getBreadcrumbs = () => {
        const crumbs = [{ id: null, name: 'Home' }];
        if (currentFolderId) {
            const current = folders.find(f => f.id === currentFolderId);
            if (current) crumbs.push({ id: current.id, name: current.name });
        }
        return crumbs;
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div 
                className="flex flex-col h-full relative" 
                onClick={handleBackgroundClick} 
                onContextMenu={(e) => handleContextMenu(e, 'empty')}
            >
                {/* Toolbar */}
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        {getBreadcrumbs().map((crumb, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <ChevronRight size={14} className="text-slate-400" />}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setCurrentFolderId(crumb.id as string | null); }}
                                    className={`hover:bg-slate-100 px-2 py-1 rounded transition-colors flex items-center gap-1 ${index === 0 ? 'font-bold text-slate-800' : ''}`}
                                >
                                    {index === 0 && <Home size={14} />}
                                    {crumb.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowNewFolderModal(true); setInputText(""); }}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200"
                    >
                        <Plus size={16} /> New Folder
                    </button>
                </div>

                {/* Grid Area */}
                <div className="flex-1 p-6 bg-slate-50 overflow-y-auto pb-72"> {/* Significant padding to prevent content hiding behind static footer */}
                    <div className="flex flex-wrap content-start gap-2">
                        
                        {/* Render Folders */}
                        {visibleFolders.map(folder => (
                            <DroppableFolder 
                                key={folder.id} 
                                folder={folder} 
                                isSelected={selection.includes(folder.id)}
                                onClick={(e) => handleItemClick(e, folder.id)}
                                onDoubleClick={() => { setCurrentFolderId(folder.id); setSelection([]); }}
                                onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                            />
                        ))}

                        {/* Render Sheets */}
                        {visibleMonths.map(month => (
                            <div key={month.id} onDoubleClick={() => onOpenMonth(month.id)}>
                                <DraggableSheet 
                                    month={month} 
                                    isSelected={selection.includes(month.id)}
                                    onClick={(e) => handleItemClick(e, month.id)}
                                    onContextMenu={(e) => handleContextMenu(e, 'sheet', month.id)}
                                    onHover={() => setHoveredMonthId(month.id)}
                                    onLeave={() => setHoveredMonthId(null)}
                                />
                            </div>
                        ))}

                        {visibleFolders.length === 0 && visibleMonths.length === 0 && (
                             <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 pointer-events-none select-none">
                                <div className="bg-slate-100 p-4 rounded-full mb-3"><FolderIcon size={32} className="opacity-50" /></div>
                                <p>This folder is empty</p>
                                <p className="text-xs mt-1 opacity-70">Right click to create new items</p>
                             </div>
                        )}
                    </div>
                </div>

                {/* --- STATIC PREVIEW SUMMARY FOOTER --- */}
                {/* Always rendered, content depends on hover state. Fixed height prevents layout shifts. */}
                <div className="bg-white border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] h-64 shrink-0 z-20">
                    <div className="max-w-5xl mx-auto px-8 py-6 h-full flex flex-col justify-center">
                        {previewSummary ? (
                            <div className="flex flex-col gap-4 animate-fade-in">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sheet Preview</div>
                                        <h2 className="text-2xl font-bold text-slate-800">{previewSummary.name}</h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp size={16} className="text-emerald-600"/>
                                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Incoming</span>
                                        </div>
                                        <div className="text-2xl font-bold text-emerald-800">{formatGBP(previewSummary.income)}</div>
                                    </div>

                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingDown size={16} className="text-red-600"/>
                                            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Outgoing</span>
                                        </div>
                                        <div className="text-2xl font-bold text-red-800">{formatGBP(previewSummary.expenses)}</div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Wallet size={16} className="text-blue-600"/>
                                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Remaining</span>
                                        </div>
                                        <div className="text-2xl font-bold text-blue-800">{formatGBP(previewSummary.remaining)}</div>
                                    </div>
                                </div>

                                {/* Bar Visualizer */}
                                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                                    {previewSummary.income > 0 && (
                                        <>
                                            <div 
                                                className="h-full bg-emerald-500" 
                                                style={{ width: '50%' }} 
                                            />
                                            <div 
                                                className="h-full bg-red-500" 
                                                style={{ width: `${(previewSummary.expenses / previewSummary.income) * 50}%` }} 
                                            />
                                            <div 
                                                className="h-full bg-blue-500" 
                                                style={{ width: `${(Math.max(0, previewSummary.remaining) / previewSummary.income) * 50}%` }} 
                                            />
                                        </>
                                    )}
                                    {previewSummary.income === 0 && (
                                        <div className="w-full h-full bg-slate-200"></div>
                                    )}
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 px-1">
                                    <span>Income (100%)</span>
                                    <span>Outgoing + Remaining</span>
                                </div>
                            </div>
                        ) : (
                           <div className="h-full flex flex-col items-center justify-center text-slate-300">
                               <FileSpreadsheet size={48} className="mb-2 opacity-20" />
                               <p className="text-sm font-medium">Hover over a sheet to see preview</p>
                           </div> 
                        )}
                    </div>
                </div>

            </div>
            
            <DragOverlay>
                {dragActive ? (
                    <div className="w-32 h-32 bg-white/80 backdrop-blur-sm border-2 border-blue-500 rounded-xl shadow-2xl flex items-center justify-center">
                        <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            Moving {selection.length || 1} items...
                        </div>
                    </div>
                ) : null}
            </DragOverlay>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    ref={contextMenuRef}
                    className="fixed z-50 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl py-1 min-w-[180px] animate-fade-in origin-top-left"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.type === 'empty' && (
                        <>
                            <button onClick={() => { setShowNewFolderModal(true); setInputText(""); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><FolderPlus size={16} /> New Folder</button>
                            <button onClick={createSheet} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><FilePlus size={16} /> New Sheet</button>
                        </>
                    )}
                     {contextMenu.type === 'folder' && (
                        <>
                            <button onClick={triggerRename} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><Edit size={16} /> Rename</button>
                            <button onClick={triggerColor} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><Palette size={16} /> Change Colour</button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => initiateDelete(contextMenu.id!)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-500 hover:text-white text-red-500 flex items-center gap-2 transition-colors"><Trash2 size={16} /> Delete</button>
                        </>
                    )}
                    {contextMenu.type === 'sheet' && (
                        <>
                            <button onClick={() => { onOpenMonth(contextMenu.id!); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} /> Open</button>
                            <button onClick={triggerRename} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><Edit size={16} /> Rename</button>
                            <button onClick={() => duplicateSheet(contextMenu.id!)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"><Copy size={16} /> Duplicate</button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => initiateDelete(contextMenu.id!)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-500 hover:text-white text-red-500 flex items-center gap-2 transition-colors"><Trash2 size={16} /> Delete</button>
                        </>
                    )}
                </div>
            )}

            {/* Modals */}
            {(showNewFolderModal || showRenameModal) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{showRenameModal ? 'Rename Item' : 'Create New Folder'}</h3>
                            <button onClick={() => { setShowNewFolderModal(false); setShowRenameModal(false); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Name</label>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder={showRenameModal ? "Enter name" : "e.g. 2025"}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (showRenameModal ? renameItem() : createFolder())}
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold text-lg mb-6"
                            />
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { setShowNewFolderModal(false); setShowRenameModal(false); }}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={showRenameModal ? renameItem : createFolder}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
                                >
                                    {showRenameModal ? 'Save' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 text-center">
                             <div className="bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                             </div>
                             <h3 className="font-bold text-slate-800 text-lg mb-2">Are you sure?</h3>
                             <p className="text-slate-500 text-sm mb-6">
                                 Do you really want to delete {itemsToDelete.length > 1 ? `these ${itemsToDelete.length} items` : 'this item'}? This action cannot be undone.
                             </p>
                             
                             <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200">Delete</button>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Color Picker Modal */}
            {showColorModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={(e) => e.stopPropagation()}>
                         <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Select Color</h3>
                            <button onClick={() => setShowColorModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="p-6 grid grid-cols-3 gap-4">
                            {['blue', 'red', 'green', 'purple', 'orange', 'gray'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setFolderColor(c)}
                                    className={`h-12 rounded-xl bg-${c === 'gray' ? 'slate' : c === 'green' ? 'emerald' : c}-500 hover:scale-105 transition-transform shadow-sm ring-offset-2 hover:ring-2 ring-${c}-500`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </DndContext>
    );
};

export default FolderDashboard;