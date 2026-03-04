
import ExcelJS from 'exceljs';
import { DeviceEntry, ProcessingResult, DuplicateGroup, MismatchItem } from "../types";

/**
 * Normalizzazione ID:
 * - Se MIFARE FS (inizia con 122): 8 cifre
 * - Altrimenti: 10 cifre
 */
const normalizeTo8 = (val: any): string => {
    const clean = String(val || "").replace(/\D/g, '');
    return clean ? clean.padStart(8, '0') : "";
};

const normalizeTo10 = (val: any): string => {
    const clean = String(val || "").replace(/\D/g, '');
    return clean ? clean.padStart(10, '0') : "";
};

const normalizeId = (val: any): string => {
    if (val === null || val === undefined) return "";
    let strVal = "";
    if (typeof val === 'object' && val !== null) {
        const v = val as any;
        if (v.result !== undefined && v.result !== null) strVal = String(v.result);
        else if (v.text !== undefined && v.text !== null) strVal = String(v.text);
        else strVal = "";
    } else {
        strVal = String(val);
    }

    const clean = strVal.replace(/\D/g, '');
    if (!clean || /^[0]+$/.test(clean)) return "";

    // Se sembra un MIFARE FS (122...)
    if (clean.startsWith('122') || clean.startsWith('0122') || clean.startsWith('00122')) {
        return clean.padStart(8, '0');
    }
    // Altrimenti standard 10 cifre
    return clean.padStart(10, '0');
};

/**
 * Estrae l'ID dispositivo da un testo (Colonna D) basandosi sulla presenza di sequenze numeriche.
 * Segue le regole:
 * - Se inizia con 122/0122/00122 (6-8 cifre) -> MIFARE FS (8 cifre)
 * - Altrimenti sequenze da 9-10 cifre -> MIFARE Card/Key (10 cifre)
 */
const extractDeviceIdFromText = (text: string): { id: string, type: 'FS' | 'CARD' | 'NONE' } => {
    if (!text) return { id: "", type: 'NONE' };
    
    const sequences = text.match(/\d+/g) || [];
    
    // 1. Cerchiamo prima i MIFARE FS (Regola Regina)
    const fsSequence = sequences.find(seq => 
        (seq.length >= 6 && seq.length <= 8) && 
        (seq.startsWith('122') || seq.startsWith('0122') || seq.startsWith('00122'))
    );
    if (fsSequence) {
        return { id: fsSequence.padStart(8, '0'), type: 'FS' };
    }
    
    // 2. Cerchiamo le MIFARE Card/Key (10 cifre)
    // Cerchiamo sequenze da 9 o 10 cifre (9 se manca lo zero iniziale)
    const cardSequence = sequences.find(seq => seq.length >= 9 && seq.length <= 10);
    if (cardSequence) {
        return { id: cardSequence.padStart(10, '0'), type: 'CARD' };
    }
    
    return { id: "", type: 'NONE' };
};

/**
 * Logica Identificazione Dispositivo:
 * BASATA ESCLUSIVAMENTE SU COLONNA D (Nominativo) perché Colonna B è inattendibile.
 */
const isRowADevice = (row: ExcelJS.Row | any[]): { isDevice: boolean, type: 'FS' | 'CARD' | 'NONE', id: string } => {
    // IMPORTANTE: Basato ESCLUSIVAMENTE su Nominativo (D) e Tessera (H). 
    // Colonna B di EL.MO. ignorata totalmente perché inattendibile.
    let elmoColD = ""; // Nominativo
    let elmoColH = ""; // Tessera (già normalizzata a 10 cifre in updateElmoSheet)

    if (Array.isArray(row)) {
        elmoColD = String(row[3] || "").trim();
        elmoColH = String(row[7] || "").trim();
    } else {
        elmoColD = String(getCellValue(row, 4) || "").trim();
        elmoColH = String(getCellValue(row, 8) || "").trim();
    }

    // 1. REGOLA MIFARE FS: Estrazione da Colonna D (Nominativo)
    // Se il nome contiene un ID 122... (6-8 cifre), è un dispositivo FS.
    // L'ID per il confronto con il Registro deve essere però quello in H (Tessera).
    const extractedFromD = extractDeviceIdFromText(elmoColD);
    const normH = normalizeTo10(elmoColH);

    if (extractedFromD.type === 'FS') {
        return { isDevice: true, type: 'FS', id: normH };
    }

    // 2. REGOLA MIFARE CARD/KEY: Identificazione da Tessera (H)
    // Se in D c'è una sequenza numerica (Card/Key) che combacia con H, è un dispositivo.
    if (normH && extractedFromD.type === 'CARD' && extractedFromD.id === normH) {
        return { isDevice: true, type: 'CARD', id: normH };
    }

    // Altrimenti è un badge aziendale o un'utenza senza dispositivo
    return { isDevice: false, type: 'NONE', id: "" };
};

