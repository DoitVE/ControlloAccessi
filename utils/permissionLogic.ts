
import ExcelJS from 'exceljs';
import { readCsvOrExcelAsMatrix } from './excelHelper';

export interface PermissionData {
  headers: string[]; // From CSV Row 0 (starting Col B)
  body: any[][];     // From CSV Row 1 onwards
}

const transformValue = (val: any): any => {
  if (typeof val === 'string' && val.trim().toLowerCase() === 'sempre') {
    return 'Abilitato';
  }
  return val;
};

export const processPermissionFiles = async (
  workbook: ExcelJS.Workbook, 
  csvFile: File
): Promise<{ processedData: PermissionData, originalWorkbook: ExcelJS.Workbook }> => {
  
  const csvMatrix = await readCsvOrExcelAsMatrix(csvFile);

  if (csvMatrix.length < 2) {
    throw new Error("Il file CSV sembra vuoto o non ha abbastanza righe.");
  }

  // --- FIX: Remove trailing empty columns ---
  // Fixes issue where trailing delimiters in CSV might expand the detected width
  let matrix = csvMatrix;
  if (matrix.length > 0) {
      const header = matrix[0];
      let validCols = header.length;
      
      // Look backwards for empty header cells to identify trailing columns
      while (validCols > 0) {
          const val = header[validCols - 1];
          if (!val || String(val).trim() === '') {
              validCols--;
          } else {
              break;
          }
      }

      // If we found empty columns at the end, strip them from all rows
      if (validCols < header.length) {
          matrix = matrix.map(row => row.slice(0, validCols));
      }
  }

  const rawHeaders = matrix[0].slice(1); 
  const headers = rawHeaders.map(h => String(h).trim());

  const rawBody = matrix.slice(1);
  const body = rawBody.map(row => row.map(transformValue));

  return {
    processedData: {
      headers,
      body
    },
    originalWorkbook: workbook
  };
};

export const updatePermissionsWorkbook = async (
  workbook: ExcelJS.Workbook, 
  data: PermissionData
) => {
  let sheet = workbook.worksheets.find(w => 
    w.name.toUpperCase().includes("EL.MO") && w.name.toUpperCase().includes("GRUPPI")
  );

  if (!sheet) {
    sheet = workbook.worksheets.find(w => w.name.toUpperCase().includes("GRUPPI"));
  }
  if (!sheet) {
     throw new Error("Impossibile trovare il foglio 'EL.MO. Gruppi' nel file Excel.");
  }

  const csvWidth = data.headers.length + 1; // Col A (Gruppo) + data.headers (starting at B)

  // --- STEP 1: WRITE HEADERS (Row 2) ---
  // We only overwrite columns B onwards that are present in the CSV.
  // This preserves any existing notes or placeholders in columns like DQ.
  const headerRow = sheet.getRow(2);
  data.headers.forEach((val, idx) => {
    const cell = headerRow.getCell(idx + 2); // Data starts from Column B (2)
    cell.value = val; 
  });
  headerRow.commit();

  // --- STEP 2: WRITE BODY (Row 3+) ---
  // We iterate through the CSV rows and update only the columns provided.
  data.body.forEach((rowValues, rIdx) => {
    const currentRow = sheet.getRow(rIdx + 3); 
    
    // OVERWRITE ONLY CSV COLUMNS: this ensures that any data to the right
    // of the permission matrix (e.g. from column DQ) is NOT deleted.
    rowValues.forEach((val, cIdx) => {
      const cell = currentRow.getCell(cIdx + 1); 
      cell.value = val; 
    });
    
    currentRow.commit();
  });

  // --- STEP 3: CLEANUP EXTRA ROWS (ONLY THE PERMISSION COLUMNS) ---
  // If the new CSV has fewer groups than the existing sheet, we clear the 
  // "orphaned" rows but ONLY for the columns that contain permissions.
  const totalRows = sheet.rowCount;
  const newRowCount = 3 + data.body.length; 
  
  if (totalRows >= newRowCount) {
      for(let r = newRowCount; r <= totalRows; r++) {
          const row = sheet.getRow(r);
          // Clear only the columns used by the permission tool
          for (let c = 1; c <= csvWidth; c++) {
              row.getCell(c).value = null;
          }
          row.commit();
      }
  }

  // Calculate range for conditional formatting
  const endRow = 3 + data.body.length;
  
  const colLetter = (colIdx: number) => {
      let temp, letter = '';
      while (colIdx > 0) {
        temp = (colIdx - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIdx = (colIdx - temp - 1) / 26;
      }
      return letter;
  }

  const finalRef = `A3:${colLetter(csvWidth)}${endRow}`;

  // Add conditional formatting for "Abilitato" (Green Fill)
  sheet.addConditionalFormatting({
    ref: finalRef,
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        priority: 1,
        formulae: ['"Abilitato"'],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFC6EFCE' }, 
          },
          font: {
             color: { argb: 'FF006100' } 
          }
        },
      }
    ]
  });

  return workbook;
};
