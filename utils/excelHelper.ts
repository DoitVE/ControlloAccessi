
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs';
import { saveFileAs } from './fileSaver';

/**
 * Common logic to find headers and extract JSON from a worksheet.
 * extracted to be reused for both XLSX (Binary read) and CSV (Text read).
 */
const extractDataFromWorksheet = (worksheet: XLSX.WorkSheet): any[] => {
  // Find header row intelligently
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  const KNOWN_HEADERS = ['DISPOSITIVO D\'ACCESSO', 'CODICI MIFARE', 'IDUtente', 'IDUTENTE', 'COGNOME', 'NOME'];
  
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const rowString = JSON.stringify(rawData[i]).toUpperCase();
    const hasMatch = KNOWN_HEADERS.some(k => rowString.includes(k.toUpperCase()));
    if (hasMatch) {
      headerRowIndex = i;
      break;
    }
  }

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: "",
    range: headerRowIndex 
  });

  return jsonData;
};

/**
 * Reads an Excel file (EL.MO export) and returns it as a generic JSON array based on headers.
 * Uses XLSX for speed on raw data files.
 * Handles CSVs with "Smart Separator" logic for Italian formats (;).
 */
export const readExcelFile = async (file: File): Promise<any[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  // header: 1 returns an array of arrays (raw rows)
  return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
};

/**
 * Reads a CSV or Excel file and returns a Raw Matrix (Array of Arrays).
 * Essential for strict coordinate-based operations (Row 0, Row 1, etc.)
 */
export const readCsvOrExcelAsMatrix = (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onabort = () => reject(new Error('Lettura file annullata'));
    reader.onerror = () => reject(new Error('Errore lettura file'));

    if (isCsv) {
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length === 0) { resolve([]); return; }

                const firstLine = lines[0];
                const semiCount = (firstLine.match(/;/g) || []).length;
                const commaCount = (firstLine.match(/,/g) || []).length;
                const separator = semiCount > commaCount ? ';' : ',';

                const matrix = lines.map(line => {
                    return line.split(separator).map(cell => {
                        let val = cell.trim();
                        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                        return val;
                    });
                });
                resolve(matrix);
            } catch (err) { reject(err); }
        };
        reader.readAsText(file, 'windows-1252');
    } else {
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' }); // Read as array buffer logic equivalent
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
                resolve(matrix);
            } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
    }
  });
}


/**
 * Loads a Workbook using ExcelJS to preserve styles, formulas and structure.
 */
export const loadExcelJSWorkbook = async (file: File): Promise<ExcelJS.Workbook> => {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
};

/**
 * Saves an ExcelJS Workbook to a file.
 */
export const saveExcelJSWorkbook = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  await saveFileAs(blob, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};
