
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveFileAs } from './fileSaver';

export interface DeliveryFormData {
  luogo_e_data: string;
  quantita: string;
  tipo_dispositivo: string;
  incaricato_ritiro_e_matricola: string;
  committente_e_matricola: string;
  reparto_committente: string;
  motivazione_rilascio: string;
  
  gruppo_accessi: string;
  accessi_specifici: string;

  lista_dispositivi: {
    affidatario: string;
    codice: string;
  }[];
}

// Internal markers
const MARKERS = {
  DATA: '[DATA]',
  NUM: '[NUM]',
  TIPO: '[TIPO]',
  INCARICATO: '[INCARICATO]',
  COMMITTENTE: '[COMMITTENTE]',
  REPARTO: '[REPARTO]',
  MOTIVO: '[MOTIVO]',
  CHECK_GRUPPO: '[X1]',
  CHECK_SPECIFICI: '[X2]',
  ACCESS_TEXT: '[ACCESS_TEXT]', // Shared text field for access details
  TABLE_LOOP_START: '[#ITEMS]',
  TABLE_LOOP_END: '[/ITEMS]',
  TABLE_NOME: '[NOME]',
  TABLE_CODICE: '[COD]'
};

/**
 * HELPER: Enforces Arial font on a specific Run Element
 */
const ensureRunIsArial = (run: Element, xmlDoc: XMLDocument) => {
    let rPr = run.getElementsByTagName("w:rPr")[0];
    if (!rPr) {
        rPr = xmlDoc.createElement("w:rPr");
        // Insert as first child of run
        if (run.firstChild) {
            run.insertBefore(rPr, run.firstChild);
        } else {
            run.appendChild(rPr);
        }
    }
    
    let rFonts = rPr.getElementsByTagName("w:rFonts")[0];
    if (!rFonts) {
        rFonts = xmlDoc.createElement("w:rFonts");
        rPr.appendChild(rFonts);
    }
    
    // Set Arial for all types (Ascii, High ANSI, Complex Script)
    rFonts.setAttribute("w:ascii", "Arial");
    rFonts.setAttribute("w:hAnsi", "Arial");
    rFonts.setAttribute("w:cs", "Arial");
};

/**
 * HELPER: Safe Text Setter
 * Clears existing text in a cell's first paragraph and inserts the new tag.
 * Allows preserving existing text (append) or overwriting (clean).
 * ENFORCES ARIAL FONT.
 */
