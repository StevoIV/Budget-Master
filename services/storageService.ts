import { BudgetMonth, TransactionType, DEFAULT_VEHICLES, DEFAULT_PETROL, SectionId, BudgetLayout, SectionStyle, Folder, SliderItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'household_budget_data_v1';
const FOLDER_STORAGE_KEY = 'household_budget_folders_v1';

const DEFAULT_LAYOUT: BudgetLayout = {
  col1: [SectionId.INCOMING, SectionId.PERSONAL_ALLOWANCE, SectionId.NOTES],
  col2: [SectionId.BILLS, SectionId.POTS],
  col3: [SectionId.PETROL, SectionId.VEHICLES, SectionId.CANCELLABLE, SectionId.STANDING_ORDERS, SectionId.ONE_OFFS]
};

const DEFAULT_STYLES: Record<string, SectionStyle> = {
  [SectionId.INCOMING]: { title: "Incoming", colorClass: "bg-emerald-600", type: 'income', variant: 'list' },
  [SectionId.BILLS]: { title: "Main Bills (DD)", colorClass: "bg-red-700", type: 'expense', variant: 'list' },
  [SectionId.POTS]: { title: "Account Pots", colorClass: "bg-red-800", type: 'expense', variant: 'list' },
  [SectionId.CANCELLABLE]: { title: "Cancellable DDs", colorClass: "bg-purple-800", type: 'expense', variant: 'list' },
  [SectionId.STANDING_ORDERS]: { title: "Standing Orders", colorClass: "bg-red-900", type: 'expense', variant: 'list' },
  [SectionId.ONE_OFFS]: { title: "One Off Payments", colorClass: "bg-orange-700", type: 'expense', variant: 'list' },
  
  // Special Widgets
  [SectionId.PERSONAL_ALLOWANCE]: { title: "Personal Allowance", colorClass: "bg-white", type: 'expense', variant: 'slider' },
  [SectionId.PETROL]: { title: "Petrol Calculator", colorClass: "bg-slate-800", type: 'expense', variant: 'petrol' },
  [SectionId.VEHICLES]: { title: "Vehicle Management", colorClass: "bg-white", type: 'expense', variant: 'vehicles' },
  [SectionId.NOTES]: { title: "Notes", colorClass: "bg-white", type: 'expense', variant: 'note' }
};

// Initial Data Helpers
const getInitialSliders = (): Record<string, SliderItem[]> => ({
    [SectionId.PERSONAL_ALLOWANCE]: [
        { id: uuidv4(), name: "Chris", value: 600, max: 2000, color: 'lime' },
        { id: uuidv4(), name: "Dani", value: 600, max: 2000, color: 'cyan' }
    ]
});

const getInitialNotes = (): Record<string, string> => ({
    [SectionId.NOTES]: ""
});


const generateInitialMonth = (): BudgetMonth => {
  const now = new Date();
  const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return {
    id: monthId,
    folderId: null,
    name: monthName,
    sliders: getInitialSliders(),
    textSections: getInitialNotes(),
    petrol: { ...DEFAULT_PETROL },
    vehicles: [...DEFAULT_VEHICLES],
    transactions: [
      // Incoming
      { id: uuidv4(), name: "Left Over in Account", amount: 0.00, type: TransactionType.INCOMING },
      { id: uuidv4(), name: "Chris' Wage", amount: 2078.99, type: TransactionType.INCOMING },
      { id: uuidv4(), name: "Dani's Wage", amount: 2828.31, type: TransactionType.INCOMING },
      
      // Main Bills
      { id: uuidv4(), name: "Broadband - Vodafone Fibre", amount: 25.00, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "Council Tax", amount: 153.00, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "Energy - Octopus", amount: 127.61, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "iPhone Contract - Three", amount: 20.50, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "iPhone Contract - O2", amount: 10.50, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "Mortgage - Nationwide", amount: 993.28, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "TV Licence", amount: 15.00, type: TransactionType.BILL_MAIN },
      { id: uuidv4(), name: "Water", amount: 52.00, type: TransactionType.BILL_MAIN },

      // Cancellable
      { id: uuidv4(), name: "Public Liability - DL", amount: 0.00, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Adobe - Photography", amount: 14.99, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Boots - Contact Lenses", amount: 29.25, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "TruGym", amount: 39.14, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Pure Gym", amount: 17.39, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Spotify", amount: 16.99, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Cinema", amount: 23.98, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Lily Lifestyle", amount: 5.99, type: TransactionType.BILL_CANCELLABLE },
      { id: uuidv4(), name: "Green Man (Lawn Care)", amount: 11.08, type: TransactionType.BILL_CANCELLABLE },

      // Account Pots
      { id: uuidv4(), name: "Car Maintenance", amount: 130.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Crumble", amount: 60.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Dani's Beauty Pot", amount: 150.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Home Improvements 2", amount: 0.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Food", amount: 280.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Home Improvements", amount: 0.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Holiday Pot", amount: 0.00, type: TransactionType.POT },
      { id: uuidv4(), name: "House Bits", amount: 80.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Date Night", amount: 0.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Petrol", amount: 176.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Xmas Budget", amount: 0.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Garden", amount: 10.00, type: TransactionType.POT },
      { id: uuidv4(), name: "Clothing Pot", amount: 0.00, type: TransactionType.POT },

      // Standing Orders
      { id: uuidv4(), name: "Netflix - Dani's Parents", amount: 10.40, type: TransactionType.STANDING_ORDER },
    ],
    layout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),
    sectionStyles: JSON.parse(JSON.stringify(DEFAULT_STYLES))
  };
};