const getCellValue = (row: ExcelJS.Row, colIdx: number): any => {
  const cell = row.getCell(colIdx);
  const val = cell.value as any; 
  if (val && typeof val === 'object') {
     if (val.result !== undefined && val.result !== null) return val.result; 
     if (val.text !== undefined && val.text !== null) return val.text;
     if (val.formula) return ""; // Formula senza risultato calcolato
  }
  return cell.value;
};

// Case-insensitive, robust property getter for raw JSON data
const getRowVal = (row: any, keyName: string): any => {
    const normalizedKeyName = keyName.toUpperCase().replace(/\s/g, '');
    const foundKey = Object.keys(row).find(k => k.toUpperCase().replace(/\s/g, '') === normalizedKeyName);
    return foundKey ? row[foundKey] : undefined;
};

/**
 * Helper to parse dates strictly for Excel Export
 */
const parseDateForExcel = (val: any): Date | string | null => {
    if (!val) return null;
    if (val instanceof Date) return val;

    const num = Number(val);
    if (!isNaN(num) && num > 20000 && num < 90000) {
         return new Date(Math.round((num - 25569) * 86400 * 1000));
    }

    if (typeof val === 'string') {
        const v = val.trim();
        const parts = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (parts) {
            return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
        }
    }

    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d;
};

/**
 * REPAIRS FORMULAS IN COLUMN C (Nominativo)
 */
const repairRegistryFormulas = (workbook: ExcelJS.Workbook) => {
  let registrySheet = workbook.worksheets.find(w => 
    w.name.toUpperCase().includes('REGISTRO')
  );
  if (!registrySheet) registrySheet = workbook.worksheets.find(w => w.name.toUpperCase().includes('REGISTR'));
  if (!registrySheet) registrySheet = workbook.worksheets[0];

  const rowCount = registrySheet.rowCount;
  for (let r = 5; r <= rowCount; r++) {
    const row = registrySheet.getRow(r);
    const idVal = getCellValue(row, 2); 
    if (idVal) {
      const cellC = row.getCell(3); 
      cellC.value = {
        formula: `_xlfn.XLOOKUP(B${r},'EL.MO. Utenti'!H:H,'EL.MO. Utenti'!Q:Q,"")`
      };
    }
  }
};

/**
 * Helper robusto per ottenere l'ID normalizzato dal foglio EL.MO.
 * Segue la logica isRowADevice: se è un dispositivo, restituisce l'ID per il confronto (Col P).
 */
const getNormalizedIdFromElmoRow = (row: ExcelJS.Row): string => {
    const analysis = isRowADevice(row);
    return analysis.isDevice ? analysis.id : "";
};

/**
 * Identifica i nuovi nominativi nell'export rispetto a quelli già presenti nel foglio EL.MO.
 * Indipendentemente dal fatto che siano dispositivi o meno.
 */
