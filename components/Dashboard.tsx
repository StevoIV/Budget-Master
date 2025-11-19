import React, { useState, useEffect, useMemo } from 'react';
import { BudgetMonth, Transaction, TransactionType, PetrolData, VehicleDate, SectionId, BudgetLayout, SectionStyle, SliderItem, SectionVariant } from '../types';
import { updateMonth } from '../services/storageService';
import { Plus, Trash2, Calculator, Save, TrendingUp, Edit2, Check, X, GripHorizontal, Link as LinkIcon, Unlink, Settings, Layout, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronDown, ChevronUp, List, Sliders as SlidersIcon, FileText, Minus, Car } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// DnD Kit Imports
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardProps {
  monthData: BudgetMonth;
  onUpdate: (updated: BudgetMonth) => void;
  onUnsavedChanges?: (hasChanges: boolean, currentData: BudgetMonth) => void;
}

const formatGBP = (val: number) => `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// --- Shared Types for Props ---
interface WidgetProps {
  sectionId: string;
  data: BudgetMonth;
  style: SectionStyle;
  onUpdateStyle: (id: string, newStyle: Partial<SectionStyle>) => void;
  onDeleteSection?: (id: string) => void; 
  onUpdateTransaction: (id: string, field: keyof Transaction, value: any) => void;
  onAddTransaction: (type: TransactionType | string) => void;
  onRemoveTransaction: (id: string) => void;
  onUpdatePetrol: (field: keyof PetrolData, value: number) => void;
  onUpdateVehicle: (id: string, v: VehicleDate) => void;
  
  // New Generic Props
  onUpdateSliders: (sectionId: string, sliders: SliderItem[]) => void;
  onUpdateNotes: (sectionId: string, val: string) => void;

  // Vehicle Management Props
  onAddVehicle: () => void;
  onRemoveVehicle: (id: string) => void;

  linkedSpending: boolean;
  setLinkedSpending: (val: boolean) => void;
  
  // Organise Mode Props
  isOrganiseMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEnterOrganiseMode: (id: string) => void; 
  
  // Single Settings Enhancement
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
}

// Slider Colors Palette
const SLIDER_COLORS: Record<string, { label: string, input: string, dot: string }> = {
    lime: { label: 'bg-lime-100 text-lime-800', input: 'accent-lime-500', dot: 'bg-lime-500' },
    cyan: { label: 'bg-cyan-100 text-cyan-800', input: 'accent-cyan-500', dot: 'bg-cyan-500' },
    blue: { label: 'bg-blue-100 text-blue-800', input: 'accent-blue-500', dot: 'bg-blue-500' },
    emerald: { label: 'bg-emerald-100 text-emerald-800', input: 'accent-emerald-500', dot: 'bg-emerald-500' },
    purple: { label: 'bg-purple-100 text-purple-800', input: 'accent-purple-500', dot: 'bg-purple-500' },
    orange: { label: 'bg-orange-100 text-orange-800', input: 'accent-orange-500', dot: 'bg-orange-500' },
    pink: { label: 'bg-pink-100 text-pink-800', input: 'accent-pink-500', dot: 'bg-pink-500' },
    red: { label: 'bg-red-100 text-red-800', input: 'accent-red-500', dot: 'bg-red-500' },
};

const DEFAULT_SLIDER_COLOR = 'lime';

// --- Helper Components ---

interface SortableRowProps {
  t: Transaction;
  updateTransaction: (id: string, field: keyof Transaction, value: any) => void;
  removeTransaction: (id: string) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ t, updateTransaction, removeTransaction }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    };

    // Local state for amount input
    const [amountStr, setAmountStr] = useState(t.amount.toFixed(2));

    useEffect(() => {
      if (Math.abs(parseFloat(amountStr) - t.amount) > 0.001) {
        setAmountStr(t.amount.toFixed(2));
      }
    }, [t.amount]);

    const handleAmountBlur = () => {
      const val = parseFloat(amountStr);
      if (!isNaN(val)) {
        setAmountStr(val.toFixed(2));
        updateTransaction(t.id, 'amount', val);
      } else {
        setAmountStr(t.amount.toFixed(2));
      }
    };

    return (
        <tr ref={setNodeRef} style={style} className={`group border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors align-top ${isDragging ? 'bg-blue-50' : ''}`}>
            <td className="py-2 pl-2 w-8 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 touch-none opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
                 <GripHorizontal size={16} />
            </td>
            <td className="py-2 pl-1 w-full">
            <input 
                className="w-full min-w-0 bg-transparent focus:outline-none focus:border-b-2 border-blue-400 text-slate-700 font-medium truncate focus:overflow-visible focus:text-clip"
                value={t.name}
                onChange={(e) => updateTransaction(t.id, 'name', e.target.value)}
                placeholder="Item Name"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            />
            </td>
            <td className="py-2 px-2 whitespace-nowrap">
            <div className="flex items-center">
                <span className="text-slate-400 mr-1">£</span>
                <input 
                type="text"
                inputMode="decimal"
                className="w-20 text-right bg-transparent focus:outline-none focus:border-b-2 border-blue-400 text-slate-700 font-mono"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onBlur={handleAmountBlur}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />
            </div>
            </td>
            <td className="py-2 w-6 text-center">
            <button onClick={() => removeTransaction(t.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
            </button>
            </td>
        </tr>
    )
};

interface SectionWrapperProps {
    id: string;
    styleConfig: SectionStyle;
    onUpdateStyle: (id: string, newStyle: Partial<SectionStyle>) => void;
    onDelete?: () => void;
    children: React.ReactNode;
    isOrganiseMode: boolean;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onEnterOrganiseMode: (id: string) => void;
    isSettingsOpen: boolean;
    onToggleSettings: () => void;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({ 
    id, styleConfig, onUpdateStyle, onDelete, children, 
    isOrganiseMode, isSelected, onSelect, onEnterOrganiseMode, isSettingsOpen, onToggleSettings 
}) => {
    const [tempTitle, setTempTitle] = useState(styleConfig.title);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const colors = [
        "bg-slate-800", "bg-red-700", "bg-red-800", "bg-red-900", 
        "bg-orange-700", "bg-emerald-600", "bg-blue-600", "bg-purple-800", "bg-indigo-800", "bg-teal-700", "bg-pink-700", "bg-gray-600"
    ];

    useEffect(() => {
        if (isSettingsOpen) {
            setTempTitle(styleConfig.title);
        } else {
            setShowDeleteConfirm(false);
        }
    }, [isSettingsOpen, styleConfig.title]);

    const handleSaveSettings = () => {
        onUpdateStyle(id, { title: tempTitle });
        onToggleSettings(); 
        setShowDeleteConfirm(false);
    };
    
    const confirmDelete = () => {
        if (onDelete) onDelete();
    }

    return (
        <div 
            onClick={() => isOrganiseMode && onSelect(id)}
            className={`
                mb-6 relative flex flex-col rounded-xl transition-all duration-200
                ${isOrganiseMode ? 'cursor-pointer select-none' : ''}
                ${isSelected && isOrganiseMode ? 'ring-4 ring-blue-400 ring-offset-2 scale-[1.02] shadow-2xl z-20' : ''}
                ${!isSelected && isOrganiseMode ? 'opacity-60 hover:opacity-100 hover:scale-[1.01]' : ''}
            `}
        >
             {isOrganiseMode && <div className="absolute inset-0 z-30 bg-transparent" />}

             {!isOrganiseMode && (
                 <div className="absolute top-3 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100">
                    <button 
                        onClick={onToggleSettings}
                        className={`p-1 hover:bg-white hover:text-blue-600 rounded shadow-sm backdrop-blur-sm border border-slate-200 ${isSettingsOpen ? 'bg-white text-blue-600' : 'bg-white/90 text-slate-400'}`}
                        title="Section Settings"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Settings size={14} />
                    </button>
                 </div>
             )}

            {isSettingsOpen && !isOrganiseMode && (
                <div className="absolute right-0 top-8 z-50 bg-white p-3 rounded-lg shadow-xl border border-slate-200 w-64 animate-fade-in cursor-auto" onPointerDown={(e) => e.stopPropagation()}>
                    {!showDeleteConfirm ? (
                        <>
                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Section Settings</h4>
                            <div className="mb-3">
                                <label className="text-xs text-slate-400 block mb-1">Title</label>
                                <input 
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="text-xs text-slate-400 block mb-1">Header Color</label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {colors.map(c => (
                                        <button 
                                            key={c}
                                            className={`w-6 h-6 rounded-full ${c} ${styleConfig.colorClass === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                            onClick={() => onUpdateStyle(id, { colorClass: c })}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-100">
                                {onDelete && (
                                    <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                        <Trash2 size={12} /> Delete
                                    </button>
                                )}
                                <div className="flex gap-2 ml-auto">
                                    <button onClick={onToggleSettings} className="px-2 py-1 text-xs text-slate-500">Cancel</button>
                                    <button onClick={handleSaveSettings} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Save</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-2">
                            <div className="text-red-600 mb-2 flex justify-center"><Trash2 size={24} /></div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">Delete Section?</h4>
                            <p className="text-xs text-slate-500 mb-3">All items in this section will be permanently removed.</p>
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">Cancel</button>
                                <button onClick={confirmDelete} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">Yes, Delete</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={`flex-1 flex flex-col relative group ${isOrganiseMode ? 'pointer-events-none' : ''}`}>{children}</div>
        </div>
    );
};