const migrateMonth = (month: any): BudgetMonth => {
  // 1. Ensure Layout and Styles exist
  if (!month.layout) {
    month.layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  }
  if (!month.sectionStyles) {
    month.sectionStyles = JSON.parse(JSON.stringify(DEFAULT_STYLES));
  }

  // 2. Fix Folder ID
  if (month.folderId === undefined) {
      month.folderId = null;
  }

  // 3. Populate 'variant' in section styles if missing
  Object.keys(month.sectionStyles).forEach(key => {
    if (!month.sectionStyles[key].type) {
        month.sectionStyles[key].type = key === SectionId.INCOMING ? 'income' : 'expense';
    }
    if (!month.sectionStyles[key].variant) {
        if (key === SectionId.PERSONAL_ALLOWANCE) month.sectionStyles[key].variant = 'slider';
        else if (key === SectionId.NOTES) month.sectionStyles[key].variant = 'note';
        else if (key === SectionId.PETROL) month.sectionStyles[key].variant = 'petrol';
        else if (key === SectionId.VEHICLES) month.sectionStyles[key].variant = 'vehicles';
        else month.sectionStyles[key].variant = 'list';
    }
  });

  // 4. Migrate legacy 'spending' (Chris/Dani) to 'sliders' record
  if (!month.sliders) {
      month.sliders = {};
      // Migrate legacy spending if available
      if (month.spending) {
          month.sliders[SectionId.PERSONAL_ALLOWANCE] = [
              { id: uuidv4(), name: "Chris", value: month.spending.chris, max: 2000, color: 'lime' },
              { id: uuidv4(), name: "Dani", value: month.spending.dani, max: 2000, color: 'cyan' }
          ];
      } else {
           month.sliders[SectionId.PERSONAL_ALLOWANCE] = [
              { id: uuidv4(), name: "Chris", value: 600, max: 2000, color: 'lime' },
              { id: uuidv4(), name: "Dani", value: 600, max: 2000, color: 'cyan' }
          ];
      }
  } else {
      // Ensure existing sliders have colors if migrating from partial state
      Object.values(month.sliders).forEach((group: any) => {
          group.forEach((s: any, i: number) => {
              if(!s.color) s.color = i % 2 === 0 ? 'lime' : 'cyan';
          });
      });
  }
  
  // Backfill vehicle data if new fields missing
  if(month.vehicles) {
      month.vehicles = month.vehicles.map((v: any) => ({
          ...v,
          serviceDate: v.serviceDate || v.motDate // Default service to MOT if missing
      }));
  }

  // 5. Migrate legacy 'notes' string to 'textSections' record
  if (!month.textSections) {
      month.textSections = {};
      if (month.notes) {
          month.textSections[SectionId.NOTES] = month.notes;
      } else {
          month.textSections[SectionId.NOTES] = "";
      }
  }

  return month as BudgetMonth;
};

export const getStoredMonths = (): BudgetMonth[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map(migrateMonth);
    }
  } catch (e) {
    console.error("Failed to parse storage", e);
  }
  
  const initial = [generateInitialMonth()];
  saveMonths(initial);
  return initial;
};

export const saveMonths = (months: BudgetMonth[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(months));
};

export const getStoredFolders = (): Folder[] => {
  try {
    const stored = localStorage.getItem(FOLDER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse folders", e);
  }
  return [];
};

export const saveFolders = (folders: Folder[]) => {
  localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
};


export const updateMonth = (updatedMonth: BudgetMonth) => {
  const months = getStoredMonths();
  const index = months.findIndex(m => m.id === updatedMonth.id);
  if (index >= 0) {
    months[index] = updatedMonth;
  } else {
    months.push(updatedMonth);
  }
  saveMonths(months);
};

export const createNewMonth = (sourceMonth: BudgetMonth): BudgetMonth => {
    const newDate = new Date();
    const uniqueId = `${newDate.getFullYear()}-${newDate.getMonth()}-${Date.now()}`;
    
    return {
        ...sourceMonth,
        id: uniqueId,
        folderId: sourceMonth.folderId,
        name: "New Month Copy",
        transactions: sourceMonth.transactions.map(t => ({...t, isPaid: false, id: uuidv4()})),
        // Deep copy layout/styles
        layout: JSON.parse(JSON.stringify(sourceMonth.layout)),
        sectionStyles: JSON.parse(JSON.stringify(sourceMonth.sectionStyles)),
        // Deep copy sliders/notes
        sliders: JSON.parse(JSON.stringify(sourceMonth.sliders)),
        textSections: JSON.parse(JSON.stringify(sourceMonth.textSections))
    };
}

export const createBlankMonth = (folderId: string | null): BudgetMonth => {
    const base = generateInitialMonth();
    const uniqueId = `sheet-${Date.now()}`;
    
    return {
        ...base,
        id: uniqueId,
        folderId: folderId,
        name: "New Budget Sheet",
    };
}