export const detectNewElmoNames = (workbook: ExcelJS.Workbook, elmoRaw: any[]): string[] => {
    const existingInElmoNames = new Set<string>();
    
    let elmoSheet = workbook.worksheets.find(w => 
        w.name.toUpperCase().includes("EL.MO") || w.name.toUpperCase().includes("UTENTI")
    ) || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : null);

    if (elmoSheet) {
        const rowCount = elmoSheet.rowCount;
        for (let r = 2; r <= rowCount; r++) {
            const row = elmoSheet.getRow(r);
            const cognome = String(getCellValue(row, 3) || "").trim();
            const nome = String(getCellValue(row, 4) || "").trim();
            const full = `${cognome} ${nome}`.trim().toUpperCase();
            if (full) existingInElmoNames.add(full);
        }
    }

    const newNames: string[] = [];
    if (!elmoRaw) return [];

    const dataRows = elmoRaw.slice(1);
    dataRows.forEach(rowData => {
        const cognome = String(rowData[2] || "").trim();
        const nome = String(rowData[3] || "").trim();
        const full = `${cognome} ${nome}`.trim().toUpperCase();
        
        if (full && !existingInElmoNames.has(full)) {
            newNames.push(`${String(rowData[2] || "").trim()} ${String(rowData[3] || "").trim()}`.trim());
        }
    });

    return newNames;
};

/**
 * Analisi principale.
 * Confronta il Registro (Col B) con i dispositivi identificati in EL.MO. (usando l'ID in Col P).
 */
export const processFiles = async (workbook: ExcelJS.Workbook, elmoNewNames: string[], elmoRaw: any[]): Promise<ProcessingResult> => {
  const registryList: DeviceEntry[] = [];
  const registryMapCheck = new Set<string>();
  const duplicateMap = new Map<string, DeviceEntry[]>();
  
  let registrySheet = workbook.worksheets.find(w => 
    w.name.toUpperCase().includes('REGISTRO')
  ) || (workbook.worksheets.find(w => w.name.toUpperCase().includes('REGISTR'))) || workbook.worksheets[0];
  
  const regRowCount = registrySheet.rowCount;
  for (let r = 5; r <= regRowCount; r++) {
    const row = registrySheet.getRow(r);
    
    // REGISTRO: La Colonna B è il nostro riferimento (ID Utente).
    const rawId = getCellValue(row, 2);
    if (!rawId) continue;
    
    const normId = normalizeId(rawId);
    if (!normId) continue;

    const entry: DeviceEntry = {
      idUtente: String(rawId), 
      nominativo: String(getCellValue(row, 3) || ""),
      azienda: String(getCellValue(row, 4) || ""),
      referente: String(getCellValue(row, 5) || ""),
      matricola: String(getCellValue(row, 6) || ""),
      reparto: String(getCellValue(row, 7) || ""),
      tempistica: String(getCellValue(row, 8) || ""),
      dataConsegna: parseDateForExcel(getCellValue(row, 9)) as any,
      note: String(getCellValue(row, 10) || ""),
      rowIndex: r,
      source: 'REGISTRY'
    };

    if (registryMapCheck.has(normId)) {
        if (!duplicateMap.has(normId)) {
            const original = registryList.find(i => normalizeId(i.idUtente) === normId);
            if (original) duplicateMap.set(normId, [original]);
        }
        duplicateMap.get(normId)?.push(entry);
    }
    registryMapCheck.add(normId);
    registryList.push(entry);
  }

  const duplicates: DuplicateGroup[] = [];
  duplicateMap.forEach((entries, id) => duplicates.push({ id, entries }));

  const newDevicesForRegistry: DeviceEntry[] = [];
  const allElmoDeviceIds = new Set<string>();
  const fullElmoDataForExport: any[] = [];

  // Analizziamo il foglio EL.MO. Utenti DOPO che è stato aggiornato con l'export e le formule
  let elmoSheet = workbook.worksheets.find(w => 
      w.name.toUpperCase().includes("EL.MO") || w.name.toUpperCase().includes("UTENTI")
  ) || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : null);

  if (elmoSheet) {
      const elmoRowCount = elmoSheet.rowCount;
      for (let r = 2; r <= elmoRowCount; r++) {
          const row = elmoSheet.getRow(r);
          const analysis = isRowADevice(row);

          if (analysis.isDevice && analysis.id) {
              allElmoDeviceIds.add(analysis.id);

              // Se è un dispositivo e non è nel registro -> Nuovo suggerimento
              if (!registryMapCheck.has(analysis.id)) {
                  if (!newDevicesForRegistry.some(d => normalizeId(d.idUtente) === analysis.id)) {
                      newDevicesForRegistry.push({
                          idUtente: analysis.id,
                          nominativo: `${String(getCellValue(row, 3) || "")} ${String(getCellValue(row, 4) || "")}`.trim(),
                          azienda: String(getCellValue(row, 1) || ""),
                          referente: "",
                          matricola: "",
                          reparto: String(getCellValue(row, 5) || ""),
                          tempistica: "LUNGO TERMINE",
                          dataConsegna: "",
                          note: "",
                          source: 'ELMO',
                          isNew: true
                      });
                  }
              }
          }

          // Prepariamo i dati per l'export (mantenendo l'ID utile)
          fullElmoDataForExport.push({
              Azienda: getCellValue(row, 1),
              IDUtente: analysis.isDevice ? analysis.id : getCellValue(row, 2),
              Cognome: getCellValue(row, 3),
              Nome: getCellValue(row, 4),
              Reparto: getCellValue(row, 5),
              Gruppo: getCellValue(row, 6),
              Codifica: getCellValue(row, 7),
              Tessera: getCellValue(row, 8)
          });
      }
  }

  // Orfani: Presenti nel Registro ma non trovati come dispositivi in EL.MO.
  const orphanedDevices: DeviceEntry[] = registryList.filter(entry => {
      const nid = normalizeId(entry.idUtente);
      return !allElmoDeviceIds.has(nid);
  });

  // Mismatch di stato (disattivati)
  const mismatches = checkDeactivatedMismatch(workbook);

  return {
    mergedRegistry: registryList,
    newDevices: newDevicesForRegistry,
    elmoDiff: [], 
    fullElmoList: elmoRaw, // Manteniamo i dati grezzi originali per l'export
    elmoNewNames: elmoNewNames, 
    orphanedDevices: orphanedDevices,
    duplicates: duplicates,
    mismatches: mismatches,
    stats: {
      totalRegistry: registryList.length,
      totalElmoDevices: allElmoDeviceIds.size,
      newFoundDevices: newDevicesForRegistry.length,
      newElmoEntries: elmoNewNames.length,
      orphansFound: orphanedDevices.length
    }
  };
};