const DroppableTransactionList: React.FC<{ id: string, items: any[], children?: React.ReactNode }> = ({ id, items, children }) => {
    const { setNodeRef } = useDroppable({ id });
    return <div ref={setNodeRef} className="h-full flex flex-col">{children}</div>
}


// --- Sub-Components ---

const TransactionTable: React.FC<WidgetProps & { type: TransactionType | string }> = (props) => {
    const { sectionId, type, data, style, onAddTransaction, onUpdateTransaction, onRemoveTransaction, onEnterOrganiseMode } = props;
    const items = data.transactions.filter(t => t.type === type);
    const subTotal = items.reduce((acc, t) => acc + t.amount, 0);
    const droppableId = type;

    return (
      <SectionWrapper id={sectionId} styleConfig={style} onDelete={props.onDeleteSection ? () => props.onDeleteSection!(sectionId) : undefined} {...props}>
      <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full w-full">
            <div 
                className={`px-4 py-3 ${style.colorClass} text-white flex justify-between items-center cursor-pointer select-none`}
                onDoubleClick={() => onEnterOrganiseMode(sectionId)}
                title="Double Click to Organise"
            >
              <h3 className="font-bold text-sm uppercase tracking-wide truncate pr-2">{style.title}</h3>
              <span className="font-mono font-bold whitespace-nowrap">{formatGBP(subTotal)}</span>
            </div>
            <div className="p-2 flex-grow min-h-[50px]">
                 <DroppableTransactionList id={droppableId} items={items}>
                    <table className="w-full text-sm">
                        <tbody>
                        {items.map(t => (
                            <SortableRow key={t.id} t={t} updateTransaction={onUpdateTransaction} removeTransaction={onRemoveTransaction} />
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan={4} className="text-center text-slate-400 py-4 text-xs italic">Drag items here or add new</td></tr>
                        )}
                        </tbody>
                    </table>
                 </DroppableTransactionList>
            </div>
            <div className="p-2 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => onAddTransaction(type)}
                className="w-full py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded flex items-center justify-center gap-1 transition-colors pointer-events-auto"
              >
                <Plus size={12} /> ADD ITEM
              </button>
            </div>
          </div>
      </SortableContext>
      </SectionWrapper>
    );
};

const SliderWidget: React.FC<WidgetProps> = (props) => {
    const { sectionId, data, style, onUpdateSliders, linkedSpending, setLinkedSpending, onEnterOrganiseMode } = props;
    const sliders = data.sliders[sectionId] || [];
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null);

    const updateSliderValue = (sliderId: string, val: number) => {
        let newSliders = sliders.map(s => s.id === sliderId ? { ...s, value: val } : s);
        
        if (linkedSpending) {
            if (sliders.length === 2) {
                const otherId = sliders.find(s => s.id !== sliderId)?.id;
                if (otherId) {
                    newSliders = newSliders.map(s => s.id === otherId ? { ...s, value: val } : s);
                }
            }
        }
        onUpdateSliders(sectionId, newSliders);
    };

    const updateSliderName = (sliderId: string, name: string) => {
        onUpdateSliders(sectionId, sliders.map(s => s.id === sliderId ? { ...s, name } : s));
    };

    const updateSliderColor = (sliderId: string, color: string) => {
        onUpdateSliders(sectionId, sliders.map(s => s.id === sliderId ? { ...s, color } : s));
        setOpenColorPickerId(null);
    };

    const addSlider = () => {
        onUpdateSliders(sectionId, [...sliders, { id: uuidv4(), name: "New Slider", value: 0, max: 2000, color: 'lime' }]);
    };

    const removeSlider = (sliderId: string) => {
        onUpdateSliders(sectionId, sliders.filter(s => s.id !== sliderId));
    };

    return (
    <SectionWrapper id={sectionId} styleConfig={style} onDelete={props.onDeleteSection ? () => props.onDeleteSection!(sectionId) : undefined} {...props}>
        <div 
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative"
            onClick={() => setOpenColorPickerId(null)} // Close picker on background click
        >
            <div 
                className="flex justify-between items-center mb-4 cursor-pointer select-none"
                onDoubleClick={() => onEnterOrganiseMode(sectionId)}
            >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">{style.title}</h3>
                <div className="flex gap-1" onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
                     <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`p-1.5 rounded transition-colors pointer-events-auto ${isEditMode ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title="Edit Sliders"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        onClick={() => setLinkedSpending(!linkedSpending)}
                        className={`p-1.5 rounded transition-colors pointer-events-auto ${linkedSpending ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title={linkedSpending ? "Unlink values" : "Link values"}
                    >
                        {linkedSpending ? <LinkIcon size={14} /> : <Unlink size={14} />}
                    </button>
                </div>
            </div>
            <div className="space-y-6">
                {sliders.map((slider, index) => {
                     const colorKey = slider.color || (index % 2 === 0 ? 'lime' : 'cyan');
                     const colorStyles = SLIDER_COLORS[colorKey] || SLIDER_COLORS[DEFAULT_SLIDER_COLOR];
                     
                     return (
                        <div key={slider.id} className="relative">
                            <div className="flex justify-between mb-2 items-center">
                                {isEditMode ? (
                                    <div className="flex items-center gap-2 w-full mr-2 relative">
                                        <input 
                                            className="border rounded px-1 py-0.5 text-sm w-full"
                                            value={slider.name}
                                            onChange={(e) => updateSliderName(slider.id, e.target.value)}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        />
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenColorPickerId(openColorPickerId === slider.id ? null : slider.id); }} 
                                                className={`w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center ${colorStyles.dot} ring-1 ring-offset-1 ring-slate-200`}
                                            ></button>
                                            
                                            {/* Mini Color Picker Popover */}
                                            {openColorPickerId === slider.id && (
                                                <div className="absolute right-0 top-8 z-50 bg-white shadow-lg border rounded-lg p-2 grid grid-cols-4 gap-2 w-32" onPointerDown={e => e.stopPropagation()}>
                                                    {Object.keys(SLIDER_COLORS).map(c => (
                                                        <button 
                                                            key={c}
                                                            onClick={() => updateSliderColor(slider.id, c)}
                                                            className={`w-5 h-5 rounded-full ${SLIDER_COLORS[c].dot} hover:scale-110 transition-transform`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={() => removeSlider(slider.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                                    </div>
                                ) : (
                                    <label className="text-sm text-slate-600 font-medium">{slider.name}</label>
                                )}
                                <span className={`font-bold text-slate-800 px-2 py-0.5 rounded text-xs ${colorStyles.label}`}>{formatGBP(slider.value)}</span>
                            </div>
                            <input 
                                type="range" min="0" max={slider.max} step="10"
                                value={slider.value}
                                onChange={(e) => updateSliderValue(slider.id, parseFloat(e.target.value))}
                                onPointerDown={(e) => e.stopPropagation()}
                                className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer pointer-events-auto ${colorStyles.input}`}
                            />
                        </div>
                     );
                })}
                {isEditMode && (
                    <button onClick={addSlider} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-bold flex items-center justify-center gap-1">
                        <Plus size={14} /> Add Slider
                    </button>
                )}
            </div>
        </div>
    </SectionWrapper>
    );
};

const PetrolWidget: React.FC<WidgetProps> = (props) => {
    const { sectionId, data, style, onUpdatePetrol, onEnterOrganiseMode } = props;
    const { petrol } = data;
    const budget = petrol.fuelPrice * petrol.tankSizeLitres * petrol.refillsNeeded;
    const milesPerLitre = petrol.tankSizeLitres > 0 ? petrol.milesPerTank / petrol.tankSizeLitres : 0; 
    const costPerMile = petrol.milesPerTank > 0 ? (petrol.fuelPrice * petrol.tankSizeLitres) / petrol.milesPerTank : 0;
    const costPerEnteredMiles = costPerMile * petrol.enteredMiles;

    const [showDetails, setShowDetails] = useState(false);

    const handleUpdateMPL = (newMPL: number) => {
        const newMilesPerTank = newMPL * petrol.tankSizeLitres;
        onUpdatePetrol('milesPerTank', parseFloat(newMilesPerTank.toFixed(2)));
    };

    return (
      <SectionWrapper id={sectionId} styleConfig={style} onDelete={props.onDeleteSection ? () => props.onDeleteSection!(sectionId) : undefined} {...props}>
      <div className="bg-slate-800 text-white rounded-xl shadow-lg p-4 border border-slate-700 transition-all">
        <div 
            className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2 cursor-pointer select-none"
            onDoubleClick={() => onEnterOrganiseMode(sectionId)}
        >
          <Calculator className="text-yellow-400" size={20} />
          <h3 className="font-bold text-lg">{style.title}</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Price/Litre (£)</label>
            <input 
              type="number" step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-yellow-300 font-mono font-bold pointer-events-auto"
              value={petrol.fuelPrice}
              onChange={(e) => onUpdatePetrol('fuelPrice', parseFloat(e.target.value))}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Refills/Month</label>
            <input 
              type="number" 
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white font-mono font-bold pointer-events-auto"
              value={petrol.refillsNeeded}
              onChange={(e) => onUpdatePetrol('refillsNeeded', parseFloat(e.target.value))}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="bg-slate-700/50 rounded p-3 mb-4 text-center border border-slate-600">
           <div className="text-[10px] text-slate-400 uppercase tracking-wider">Estimated Budget</div>
           <div className="text-2xl font-bold text-yellow-400">{formatGBP(budget)}</div>
        </div>
        
        <div className="flex justify-center">
            <button 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-slate-300 transition-colors mb-2 pointer-events-auto"
            >
                {showDetails ? 'Hide Calculator' : 'Show Calculator'}
                {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
        </div>

        {showDetails && (
            <div className="animate-fade-in bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-slate-700 p-2 rounded border border-slate-600">
                        <div className="text-[10px] text-slate-400 mb-1">Tank (L)</div>
                        <input 
                            type="number" 
                            className="w-full bg-transparent text-center font-mono font-bold text-sm outline-none text-white pointer-events-auto" 
                            value={petrol.tankSizeLitres} 
                            onChange={(e) => onUpdatePetrol('tankSizeLitres', parseFloat(e.target.value))} 
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="bg-slate-700 p-2 rounded border border-slate-600">
                        <div className="text-[10px] text-slate-400 mb-1">Mi/Tank</div>
                        <input 
                            type="number" 
                            className="w-full bg-transparent text-center font-mono font-bold text-sm outline-none text-white pointer-events-auto" 
                            value={petrol.milesPerTank} 
                            onChange={(e) => onUpdatePetrol('milesPerTank', parseFloat(e.target.value))} 
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="bg-slate-700 p-2 rounded border border-slate-600">
                        <div className="text-[10px] text-slate-400 mb-1">MPL</div>
                        <input 
                            type="number"
                            step="0.1"
                            className="w-full bg-transparent text-center font-mono font-bold text-sm outline-none text-white pointer-events-auto"
                            value={milesPerLitre.toFixed(1)}
                            onChange={(e) => handleUpdateMPL(parseFloat(e.target.value))}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <div className="border-t border-slate-700 pt-4">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Trip Cost Calculator (Miles)</label>
                    <div className="flex gap-2">
                        <input 
                        type="number" 
                        className="w-1/3 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white font-mono pointer-events-auto"
                        value={petrol.enteredMiles}
                        onChange={(e) => onUpdatePetrol('enteredMiles', parseFloat(e.target.value))}
                        onPointerDown={(e) => e.stopPropagation()}
                        />
                        <div className="w-2/3 bg-yellow-500/20 border border-yellow-500/50 rounded flex items-center justify-center">
                            <span className="font-bold text-yellow-400">{formatGBP(costPerEnteredMiles)}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
      </SectionWrapper>
    );
};

const VehicleCard: React.FC<{ vehicle: VehicleDate, onSave: (v: VehicleDate) => void, onDelete: () => void }> = ({ vehicle, onSave, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editState, setEditState] = useState(vehicle);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const handleSaveVehicle = () => {
        onSave(editState);
        setIsEditing(false);
        setShowConfirmDelete(false);
    };
    
    const getDaysRemaining = (dateStr: string) => {
        const target = new Date(dateStr);
        const now = new Date();
        const diff = target.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };
    
    const StatusDisplay = ({ label, date }: { label: string, date: string }) => {
        const days = getDaysRemaining(date);
        const isUrgent = days < 30 && days > 0;
        const isOverdue = days < 0;
        let color = "text-emerald-600 bg-emerald-50";
        if (isUrgent) color = "text-amber-600 bg-amber-50";
        if (isOverdue) color = "text-red-600 bg-red-50";
        return (
            <div className={`flex justify-between items-center p-1.5 px-2 rounded ${color} text-xs mb-1`}>
                <div className="flex items-center gap-4">
                     <span className="font-medium w-16">{label}</span>
                     <span className="font-mono text-slate-600/80">{new Date(date).toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit'})}</span>
                </div>
                <span className="font-mono font-bold">({days > 0 ? '+' : ''}{days}d)</span>
            </div>
        )
    }

    if (isEditing) {
        return (
            <div className="bg-white rounded-xl border border-blue-300 p-3 shadow-md ring-2 ring-blue-100 break-inside-avoid mb-2 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-700 text-sm">Edit Vehicle</h4>
                    <div className="flex gap-1">
                            <button onClick={() => { setIsEditing(false); setShowConfirmDelete(false); }} className="p-1 text-slate-400 hover:text-slate-600" type="button"><X size={16}/></button>
                            <button onClick={handleSaveVehicle} className="p-1 text-blue-500 hover:text-blue-700" type="button"><Check size={16}/></button>
                    </div>
                </div>
                <div className="space-y-2 text-xs">
                    <div><label className="block text-slate-500 mb-0.5">Reg Plate</label><input className="w-full border rounded px-2 py-1 font-bold uppercase" value={editState.reg} onChange={e => setEditState({...editState, reg: e.target.value.toUpperCase()})} /></div>
                    <div><label className="block text-slate-500 mb-0.5">Insurer</label><input className="w-full border rounded px-2 py-1 uppercase" value={editState.insurer} onChange={e => setEditState({...editState, insurer: e.target.value.toUpperCase()})} /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-slate-500 mb-0.5">Insurance Expiry</label><input type="date" className="w-full border rounded px-1 py-1" value={editState.insuranceDate} onChange={e => setEditState({...editState, insuranceDate: e.target.value})} /></div>
                        <div><label className="block text-slate-500 mb-0.5">Tax Expiry</label><input type="date" className="w-full border rounded px-1 py-1" value={editState.taxDate} onChange={e => setEditState({...editState, taxDate: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-slate-500 mb-0.5">MOT Expiry</label><input type="date" className="w-full border rounded px-1 py-1" value={editState.motDate} onChange={e => setEditState({...editState, motDate: e.target.value})} /></div>
                        <div><label className="block text-slate-500 mb-0.5">Service Date</label><input type="date" className="w-full border rounded px-1 py-1" value={editState.serviceDate} onChange={e => setEditState({...editState, serviceDate: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-slate-500 mb-0.5">Policy Number</label><input className="w-full border rounded px-2 py-1 font-mono" value={editState.policyNumber} onChange={e => setEditState({...editState, policyNumber: e.target.value})} /></div>
                </div>
                <div className="flex justify-end mt-3 pt-2 border-t border-slate-100">
                    {!showConfirmDelete ? (
                        <button 
                            onClick={() => setShowConfirmDelete(true)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            type="button"
                        >
                            <Trash2 size={14} /> Delete Vehicle
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowConfirmDelete(false)}
                                className="text-xs text-slate-500 hover:bg-slate-100 px-2 py-1 rounded"
                                type="button"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => onDelete()}
                                className="text-xs bg-red-500 text-white hover:bg-red-600 px-2 py-1 rounded font-bold"
                                type="button"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm relative group break-inside-avoid hover:shadow-md transition-shadow mb-2 pointer-events-auto">
            <button onClick={() => setIsEditing(true)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all" type="button"><Edit2 size={14} /></button>
            <div className="flex flex-col mb-3">
                <div className="font-bold text-slate-800 text-lg uppercase">{vehicle.reg}</div>
                <div className="text-[10px] text-slate-500 font-medium uppercase">{vehicle.insurer}</div>
            </div>
            <StatusDisplay label="Insurance" date={vehicle.insuranceDate} />
            <StatusDisplay label="Tax" date={vehicle.taxDate} />
            <StatusDisplay label="MOT" date={vehicle.motDate} />
            {vehicle.serviceDate && (
                 <StatusDisplay label="Service" date={vehicle.serviceDate} />
            )}
            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-2">
                <span>Policy:</span>
                <span className="font-mono select-all font-medium text-slate-600">{vehicle.policyNumber}</span>
            </div>
        </div>
    )
};

const VehiclesWidget: React.FC<WidgetProps> = (props) => {
      const { sectionId, data, style, onUpdateVehicle, onAddVehicle, onRemoveVehicle, onEnterOrganiseMode } = props;
      return (
          <SectionWrapper id={sectionId} styleConfig={style} onDelete={props.onDeleteSection ? () => props.onDeleteSection!(sectionId) : undefined} {...props}>
            <div className="bg-white rounded-xl p-2 border border-slate-200">
             <h3 
                className="font-bold text-slate-500 uppercase tracking-wide text-xs mb-3 ml-1 cursor-pointer select-none"
                onDoubleClick={() => onEnterOrganiseMode(sectionId)}
             >
                {style.title}
             </h3>
             <div className="space-y-2">
                {data.vehicles.map(v => (
                    <VehicleCard 
                        key={v.id} 
                        vehicle={v} 
                        onSave={(updated) => onUpdateVehicle(v.id, updated)} 
                        onDelete={() => onRemoveVehicle(v.id)}
                    />
                ))}
             </div>
             <button 
                onClick={onAddVehicle} 
                className="w-full mt-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                type="button"
             >
                <Plus size={14} /> Add Vehicle
             </button>
            </div>
          </SectionWrapper>
      )
}

const NotesWidget: React.FC<WidgetProps> = (props) => {
      const { sectionId, data, style, onUpdateNotes, onEnterOrganiseMode } = props;
      const noteContent = data.textSections[sectionId] || "";

      return (
          <SectionWrapper id={sectionId} styleConfig={style} onDelete={props.onDeleteSection ? () => props.onDeleteSection!(sectionId) : undefined} {...props}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
                <h3 
                    className="font-bold text-xs uppercase tracking-wide text-slate-500 mb-2 cursor-pointer select-none"
                    onDoubleClick={() => onEnterOrganiseMode(sectionId)}
                >
                    {style.title}
                </h3>
                <textarea 
                    className="w-full bg-yellow-50 border-yellow-100 rounded-lg p-3 text-sm min-h-[150px] focus:ring-2 ring-yellow-200 outline-none text-slate-700 pointer-events-auto"
                    placeholder="Add notes..."
                    value={noteContent}
                    onChange={(e) => onUpdateNotes(sectionId, e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            </div>
          </SectionWrapper>
      )
}

// --- Main Dashboard Component ---

const Dashboard: React.FC<DashboardProps> = ({ monthData, onUpdate, onUnsavedChanges }) => {
  const [localData, setLocalData] = useState<BudgetMonth>(monthData);
  const [isDirty, setIsDirty] = useState(false);
  const [linkedSpending, setLinkedSpending] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // Add Section Modal State
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionType, setNewSectionType] = useState<'income' | 'expense'>('expense');
  const [newSectionVariant, setNewSectionVariant] = useState<SectionVariant>('list');
  const [isNameInvalid, setIsNameInvalid] = useState(false);

  // Organise Mode State
  const [isOrganiseMode, setIsOrganiseMode] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Section Settings State (Lifted Up)
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);

  useEffect(() => {
    setLocalData(monthData);
    setIsDirty(false);
    setIsOrganiseMode(false);
    setSelectedSectionId(null);
    setActiveSettingsId(null);
  }, [monthData]);

  // Notify Parent of changes
  useEffect(() => {
      if (onUnsavedChanges) {
          onUnsavedChanges(isDirty, localData);
      }
  }, [isDirty, localData, onUnsavedChanges]);

  // --- Organise Mode Logic (Keyboard) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global ESC handler to exit organise mode or settings
      if (e.key === 'Escape') {
        if (isOrganiseMode) {
          setIsOrganiseMode(false);
          setSelectedSectionId(null);
        }
        if (activeSettingsId) {
          setActiveSettingsId(null);
        }
        return;
      }

      if (!isOrganiseMode || !selectedSectionId) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
      }

      const layout = localData.layout;
      let colKey: keyof BudgetLayout | undefined;
      let index = -1;

      // Find current position
      if (layout.col1.includes(selectedSectionId)) { colKey = 'col1'; index = layout.col1.indexOf(selectedSectionId); }
      else if (layout.col2.includes(selectedSectionId)) { colKey = 'col2'; index = layout.col2.indexOf(selectedSectionId); }
      else if (layout.col3.includes(selectedSectionId)) { colKey = 'col3'; index = layout.col3.indexOf(selectedSectionId); }

      if (!colKey) return;

      let newLayout = { ...layout };
      let changed = false;

      // Move Logic
      if (e.key === 'ArrowUp' && index > 0) {
         const newCol = [...newLayout[colKey]];
         [newCol[index], newCol[index-1]] = [newCol[index-1], newCol[index]];
         newLayout[colKey] = newCol;
         changed = true;
      } else if (e.key === 'ArrowDown' && index < newLayout[colKey].length - 1) {
         const newCol = [...newLayout[colKey]];
         [newCol[index], newCol[index+1]] = [newCol[index+1], newCol[index]];
         newLayout[colKey] = newCol;
         changed = true;
      } else if (e.key === 'ArrowRight') {
          let targetCol: keyof BudgetLayout | null = null;
          if (colKey === 'col1') targetCol = 'col2';
          if (colKey === 'col2') targetCol = 'col3';

          if (targetCol) {
              newLayout[colKey] = newLayout[colKey].filter(id => id !== selectedSectionId);
              newLayout[targetCol] = [selectedSectionId, ...newLayout[targetCol]];
              changed = true;
          }
      } else if (e.key === 'ArrowLeft') {
          let targetCol: keyof BudgetLayout | null = null;
          if (colKey === 'col3') targetCol = 'col2';
          if (colKey === 'col2') targetCol = 'col1';

          if (targetCol) {
              newLayout[colKey] = newLayout[colKey].filter(id => id !== selectedSectionId);
              newLayout[targetCol] = [selectedSectionId, ...newLayout[targetCol]];
              changed = true;
          }
      }

      if (changed) {
          setLocalData(prev => ({ ...prev, layout: newLayout }));
          setIsDirty(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOrganiseMode, selectedSectionId, localData.layout, activeSettingsId]);

  const handleEnterOrganiseMode = (id: string) => {
      setIsOrganiseMode(true);
      setSelectedSectionId(id);
  };

  const handleSave = () => {
    onUpdate(localData);
    updateMonth(localData);
    setIsDirty(false);
  };

  // --- Sensors (Transaction Dragging Only) ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Calculations ---
  const totals = useMemo(() => {
    let income = 0;
    let totalOutgoing = 0;

    // Calculate Totals from Transactions
    localData.transactions.forEach(t => {
        const isStandard = Object.values(TransactionType).includes(t.type as TransactionType);
        let isIncome = false;
        let isExpense = false;

        if (t.type === TransactionType.INCOMING) {
            isIncome = true;
        } else if (isStandard) {
            isExpense = true;
        } else {
            // Custom Type Logic
            const style = localData.sectionStyles[t.type];
            if (style?.type === 'income') isIncome = true;
            else isExpense = true;
        }

        if (isIncome) {
            income += t.amount;
        } else if (isExpense) {
            totalOutgoing += t.amount;
        }
    });

    // Add Sliders to Expenses (currently all sliders are expense type widgets)
    Object.values(localData.sliders).forEach(sliderGroup => {
        sliderGroup.forEach(s => {
             totalOutgoing += s.value;
        });
    });
    
    const remaining = income - totalOutgoing;
    
    return { income, allExpenses: totalOutgoing, remaining };
  }, [localData]);

  // --- Handlers ---
  const updateTransaction = (id: string, field: keyof Transaction, value: any) => {
    const newTransactions = localData.transactions.map(t => t.id === id ? { ...t, [field]: value } : t);
    setLocalData({ ...localData, transactions: newTransactions });
    setIsDirty(true);
  };

  const addTransaction = (type: TransactionType | string) => {
    const newT: Transaction = { id: uuidv4(), name: 'New Item', amount: 0, type };
    setLocalData({ ...localData, transactions: [...localData.transactions, newT] });
    setIsDirty(true);
  };

  const removeTransaction = (id: string) => {
    setLocalData({ ...localData, transactions: localData.transactions.filter(t => t.id !== id) });
    setIsDirty(true);
  };

  const updatePetrol = (field: keyof PetrolData, value: number) => {
    setLocalData({ ...localData, petrol: { ...localData.petrol, [field]: value } });
    setIsDirty(true);
  };

  const updateSliders = (sectionId: string, sliders: SliderItem[]) => {
      setLocalData(prev => ({
          ...prev,
          sliders: { ...prev.sliders, [sectionId]: sliders }
      }));
      setIsDirty(true);
  };

  const updateNotes = (sectionId: string, val: string) => {
      setLocalData(prev => ({
          ...prev,
          textSections: { ...prev.textSections, [sectionId]: val }
      }));
      setIsDirty(true);
  };

  const updateVehicle = (id: string, updatedVehicle: VehicleDate) => {
      const newVehicles = localData.vehicles.map(v => v.id === id ? updatedVehicle : v);
      setLocalData({ ...localData, vehicles: newVehicles });
      setIsDirty(true);
  };
  
  const addVehicle = () => {
      const newVehicle: VehicleDate = {
          id: uuidv4(),
          reg: 'NEW CAR',
          insurer: '',
          insuranceDate: new Date().toISOString().split('T')[0],
          taxDate: new Date().toISOString().split('T')[0],
          motDate: new Date().toISOString().split('T')[0],
          serviceDate: new Date().toISOString().split('T')[0], // Init Service Date
          policyNumber: ''
      };
      setLocalData(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
      setIsDirty(true);
  };

  const removeVehicle = (id: string) => {
      setLocalData(prev => ({ ...prev, vehicles: prev.vehicles.filter(v => v.id !== id) }));
      setIsDirty(true);
  };

  const handleUpdateSectionStyle = (id: string, newStyle: Partial<SectionStyle>) => {
      setLocalData(prev => ({
          ...prev,
          sectionStyles: {
              ...prev.sectionStyles,
              [id]: { ...prev.sectionStyles[id], ...newStyle }
          }
      }));
      setIsDirty(true);
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) {
        setIsNameInvalid(true);
        setTimeout(() => setIsNameInvalid(false), 600); // Reset animation state after 600ms
        return;
    }
    const id = `section_${uuidv4()}`;
    
    const newStyle: SectionStyle = { 
        title: newSectionName, 
        colorClass: newSectionType === 'income' ? 'bg-emerald-600' : 'bg-slate-600',
        type: newSectionType,
        variant: newSectionVariant
    };

    const newState = { ...localData };
    newState.sectionStyles[id] = newStyle;
    newState.layout.col1 = [id, ...newState.layout.col1]; // Add to top of col 1
    
    // Init storage based on type
    if (newSectionVariant === 'slider') {
        newState.sliders[id] = [{ id: uuidv4(), name: 'Value 1', value: 0, max: 1000 }];
    }
    if (newSectionVariant === 'note') {
        newState.textSections[id] = "";
    }
    
    setLocalData(newState);
    setNewSectionName("");
    setNewSectionType('expense'); 
    setNewSectionVariant('list');
    setShowAddSection(false);
    setIsDirty(true);
  }

  const handleDeleteSection = (id: string) => {
      setLocalData(prev => {
        const layout = { ...prev.layout };
        layout.col1 = layout.col1.filter(x => x !== id);
        layout.col2 = layout.col2.filter(x => x !== id);
        layout.col3 = layout.col3.filter(x => x !== id);
  
        const styles = { ...prev.sectionStyles };
        delete styles[id];
  
        // Cleanup data stores
        const transactions = prev.transactions.filter(t => t.type !== id);
        const sliders = { ...prev.sliders };
        delete sliders[id];
        const textSections = { ...prev.textSections };
        delete textSections[id];
  
        return { ...prev, layout, sectionStyles: styles, transactions, sliders, textSections };
      });
      setIsDirty(true);
  }

  // --- Transaction Drag & Drop Logic ---
  const handleDragStart = (event: DragStartEvent) => {
      setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      
      const activeId = active.id as string;
      const overId = over.id as string;

      const activeItem = localData.transactions.find(t => t.id === activeId);
      if (!activeItem) return;
      
      const overItem = localData.transactions.find(t => t.id === overId);
      
      const isStandardType = Object.values(TransactionType).includes(overId as TransactionType);
      const isCustomSection = localData.sectionStyles[overId] !== undefined;
      const isOverContainer = isStandardType || isCustomSection;
      
      let newType: string | null = null;
      if (overItem && overItem.type !== activeItem.type) {
          newType = overItem.type;
      } else if (isOverContainer && overId !== activeItem.type) {
          newType = overId;
      }

      if (newType) {
          setLocalData(prev => {
              const activeIndex = prev.transactions.findIndex(t => t.id === activeId);
              const newTransactions = [...prev.transactions];
              newTransactions[activeIndex] = { ...newTransactions[activeIndex], type: newType! };
              return { ...prev, transactions: newTransactions };
          });
      }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId !== overId) {
            setLocalData(prev => {
            const oldIndex = prev.transactions.findIndex(t => t.id === activeId);
            const newIndex = prev.transactions.findIndex(t => t.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                    return { ...prev, transactions: arrayMove(prev.transactions, oldIndex, newIndex) };
            }
            return prev;
            });
            setIsDirty(true);
    }
  };

  // --- Render Helper ---
  const renderSection = (id: string) => {
      const commonProps: WidgetProps = {
          sectionId: id,
          data: localData,
          style: localData.sectionStyles[id] || { title: 'Unknown', colorClass: 'bg-slate-500', variant: 'list' },
          onUpdateStyle: handleUpdateSectionStyle,
          onDeleteSection: handleDeleteSection,
          onUpdateTransaction: updateTransaction,
          onAddTransaction: addTransaction,
          onRemoveTransaction: removeTransaction,
          onUpdatePetrol: updatePetrol,
          onUpdateVehicle: updateVehicle,
          onUpdateSliders: updateSliders,
          onUpdateNotes: updateNotes,
          onAddVehicle: addVehicle,
          onRemoveVehicle: removeVehicle,
          linkedSpending,
          setLinkedSpending,
          isOrganiseMode,
          isSelected: selectedSectionId === id,
          onSelect: setSelectedSectionId,
          onEnterOrganiseMode: handleEnterOrganiseMode,
          isSettingsOpen: activeSettingsId === id,
          onToggleSettings: () => setActiveSettingsId(prev => prev === id ? null : id),
      };

      const style = localData.sectionStyles[id];
      if (!style) return null;

      // Special case for fixed widgets
      if (id === SectionId.PETROL) return <PetrolWidget {...commonProps} />;
      if (id === SectionId.VEHICLES) return <VehiclesWidget {...commonProps} />;

      // Generic rendering based on variant
      switch (style.variant) {
          case 'slider':
              return <SliderWidget {...commonProps} />;
          case 'note':
              return <NotesWidget {...commonProps} />;
          case 'petrol': // New Variant
              return <PetrolWidget {...commonProps} />;
          case 'vehicles': // New Variant
              return <VehiclesWidget {...commonProps} />;
          case 'list':
          default:
             // Use the ID as the type for transactions
             let type = id;
             // Map known legacy IDs to TransactionTypes
             if (id === SectionId.INCOMING) type = TransactionType.INCOMING;
             if (id === SectionId.BILLS) type = TransactionType.BILL_MAIN;
             if (id === SectionId.POTS) type = TransactionType.POT;
             if (id === SectionId.CANCELLABLE) type = TransactionType.BILL_CANCELLABLE;
             if (id === SectionId.STANDING_ORDERS) type = TransactionType.STANDING_ORDER;
             if (id === SectionId.ONE_OFFS) type = TransactionType.ONE_OFF;
             
             return <TransactionTable {...commonProps} type={type} />;
      }
  };

  // Visualizer Logic
  const totalVolume = totals.income + totals.allExpenses + Math.max(0, totals.remaining);
  
  const incWidth = totalVolume > 0 ? (totals.income / totalVolume) * 100 : 0;
  const outWidth = totalVolume > 0 ? (totals.allExpenses / totalVolume) * 100 : 0;
  const remWidth = totalVolume > 0 ? (Math.max(0, totals.remaining) / totalVolume) * 100 : 0;

  const outgoingPercent = totals.income > 0 ? (totals.allExpenses / totals.income) * 100 : 0;
  const remainingPercent = totals.income > 0 ? (Math.max(0, totals.remaining) / totals.income) * 100 : 0;


  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 relative">

       <style>{`
         @keyframes flashRed {
            0%, 100% { border-color: #e2e8f0; box-shadow: none; }
            25% { border-color: #ef4444; box-shadow: 0 0 0 2px #ef4444; }
            50% { border-color: #e2e8f0; box-shadow: none; }
            75% { border-color: #ef4444; box-shadow: 0 0 0 2px #ef4444; }
         }
         .flash-error {
            animation: flashRed 0.6s ease-in-out;
         }
       `}</style>

       {/* Overlay to close settings on click outside */}
       {activeSettingsId && (
           <div 
             className="fixed inset-0 z-40 bg-transparent" 
             onClick={() => setActiveSettingsId(null)}
           />
       )}
      
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">{localData.name}</h2>
            <p className="text-slate-500 text-sm">Manage your monthly budget and vehicle data.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           {/* Organise Toggle */}
           <button 
                onClick={() => {
                    const newMode = !isOrganiseMode;
                    setIsOrganiseMode(newMode);
                    if(!newMode) setSelectedSectionId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border ${isOrganiseMode ? 'bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
           >
               <Layout size={18} /> 
               {isOrganiseMode ? 'Finish Organising' : 'Organise Sections'}
           </button>

           <button onClick={() => setShowAddSection(true)} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-all font-medium text-sm"><Plus size={18} /> Add Section</button>
           <button onClick={handleSave} disabled={!isDirty} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-2 rounded-lg shadow-sm font-medium text-sm transition-all ${isDirty ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Save size={18} />{isDirty ? 'Save Changes' : 'Saved'}</button>
        </div>
      </div>
        
      {/* Organise Mode Instructions Banner */}
      {isOrganiseMode && (
          <div className="bg-blue-50 border border-blue-100 text-blue-700 p-3 rounded-lg flex items-center gap-4 animate-fade-in">
              <div className="bg-white p-2 rounded-full shadow-sm"><Layout size={20} /></div>
              <div className="flex-1">
                  <h4 className="font-bold text-sm">Organise Mode Active</h4>
                  <p className="text-xs opacity-80">Select a section and use <span className="font-bold bg-white px-1 rounded border border-blue-100 mx-1">Arrow Keys</span> to move it. Press <span className="font-bold bg-white px-1 rounded border border-blue-100 mx-1">ESC</span> to finish.</p>
              </div>
               <div className="flex gap-2 text-xs font-bold opacity-50">
                    <span className="flex items-center gap-1"><ArrowUp size={12} /> Move Up</span>
                    <span className="flex items-center gap-1"><ArrowDown size={12} /> Move Down</span>
                    <span className="flex items-center gap-1"><ArrowLeft size={12} /> Col Left</span>
                    <span className="flex items-center gap-1"><ArrowRight size={12} /> Col Right</span>
               </div>
          </div>
      )}

       {/* Add Section Modal */}
       {showAddSection && (
           <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center animate-fade-in p-4">
               <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                   <h3 className="font-bold text-lg mb-4 text-slate-800">Add New Section</h3>
                   
                   <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Section Name</label>
                        <input 
                                autoFocus
                                className={`w-full border rounded-lg px-4 py-2 outline-none mb-4 transition-all duration-200 ${isNameInvalid ? 'flash-error' : 'border-slate-300 focus:ring-2 focus:ring-purple-500'}`}
                                placeholder="e.g. Holiday Savings"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                        />
                   </div>

                   <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wide">Section Type</label>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <button 
                                onClick={() => setNewSectionVariant('list')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newSectionVariant === 'list' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <List size={24} />
                                <span className="text-xs font-bold">Item List</span>
                            </button>
                            <button 
                                onClick={() => setNewSectionVariant('slider')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newSectionVariant === 'slider' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <SlidersIcon size={24} />
                                <span className="text-xs font-bold">Sliders</span>
                            </button>
                            <button 
                                onClick={() => setNewSectionVariant('note')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newSectionVariant === 'note' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <FileText size={24} />
                                <span className="text-xs font-bold">Notes</span>
                            </button>
                        </div>
                        
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Other Tools</label>
                        <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => setNewSectionVariant('petrol')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newSectionVariant === 'petrol' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Calculator size={24} />
                                <span className="text-xs font-bold">Petrol Calc</span>
                            </button>
                             <button 
                                onClick={() => setNewSectionVariant('vehicles')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newSectionVariant === 'vehicles' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Car size={24} />
                                <span className="text-xs font-bold">Vehicle Mgmt</span>
                            </button>
                        </div>
                   </div>

                   <div className="mb-6">
                       <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Cash Flow Type</label>
                       <div className="flex gap-3">
                           <button 
                                onClick={() => setNewSectionType('expense')}
                                disabled={!['list', 'slider'].includes(newSectionVariant)}
                                className={`flex-1 py-2 px-3 rounded-lg border font-medium text-sm transition-colors flex items-center justify-center gap-2 ${newSectionType === 'expense' ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-100' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                           >
                               <Minus size={16} /> Outgoing (Expense)
                           </button>
                           <button 
                                onClick={() => setNewSectionType('income')}
                                disabled={!['list', 'slider'].includes(newSectionVariant)}
                                className={`flex-1 py-2 px-3 rounded-lg border font-medium text-sm transition-colors flex items-center justify-center gap-2 ${newSectionType === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-emerald-100' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                           >
                               <Plus size={16} /> Incoming (Income)
                           </button>
                       </div>
                   </div>

                   <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                       <button onClick={() => setShowAddSection(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                       <button onClick={handleAddSection} className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium">Add Section</button>
                   </div>
               </div>
           </div>
       )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-500 text-white p-6 rounded-2xl shadow-lg shadow-emerald-200/50 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
                <div className="text-emerald-100 font-bold text-xs uppercase tracking-wider mb-1">Total Incoming</div>
                <div className="text-3xl font-bold">{formatGBP(totals.income)}</div>
            </div>
            <TrendingUp className="absolute right-4 bottom-4 text-emerald-400/50 w-16 h-16" />
        </div>
        
        <div className="bg-red-500 text-white p-6 rounded-2xl shadow-lg shadow-red-200/50 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
                <div className="text-red-100 font-bold text-xs uppercase tracking-wider mb-1">Total Outgoing</div>
                <div className="text-3xl font-bold">{formatGBP(totals.allExpenses)}</div>
                <div className="text-[10px] text-red-100 mt-1 opacity-80">Includes Bills, Spending & Pots</div>
            </div>
            <div className="absolute -right-2 -bottom-4 text-red-400/40 text-9xl font-bold leading-none">£</div>
        </div>

        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg shadow-slate-400/20 md:col-span-2 grid grid-cols-2 gap-4 items-center">
            <div className="flex flex-col justify-between h-full py-1 border-r border-slate-700 pr-4">
                <div>
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Final Remaining</div>
                    <div className="text-4xl font-bold text-blue-400">{formatGBP(totals.remaining)}</div>
                </div>
            </div>
             <div className="h-full flex items-center justify-center px-2">
                 <div className="w-full h-full flex flex-col justify-center">
                    <div className="flex w-full h-8 rounded-full overflow-hidden bg-slate-900/30 ring-2 ring-slate-700/50">
                        {/* Incoming Bar (Green) */}
                        <div 
                            style={{ width: `${incWidth}%` }} 
                            className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden whitespace-nowrap px-1 border-r border-slate-900/20"
                        >
                            {totals.income > 0 && formatGBP(totals.income)}
                        </div>
                        {/* Outgoing Bar (Red) */}
                        <div 
                            style={{ width: `${outWidth}%` }} 
                            className="bg-red-500 h-full flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden whitespace-nowrap px-1 border-r border-slate-900/20"
                        >
                            {totals.allExpenses > 0 && formatGBP(totals.allExpenses)}
                        </div>
                        {/* Remaining Bar (Blue) */}
                        <div 
                            style={{ width: `${remWidth}%` }} 
                            className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden whitespace-nowrap px-1"
                        >
                            {totals.remaining > 0 && formatGBP(totals.remaining)}
                        </div>
                    </div>
                     <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Incoming (100%)</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>Outgoing ({outgoingPercent.toFixed(0)}%)</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Remaining ({remainingPercent.toFixed(0)}%)</div>
                    </div>
                 </div>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Column 1 */}
          <div className="flex flex-col min-h-[200px] h-full rounded-xl transition-colors">
              {localData.layout.col1.map(id => (
                <React.Fragment key={id}>
                    {renderSection(id)}
                </React.Fragment>
              ))}
              {localData.layout.col1.length === 0 && isOrganiseMode && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-sm">Column Empty</div>
              )}
          </div>

          {/* Column 2 */}
          <div className="flex flex-col min-h-[200px] h-full rounded-xl transition-colors">
              {localData.layout.col2.map(id => (
                <React.Fragment key={id}>
                    {renderSection(id)}
                </React.Fragment>
              ))}
               {localData.layout.col2.length === 0 && isOrganiseMode && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-sm">Column Empty</div>
              )}
          </div>

          {/* Column 3 */}
          <div className="flex flex-col min-h-[200px] h-full rounded-xl transition-colors">
              {localData.layout.col3.map(id => (
                <React.Fragment key={id}>
                    {renderSection(id)}
                </React.Fragment>
              ))}
               {localData.layout.col3.length === 0 && isOrganiseMode && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-sm">Column Empty</div>
              )}
          </div>
      </div>

      <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
      }}>
        {activeDragId ? (
           <div className="bg-white shadow-xl border-2 border-blue-500 rounded p-2 w-[300px] flex items-center opacity-90 cursor-grabbing scale-105">
               <GripHorizontal size={16} className="text-slate-400 mr-2" />
               <span className="font-medium text-slate-800">
                 {localData.transactions.find(t => t.id === activeDragId)?.name}
               </span>
           </div>
        ) : null}
      </DragOverlay>

    </div>
    </DndContext>
  );
};

export default Dashboard;