const setCellText = (cell: Element, text: string, xmlDoc: XMLDocument, mode: 'APPEND' | 'OVERWRITE' = 'OVERWRITE') => {
    if (!cell) return;
    
    // Find first paragraph in cell
    let p = cell.getElementsByTagName("w:p")[0];
    if (!p) {
        p = xmlDoc.createElement("w:p");
        cell.appendChild(p);
    }

    if (mode === 'OVERWRITE') {
        // Remove all existing runs to clear "..." or placeholders
        while (p.firstChild) {
            p.removeChild(p.firstChild);
        }
    }

    // Create new clean run
    const r = xmlDoc.createElement("w:r");
    
    // Enforce Arial Font
    ensureRunIsArial(r, xmlDoc);

    const t = xmlDoc.createElement("w:t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = (mode === 'APPEND' ? " " : "") + text;
    r.appendChild(t);
    p.appendChild(r);
};

/**
 * HELPER: Replace existing checkbox symbol or Prepend Marker
 * Instead of appending at the end (which creates duplicates), tries to replace the box char.
 * ENFORCES ARIAL FONT.
 */
const injectCheckboxMarker = (cell: Element, marker: string, xmlDoc: XMLDocument) => {
    const boxRegex = /[\u2610\u25A1\u25A0\u2611\uF06F\uF0FE]/g; // Common unicode boxes: ☐, □, ■, ☑
    let replaced = false;

    const runs = Array.from(cell.getElementsByTagName("w:r"));
    
    // 1. Try to find and replace a box character in the existing text
    for (const r of runs) {
        const tNodes = Array.from(r.getElementsByTagName("w:t"));
        for (const t of tNodes) {
             if (t.textContent && boxRegex.test(t.textContent)) {
                 t.textContent = t.textContent.replace(boxRegex, marker);
                 // Ensure the run containing the marker is Arial
                 ensureRunIsArial(r, xmlDoc);
                 replaced = true;
             }
        }
    }

    // 2. If no box found to replace, we PREPEND the marker to the first text node.
    if (!replaced && runs.length > 0) {
        const firstRun = runs[0];
        // Ensure the run is Arial
        ensureRunIsArial(firstRun, xmlDoc);

        const tNodes = Array.from(firstRun.getElementsByTagName("w:t"));
        if (tNodes.length > 0) {
            const firstT = tNodes[0];
            firstT.textContent = marker + " " + (firstT.textContent || "");
        } else {
            // Create a text node if the run is empty
            const t = xmlDoc.createElement("w:t");
            t.setAttribute("xml:space", "preserve");
            t.textContent = marker + " ";
            firstRun.appendChild(t);
        }
    } else if (!replaced && runs.length === 0) {
        // Empty cell, just add it (setCellText enforces Arial)
        setCellText(cell, marker, xmlDoc, 'APPEND');
    }
};

/**
 * SMART TRAVERSAL ENGINE
 */
export const preprocessWordTemplate = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) throw new Error("File vuoto");

        // @ts-ignore
        const PizZipConstructor = PizZip as any;
        const zip = new PizZipConstructor(content);
        
        const docXmlStr = zip.file("word/document.xml")?.asText();
        if (!docXmlStr) throw new Error("Documento Word non valido");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

        const tables = Array.from(xmlDoc.getElementsByTagName("w:tbl"));
        
        tables.forEach(tbl => {
            const rows = Array.from(tbl.getElementsByTagName("w:tr"));
            
            for (let r = 0; r < rows.length; r++) {
                const cells = Array.from(rows[r].getElementsByTagName("w:tc"));
                
                for (let c = 0; c < cells.length; c++) {
                    const rawText = cells[c].textContent || "";
                    // Normalize: remove all non-alphanumeric (including punctuation) and lowercase
                    const cellText = rawText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
                    
                    if (!cellText) continue;

                    const targetIncaricato = "la presente per consegnare al alla sig sig ra indicare anche il cid se personale del gruppo fs";
                    const partialIncaricato = "presente per consegnare al alla sig sig ra indicare anche il cid";

                    if (cellText.includes(targetIncaricato) || cellText.includes(partialIncaricato)) {
                         if (rows[r + 1]) {
                             const targetCells = Array.from(rows[r+1].getElementsByTagName("w:tc"));
                             const target = targetCells[c] || targetCells[0]; 
                             setCellText(target, MARKERS.INCARICATO, xmlDoc, 'OVERWRITE');
                         }
                    }
                    else if (cellText.includes("luogo") && cellText.includes("data")) {
                         if (cells[c + 1]) setCellText(cells[c + 1], MARKERS.DATA, xmlDoc, 'OVERWRITE');
                    }
                    else if (cellText.includes("quantita") || (cellText.includes("consegna") && cellText.includes("n"))) {
                        if (cells[c + 1]) setCellText(cells[c + 1], MARKERS.NUM, xmlDoc, 'OVERWRITE');
                    }
                    else if (cellText.includes("tipo") && (cellText.includes("dispositiv") || cellText.includes("access"))) {
                         if (cells[c + 1]) setCellText(cells[c + 1], MARKERS.TIPO, xmlDoc, 'OVERWRITE');
                    }
                    else if (cellText.includes("committente") && !cellText.includes("reparto")) {
                         if (rows[r + 1]) {
                             const targetCells = Array.from(rows[r+1].getElementsByTagName("w:tc"));
                             const target = targetCells[c] || targetCells[0]; 
                             setCellText(target, MARKERS.COMMITTENTE, xmlDoc, 'OVERWRITE');
                         }
                    }
                    else if (cellText.includes("reparto")) {
                         if (rows[r + 1]) {
                             const targetCells = Array.from(rows[r+1].getElementsByTagName("w:tc"));
                             const target = targetCells[c] || targetCells[0];
                             setCellText(target, MARKERS.REPARTO, xmlDoc, 'OVERWRITE');
                         }
                    }
                    else if (cellText.includes("motiv")) { 
                         if (rows[r + 1]) {
                             const targetCells = Array.from(rows[r+1].getElementsByTagName("w:tc"));
                             const target = targetCells[0]; 
                             setCellText(target, MARKERS.MOTIVO, xmlDoc, 'OVERWRITE');
                         }
                    }
                    else if (cellText.includes("gruppo accessi")) {
                        injectCheckboxMarker(cells[c], MARKERS.CHECK_GRUPPO, xmlDoc);
                        if (rows[r + 1]) {
                            const targetCells = Array.from(rows[r+1].getElementsByTagName("w:tc"));
                            const target = targetCells[0];
                            if (target && !(target.textContent || "").includes(MARKERS.ACCESS_TEXT)) {
                                setCellText(target, MARKERS.ACCESS_TEXT, xmlDoc, 'OVERWRITE');
                            }
                        }
                    }
                    else if (cellText.includes("accessi specifici")) {
                        injectCheckboxMarker(cells[c], MARKERS.CHECK_SPECIFICI, xmlDoc);
                        if (rows[r + 1]) {
                            const targetCells = Array.from(rows[r+1].getElementsByTagName("w:tc"));
                            const target = targetCells[0];
                            if (target && !(target.textContent || "").includes(MARKERS.ACCESS_TEXT)) {
                                setCellText(target, MARKERS.ACCESS_TEXT, xmlDoc, 'OVERWRITE');
                            }
                        }
                    }
                }
            }
            
            let affidatarioIdx = -1;
            let codiceIdx = -1;
            let headerRowIndex = -1;

            for (let r = 0; r < rows.length; r++) {
                const cells = Array.from(rows[r].getElementsByTagName("w:tc"));
                cells.forEach((cell, c) => {
                    const txt = (cell.textContent || "").toLowerCase();
                    if (txt.includes("affidatario")) affidatarioIdx = c;
                    if (txt.includes("codice") || txt.includes("matricola") || txt.includes("dispositivo")) codiceIdx = c;
                });
                if (affidatarioIdx !== -1 && codiceIdx !== -1) {
                    headerRowIndex = r;
                    break;
                }
            }

            if (headerRowIndex !== -1 && rows[headerRowIndex + 1]) {
                const templateRow = rows[headerRowIndex + 1];
                const tCells = Array.from(templateRow.getElementsByTagName("w:tc"));
                
                if (tCells[affidatarioIdx]) {
                    setCellText(tCells[affidatarioIdx], `${MARKERS.TABLE_LOOP_START} ${MARKERS.TABLE_NOME}`, xmlDoc, 'OVERWRITE');
                }
                if (tCells[codiceIdx]) {
                    setCellText(tCells[codiceIdx], `${MARKERS.TABLE_CODICE} ${MARKERS.TABLE_LOOP_END}`, xmlDoc, 'OVERWRITE');
                }
            }
        });

        const serializer = new XMLSerializer();
        const newXmlStr = serializer.serializeToString(xmlDoc);

        zip.file("word/document.xml", newXmlStr);
        
        // @ts-ignore
        const out = zip.generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        resolve(out);

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const generateDeliveryDoc = async (
  templateBlob: Blob, 
  data: DeliveryFormData
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(evt) {
      if (!evt.target?.result) {
        return reject(new Error("Errore lettura file"));
      }
      
      try {
        const content = evt.target.result;
        // @ts-ignore
        const PizZipConstructor = PizZip as any;
        const zip = new PizZipConstructor(content);
        
        // @ts-ignore
        const DocxtemplaterConstructor = Docxtemplater as any;
        const doc = new DocxtemplaterConstructor(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '[', end: ']' }
        });
        
        const CHECKED = "☒";
        const UNCHECKED = "☐";

        let accessTextContent = "";
        if (data.gruppo_accessi && data.gruppo_accessi.trim().length > 0) {
            accessTextContent = data.gruppo_accessi;
        } else if (data.accessi_specifici && data.accessi_specifici.trim().length > 0) {
            accessTextContent = data.accessi_specifici;
        }

        const renderData: any = {
          DATA: data.luogo_e_data,
          NUM: data.quantita,
          TIPO: data.tipo_dispositivo,
          INCARICATO: data.incaricato_ritiro_e_matricola,
          COMMITTENTE: data.committente_e_matricola,
          REPARTO: data.reparto_committente,
          MOTIVO: data.motivazione_rilascio,
          
          X1: data.gruppo_accessi && data.gruppo_accessi.trim().length > 0 ? CHECKED : UNCHECKED,
          X2: data.accessi_specifici && data.accessi_specifici.trim().length > 0 ? CHECKED : UNCHECKED,
          
          ACCESS_TEXT: accessTextContent,

          ITEMS: data.lista_dispositivi.map(item => ({
             NOME: item.affidatario,
             COD: item.codice
          }))
        };

        doc.render(renderData);
        
        // @ts-ignore
        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        
        // Naming logic: Use first affidatario
        const firstAff = data.lista_dispositivi[0]?.affidatario || "Sconosciuto";
        // Simple sanitization
        const cleanName = firstAff.replace(/[^a-z0-9 ]/gi, '').trim();
        const filename = `Verbale Consegna ${cleanName}.docx`;

        await saveFileAs(out, filename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        
        resolve();
      } catch (error) {
        console.error("Docxtemplater Error:", error);
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsBinaryString(templateBlob);
  });
};