export const deleteDeviceFromWorkbook = (workbook: ExcelJS.Workbook, rowIndex: number): boolean => {
  let registrySheet = workbook.worksheets.find(w => 
    w.name.toUpperCase().includes('REGISTRO')
  ) || workbook.worksheets[0];

  if (rowIndex > 0) {
      registrySheet.spliceRows(rowIndex, 1);
      repairRegistryFormulas(workbook);
      return true;
  }
  return false;
};

/**
 * Updates the EL.MO. sheet with raw data from export.
 * Intelligent mapping to handle different header names (case-insensitive).
 */
export const updateElmoSheet = (workbook: ExcelJS.Workbook, elmoRaw: any[]): void => {
    let elmoSheet = workbook.worksheets.find(w => 
        w.name.toUpperCase().includes("EL.MO") || w.name.toUpperCase().includes("UTENTI")
    ) || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : null);

    if (!elmoSheet) return;

    // 1. Identifica tutte le formule presenti nella riga 2 (riga template)
    const templateRow = elmoSheet.getRow(2);
    const formulaTemplates: { col: number, formula: string }[] = [];
    templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (cell.formula) {
            formulaTemplates.push({ col: colNumber, formula: cell.formula });
        }
    });

    // 2. Svuota i dati nelle colonne A-H per le righe esistenti, mantenendo le formule
    // Questo previene sovrapposizioni di dati vecchi.
    const rowCount = elmoSheet.rowCount;
    if (rowCount >= 2) {
        for (let i = 2; i <= rowCount; i++) {
            const row = elmoSheet.getRow(i);
            // Svuota colonne dati (1-8)
            for (let c = 1; c <= 8; c++) {
                row.getCell(c).value = null;
            }
        }
    }

    if (!elmoRaw || elmoRaw.length === 0) return;

    // 3. Inserisce i nuovi dati e normalizza la Colonna H (Tessera)
    const dataRows = elmoRaw.slice(1); // Salta intestazione export

    dataRows.forEach((rowData, index) => {
        const rowIndex = index + 2;
        const row = elmoSheet.getRow(rowIndex);
        
        // Aggiorna colonne dati A-G (1-7)
        for (let c = 1; c <= 7; c++) {
            row.getCell(c).value = rowData[c - 1] || "";
        }
        
        // --- NORMALIZZAZIONE COLONNA H (Tessera) ---
        // Scriviamo il valore normalizzato a 10 cifre direttamente in H (8)
        const tesseraRaw = rowData[7]; 
        row.getCell(8).value = normalizeTo10(tesseraRaw);
        // -------------------------------------------
        
        // Propaga le formule del template (riga 2) su tutti i righi successivi
        if (rowIndex > 2) {
            formulaTemplates.forEach(t => {
                // Sostituisce i riferimenti alla riga 2 con la riga corrente (es. P2 -> P10)
                // La regex cerca una lettera seguita da '2' che non sia seguita da altri numeri
                const adjustedFormula = t.formula.replace(/([A-Z]+)2(?!\d)/g, `$1${rowIndex}`);
                row.getCell(t.col).value = { formula: adjustedFormula, result: undefined };
            });
        }
    });

    // 4. Pulisce eventuali righe residue se l'export è più corto del foglio precedente
    const finalDataRowCount = dataRows.length + 1;
    if (rowCount > finalDataRowCount) {
        for (let i = finalDataRowCount + 1; i <= rowCount; i++) {
            elmoSheet.getRow(i).values = [];
        }
    }
};

