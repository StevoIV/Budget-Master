export enum TransactionType {
  INCOMING = 'INCOMING',
  BILL_MAIN = 'BILL_MAIN',
  BILL_CANCELLABLE = 'BILL_CANCELLABLE',
  POT = 'POT',
  ONE_OFF = 'ONE_OFF',
  STANDING_ORDER = 'STANDING_ORDER',
  CUSTOM = 'CUSTOM'
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType | string;
  isPaid?: boolean;
  note?: string;
}

export interface VehicleDate {
  id: string;
  reg: string;
  insuranceDate: string;
  taxDate: string;
  motDate: string;
  serviceDate?: string;
  policyNumber: string;
  insurer: string;
}

export interface PetrolData {
  fuelPrice: number;
  refillsNeeded: number;
  tankSizeLitres: number;
  milesPerTank: number;
  enteredMiles: number;
}

// Deprecated in favor of generic sliders, kept for migration types
export interface SpendingAllocations {
  chris: number;
  dani: number;
}

export interface SliderItem {
  id: string;
  name: string;
  value: number;
  max: number;
  color?: string; // e.g. 'lime', 'cyan', 'blue'
}

// IDs for the draggable sections
export enum SectionId {
  INCOMING = 'section_incoming',
  PERSONAL_ALLOWANCE = 'section_personal_allowance',
  BILLS = 'section_bills',
  POTS = 'section_pots',
  CANCELLABLE = 'section_cancellable',
  STANDING_ORDERS = 'section_standing_orders',
  ONE_OFFS = 'section_one_offs',
  PETROL = 'section_petrol',
  VEHICLES = 'section_vehicles',
  NOTES = 'section_notes'
}

export type SectionVariant = 'list' | 'slider' | 'note' | 'petrol' | 'vehicles';

export interface SectionStyle {
  title: string;
  colorClass: string; // e.g. "bg-red-700"
  type?: 'income' | 'expense'; // Categorization for totals
  variant?: SectionVariant;
}

export interface BudgetLayout {
  col1: string[];
  col2: string[];
  col3: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string; 
}

export interface BudgetMonth {
  id: string; 
  folderId?: string | null;
  name: string; 
  transactions: Transaction[];
  petrol: PetrolData;
  vehicles: VehicleDate[];
  
  // Dynamic Data Stores
  sliders: Record<string, SliderItem[]>; // Keyed by sectionId
  textSections: Record<string, string>;  // Keyed by sectionId

  // Deprecated legacy fields (kept for migration safety)
  spending?: SpendingAllocations;
  notes?: string;

  // Layout & Style properties
  layout: BudgetLayout;
  sectionStyles: Record<string, SectionStyle>;
}

export const DEFAULT_VEHICLES: VehicleDate[] = [
  {
    id: 'v1',
    reg: 'AV59FRO',
    insuranceDate: '2025-02-25',
    taxDate: '2025-01-31',
    motDate: '2025-09-29',
    policyNumber: '136756207',
    insurer: 'RAC Insurance'
  },
  {
    id: 'v2',
    reg: 'AV10UES',
    insuranceDate: '2025-10-03',
    taxDate: '2025-10-01',
    motDate: '2025-09-26',
    policyNumber: 'P77184727',
    insurer: 'Admiral Insurance'
  }
];

export const DEFAULT_PETROL: PetrolData = {
  fuelPrice: 1.40,
  refillsNeeded: 4,
  tankSizeLitres: 31.50,
  milesPerTank: 260,
  enteredMiles: 1040
};