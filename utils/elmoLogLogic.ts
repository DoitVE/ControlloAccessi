
import ExcelJS from 'exceljs';
import { readCsvOrExcelAsMatrix } from './excelHelper';

const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export interface ProcessedSheet {
    name: string;
    headers: any[];
    rows: any[][];
}

export interface ElmoProcessResult {
    workbook: ExcelJS.Workbook;
    previewData: ProcessedSheet[];
}

/**
 * Tries to parse a date string from EL.MO logs to determine the sheet name.
 * Expected formats: DD/MM/YYYY ... or YYYY-MM-DD ...
 */
const getSheetNameFromData = (dataRows: any[][], fileIndex: number): string => {
    try {
        // Try to find a date in the first few rows and columns
        for (let r = 0; r < Math.min(dataRows.length, 5); r++) {
            for (let c = 0; c < Math.min(dataRows[r].length, 5); c++) {
                const val = String(dataRows[r][c]);
                // Regex for DD/MM/YYYY
                const matchIt = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (matchIt) {
                    const monthIdx = parseInt(matchIt[2]) - 1;
                    const yearShort = matchIt[3].slice(-2);
                    if (MONTHS_IT[monthIdx]) {
                        return `${MONTHS_IT[monthIdx]}-${yearShort}`;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Date parsing failed", e);
    }
    return `Log_${fileIndex + 1}`;
};

export const processElmoLogsToExcel = async (files: File[]): Promise<ElmoProcessResult> => {
    const workbook = new ExcelJS.Workbook();
    const previewData: ProcessedSheet[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Read CSV Data
        const rawMatrix = await readCsvOrExcelAsMatrix(file);
        if (rawMatrix.length === 0) continue;

        // FIX: Remove empty trailing columns often caused by trailing delimiters in CSV
        // We look at the header row. If the last cell is empty, we assume the column is an artifact.
        let matrix = rawMatrix;
        if (matrix.length > 0) {
            const header = matrix[0];
            let validCols = header.length;
            
            // Scan backwards from the end of the header row
            while (validCols > 0) {
                const val = header[validCols - 1];
                // If header is empty/null/undefined, treat column as removable
                if (!val || String(val).trim() === '') {
                    validCols--;
                } else {
                    break;
                }
            }

            // If we found empty trailing columns, slice the whole matrix
            if (validCols < header.length) {
                matrix = matrix.map(row => row.slice(0, validCols));
            }
        }

        // 2. Determine Sheet Name
        // Assume row 0 is header, row 1 is data.
        let sheetName = getSheetNameFromData(matrix.slice(1), i);
        
        // Handle duplicate sheet names
        let counter = 1;
        let originalName = sheetName;
        while (workbook.getWorksheet(sheetName)) {
            counter++;
            sheetName = `${originalName} (${counter})`;
        }

        // Store for Preview (Headers + Body)
        previewData.push({
            name: sheetName,
            headers: matrix[0],
            rows: matrix.slice(1)
        });

        const sheet = workbook.addWorksheet(sheetName);

        // 3. Add Data to Sheet
        sheet.addRows(matrix);

        // 4. Freeze Header Row (Blocca Riquadri Riga 1)
        sheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];

        // 5. Formatting Logic
        const lastRowIdx = matrix.length;
        const lastColIdx = matrix[0].length;
        
        // Define ranges
        // ExcelJS is 1-based.
        const headerRow = sheet.getRow(1);

        // A. Header Styling: Gray background, Bold, Borders, Arial
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' } // Light Gray
            };
            cell.font = { bold: true, name: 'Arial', size: 10 };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        // B. Data Styling: Center Alignment, Borders, Auto-width estimation, Arial Font
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header (already styled)

            row.eachCell((cell) => {
                // Apply borders to all cells
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                // Center alignment
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
                
                // Force Arial on all data cells
                cell.font = { name: 'Arial', size: 10 };
            });
            
            // Auto Height (approximate)
            row.height = 15;
        });

        // C. Improved Auto-Width
        sheet.columns.forEach(column => {
            let maxLength = 0;
            // Scan more rows (up to 100) to catch longer text like in Col C
            const colIdx = (column as any)._number; 
            const sampleLimit = Math.min(lastRowIdx, 100);

            for(let r=1; r<=sampleLimit; r++){
                const cellVal = matrix[r-1][colIdx-1];
                const valStr = cellVal ? String(cellVal) : "";
                
                const len = valStr.length;
                if(len > maxLength) maxLength = len;
            }
            
            // Add padding (+4 chars) and increase max limit to 80 for descriptions
            column.width = Math.min(Math.max(maxLength + 4, 12), 80); 
        });

        // D. Filters on Header
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: lastColIdx }
        };

        // E. Conditional Formatting on Column D (Index 4)
        // Range: D2 : D{lastRow}
        if (lastColIdx >= 4) {
            const rangeRef = `D2:D${lastRowIdx}`;
            
            // 1. Accesso Consentito (Verde Netto)
            // BG: #66FF66 (Bright Green), Text: Black
            sheet.addConditionalFormatting({
                ref: rangeRef,
                rules: [{
                    type: 'containsText',
                    operator: 'containsText',
                    priority: 1,
                    text: 'Accesso Consentito',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF66FF66' } }, 
                        font: { color: { argb: 'FF000000' }, name: 'Arial' } 
                    }
                }]
            });

            // 2. Accesso Negato (Giallo Puro)
            // BG: #FFFF00 (Pure Yellow), Text: Black
            sheet.addConditionalFormatting({
                ref: rangeRef,
                rules: [{
                    type: 'containsText',
                    operator: 'containsText',
                    priority: 2,
                    text: 'Accesso Negato',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFFF00' } }, 
                        font: { color: { argb: 'FF000000' }, name: 'Arial' } 
                    }
                }]
            });

            // 3. Evento porta forzata (Rosso Netto)
            // BG: #FF6666 (Bright Red), Text: Black (for readability on light/mid red)
            sheet.addConditionalFormatting({
                ref: rangeRef,
                rules: [{
                    type: 'containsText',
                    operator: 'containsText',
                    priority: 3,
                    text: 'Evento porta forzata',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF6666' } }, 
                        font: { color: { argb: 'FF000000' }, bold: true, name: 'Arial' } 
                    }
                }]
            });

            // 4. Porta ripristinata (Celeste/Blu Netto)
            // BG: #66CCFF (Sky Blue), Text: Black
            sheet.addConditionalFormatting({
                ref: rangeRef,
                rules: [{
                    type: 'containsText',
                    operator: 'containsText',
                    priority: 4,
                    text: 'Porta ripristinata',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF66CCFF' } }, 
                        font: { color: { argb: 'FF000000' }, name: 'Arial' } 
                    }
                }]
            });

            // 5. Evento porta rimasta aperta (Arancio Netto)
            // BG: #FF9933 (Vivid Orange), Text: Black
            sheet.addConditionalFormatting({
                ref: rangeRef,
                rules: [{
                    type: 'containsText',
                    operator: 'containsText',
                    priority: 5,
                    text: 'Evento porta rimasta aperta',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF9933' } }, 
                        font: { color: { argb: 'FF000000' }, name: 'Arial' } 
                    }
                }]
            });
        }
    }

    return { workbook, previewData };
};