export const updateWorkbook = async (workbook: ExcelJS.Workbook, registryData: DeviceEntry[], elmoRaw: any[]) => {
  // 1. Aggiorna il foglio EL.MO. Utenti (se abbiamo i dati dell'export)
  if (elmoRaw && Array.isArray(elmoRaw) && elmoRaw.length > 0) {
      updateElmoSheet(workbook, elmoRaw);
  }

  // 2. Aggiorna il foglio Registro
  let registrySheet = workbook.worksheets.find(w => 
    w.name.toUpperCase().includes('REGISTRO')
  ) || workbook.worksheets[0];
  
  // --- MAPPATURA STILI ESISTENTI (SMART STYLE CARRY-OVER) ---
  // Prima di sovrascrivere, salviamo gli stili associati a ciascun ID Utente.
  // Mappiamo: ID -> { rowHeight, styles: { [colIdx]: ExcelJS.Style } }
  const styleMap = new Map<string, { height: number, cells: any[] }>();
  
  // Scansioniamo il foglio attuale
  const regRowCount = registrySheet.rowCount;
  for (let r = 5; r <= regRowCount; r++) {
      const row = registrySheet.getRow(r);
      const idRaw = getCellValue(row, 2);
      const idNorm = normalizeId(idRaw);
      
      if (idNorm) {
          // Salviamo altezza riga e stile per ogni colonna da B a J (2-10)
          const cellStyles: any[] = [];
          for (let c = 2; c <= 10; c++) {
              cellStyles[c] = row.getCell(c).style;
          }
          styleMap.set(idNorm, {
              height: row.height,
              cells: cellStyles
          });
      }
  }
  // ----------------------------------------------------------

  // Usiamo direttamente registryData che è la sorgente di verità aggiornata dalla UI
  const sortedData = [...registryData].sort((a, b) => 
    (a.nominativo || "").toLowerCase().localeCompare((b.nominativo || "").toLowerCase())
  );

  // Recuperiamo gli stili STANDARD dalla riga template (riga 5) per i NUOVI inserimenti
  const templateRow = registrySheet.getRow(5);
  const defaultStyles: any[] = [];
  for(let c=2; c<=10; c++) {
      defaultStyles[c] = templateRow.getCell(c).style;
  }
  const defaultHeight = templateRow.height;

  let currentWriteRow = 5;
  sortedData.forEach(item => {
      const row = registrySheet.getRow(currentWriteRow);
      
      // Mappa i campi alle colonne (B=2, C=3, ..., J=10)
      const values = [
          null, 
          item.idUtente, 
          item.nominativo, 
          item.azienda, 
          item.referente, 
          item.matricola, 
          item.reparto, 
          item.tempistica, 
          item.dataConsegna, 
          item.note
      ];

      // Recuperiamo lo stile salvato per questo utente, se esiste
      const savedStyle = styleMap.get(normalizeId(item.idUtente));

      // Applichiamo l'altezza riga (o quella salvata, o quella standard)
      if (savedStyle && savedStyle.height) {
          row.height = savedStyle.height;
      } else {
          // Se è nuovo, usiamo l'altezza standard ma solo se non è già stata modificata manualmente nel frattempo
          // (per sicurezza usiamo quella del template)
          row.height = defaultHeight;
      }

      for(let c=2; c<=10; c++) {
          const cell = row.getCell(c);
          
          // Scrittura Valori
          if (c === 9) { // Data Consegna
              cell.value = parseDateForExcel(values[c-1]);
              cell.numFmt = 'dd/mm/yyyy';
          } else {
              cell.value = values[c-1] || null;
          }

          // Applicazione Stili
          if (savedStyle && savedStyle.cells[c]) {
              // Se l'utente esisteva, riapplichiamo ESATTAMENTE il suo stile originale per questa colonna
              cell.style = savedStyle.cells[c];
          } else {
              // Se è un utente nuovo (o non mappato), usiamo lo stile del template standard
              if (defaultStyles[c]) {
                  cell.style = { ...defaultStyles[c] };
              }
          }
      }
      currentWriteRow++;
  });

  // 3. Pulisce le righe residue nel Registro
  const totalRows = registrySheet.rowCount;
  if (currentWriteRow <= totalRows) {
      for(let r=currentWriteRow; r<=totalRows; r++) {
          const row = registrySheet.getRow(r);
          for(let c=2; c<=10; c++) {
              row.getCell(c).value = null;
              // Opzionale: Resetta lo stile a quello di default per pulire visualmente
              row.getCell(c).style = {}; 
          }
      }
  }

  // 4. Ripristina i filtri e le formule
  registrySheet.autoFilter = { from: { row: 4, column: 2 }, to: { row: 4, column: 10 } };
  repairRegistryFormulas(workbook);
  
  return workbook;
};

