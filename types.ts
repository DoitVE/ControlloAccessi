
import React from 'react';

// Force update check v1.4
export enum AppView {
  HOME = 'HOME',
  MIFARE_DECODER = 'MIFARE_DECODER',
  ACCESS_PERMISSIONS = 'ACCESS_PERMISSIONS',
  DEVICE_REGISTRY = 'DEVICE_REGISTRY',
  SERVICE_DESK_MAIL = 'SERVICE_DESK_MAIL',
  READER_TYPES = 'READER_TYPES',
  ELMO_LOGS = 'ELMO_LOGS',
  DEVICE_DELIVERY = 'DEVICE_DELIVERY'
}

export interface AccessLog {
  id: string;
  timestamp: string;
  personName: string;
  department: string;
  gate: string;
  status: 'GRANTED' | 'DENIED' | 'FLAGGED';
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export interface ToolDefinition {
  id: AppView;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// --- Device Registry Types ---

export interface DeviceEntry {
  // Key fields used for matching
  idUtente: string; // The primary key (Col B in Registry)
  
  // Fields from Registry (Foglio 1)
  nominativo: string;
  azienda: string;
  referente: string;
  matricola: string;
  reparto: string;
  tempistica: string;
  dataConsegna: string;
  // dataRestituzione removed as per new excel structure
  note: string; // Moved to Col J

  // Metadata
  isNew?: boolean; // If found in EL.MO but not in Registry
  source: 'REGISTRY' | 'ELMO' | 'MERGED';
  rowIndex?: number; // Row number in the excel file
}

export interface DuplicateGroup {
  id: string;
  entries: DeviceEntry[];
}

export interface MismatchItem {
  idUtente: string;
  nominativo: string;
  currentRegStatus: string;
  elmoGroup: string;
  rowIndex: number;
  sheetNameReg: string; // Name of the Registry Sheet
  suggestedAction: 'DEACTIVATE' | 'ACTIVATE'; // New field to guide the UI
}

export interface ProcessingResult {
  mergedRegistry: DeviceEntry[];
  newDevices: DeviceEntry[]; // Devices found in EL.MO but not in Registry
  elmoDiff: any[]; // Deprecated in favor of fullElmoList, kept for compatibility if needed
  fullElmoList: any[]; // Complete EL.MO list to overwrite Foglio 2
  elmoNewNames: string[]; // List of names added to EL.MO for notification
  orphanedDevices: DeviceEntry[]; // Devices in Registry NOT found in EL.MO
  duplicates: DuplicateGroup[]; // Registry entries with same ID
  mismatches?: MismatchItem[]; // Registry vs EL.MO status mismatches
  stats: {
    totalRegistry: number;
    totalElmoDevices: number;
    newFoundDevices: number;
    newElmoEntries: number;
    orphansFound: number;
  };
  originalWorkbook?: any; // ExcelJS Workbook
}