export const checkDeactivatedMismatch = (workbook: ExcelJS.Workbook): MismatchItem[] => {
    let registrySheet = workbook.worksheets.find(w => w.name.toUpperCase().includes('REGISTRO')) || workbook.worksheets[0];
    let elmoSheet = workbook.worksheets.find(w => 
        w.name.toUpperCase().includes("EL.MO") || w.name.toUpperCase().includes("UTENTI")
    ) || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : null);

    if (!elmoSheet) return [];
    const elmoStatusMap = new Map<string, string>();
    for(let r=2; r<=elmoSheet.rowCount; r++) {
        const row = elmoSheet.getRow(r);
        const tessera = getNormalizedIdFromElmoRow(row);
        const gruppo = String(getCellValue(row, 6) || "").toUpperCase();
        if (tessera) elmoStatusMap.set(tessera, gruppo);
    }

    const mismatches: MismatchItem[] = [];
    for(let r=5; r <= registrySheet.rowCount; r++) {
        const row = registrySheet.getRow(r);
        
        // REGISTRO: Colonna B è il riferimento per lo stato.
        const idUtente = normalizeId(getCellValue(row, 2));
        const status = String(getCellValue(row, 8) || "").toUpperCase();
        const nominativo = String(getCellValue(row, 3) || "Sconosciuto");
        if (!idUtente) continue;

        const elmoGroup = elmoStatusMap.get(idUtente);
        if (elmoGroup) {
            const isRegDeactivated = status.includes('DISATTIVAT');
            const isElmoDeactivated = elmoGroup.includes("DISATTIVATI") || elmoGroup.includes("A 00");
            if (isRegDeactivated && !isElmoDeactivated) {
                mismatches.push({ idUtente, nominativo, currentRegStatus: status, elmoGroup, rowIndex: r, sheetNameReg: registrySheet.name, suggestedAction: 'ACTIVATE' });
            } else if (!isRegDeactivated && isElmoDeactivated) {
                mismatches.push({ idUtente, nominativo, currentRegStatus: status, elmoGroup, rowIndex: r, sheetNameReg: registrySheet.name, suggestedAction: 'DEACTIVATE' });
            }
        }
    }
    return mismatches;
};
