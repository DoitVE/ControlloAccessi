import { saveFileAs } from "./fileSaver";

// Mail Generator Logic v1.7

export type MailCase = 
  | 'CASE_1_DOIT_NO_TIMBRA'
  | 'CASE_3_TIMBRA_VIA_TRENTO'
  | 'CASE_6_PULIZIE_SWAP';

export interface PersonEntry {
  nominativo: string;
  code: string; // Matricola or Tessera depending on context
  ditta?: string; // Optional, used for Pulizie (legacy/future proof)
}

export interface MailFormData {
  // Multi-person support for Cases 1 & 3
  entries: PersonEntry[];
  
  // Specific for Case 6 (Swap) - Single person logic
  swapTessera?: string;
  oldNominativo?: string;
  oldDitta?: string;
  newNominativo?: string;
  newDitta?: string;
}

const normalizeMatricola = (code: string | undefined): string => {
  if (!code) return "";
  const trimmed = code.trim();
  // Only pad if it is a numeric string
  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(8, '0');
  }
  return trimmed;
};

// Ensure Arial in common table
const COMMON_HEADER_TABLE = `
<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; width: 100%; border: 1px solid black;">
  <tr>
    <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; width: 20%; font-family: Arial, sans-serif;">AMBIENTE</td>
    <td style="width: 80%; font-family: Arial, sans-serif;">Produzione</td>
  </tr>
  <tr>
    <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; font-family: Arial, sans-serif;">APPLICAZIONE</td>
    <td style="font-family: Arial, sans-serif;">RILEVAZIONE PRESENZE E CONTROLLO ACCESSI - BUIF101 (G01-CF-RILPRES)</td>
  </tr>
  <tr>
    <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; font-family: Arial, sans-serif;">CATEGORIA</td>
    <td style="font-family: Arial, sans-serif;">UTENZE</td>
  </tr>
</table>
`;

const ACCESS_LISTS: Record<string, string[]> = {
  CASE_1: [
    "Mestre: Via Trento 38 - Cancelletto laterale Tornelli (1232_CA)",
    "Mestre: Via Trento 38 - Cancello Accesso Pedonale",
    "Mestre: Via Trento 38 - Cancellone Accesso Carraio",
    "Mestre: Via Trento 38 - Mensa"
  ],
  CASE_3: [
    "Mestre: Via Trento 38 - Cancello Accesso Pedonale",
    "Mestre: Via Trento 38 - Cancellone Accesso Carraio"
  ],
  CASE_6: [
    "Mestre: Via Trento 38 - Cancelletto laterale Tornelli (1232_CA)",
    "Mestre: Via Trento 38 - Cancello Accesso Pedonale",
    "Mestre: Via Trento 38 - Cancellone Accesso Carraio",
    "Mestre: Via Trento 38 - Mensa"
  ]
};

const FOOTER_CASE_6 = `
<p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; margin-top: 20px;">
  CANCELLARE E SOSTITUIRE OGNI EVENTUALE PRECEDENTE NOMINATIVO ASSEGNATO AI DISPOSITIVI DI ACCESSO IN OGGETTO E DISATTIVARE EVENTUALI PRECEDENTI ABILITAZIONI DI ACCESSO AL COMPENDIO RFI DI MESTRE (VE) DIFFERENTI DALLA PRESENTE RICHIESTA.
</p>
`;

const FOOTER_STD = `
<p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; margin-top: 20px;">
  DISATTIVARE EVENTUALI PRECEDENTI ABILITAZIONI DI ACCESSO AL COMPENDIO RFI DI MESTRE (VE) DIFFERENTI DALLA PRESENTE RICHIESTA - FATTA ECCEZIONE PER EVENTUALI ABILITAZIONI "_SAP" UTILI ALLA RILEVAZIONE PRESENZE
</p>
`;

const generateRecipientTable = (caseType: MailCase, data: MailFormData) => {
  if (caseType === 'CASE_6_PULIZIE_SWAP') {
    // Swap remains single case
    return `
    <p style="font-family: Arial, sans-serif;">Per il seguente dispositivo di accesso:</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; width: 40%; border: 1px solid black; margin-bottom: 20px;">
       <tr>
         <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; font-family: Arial, sans-serif;">DISPOSITIVO DI ACCESSO</td>
       </tr>
       <tr>
         <td style="text-align: center; font-family: Arial, sans-serif;">${normalizeMatricola(data.swapTessera)}</td>
       </tr>
    </table>

    <p style="font-family: Arial, sans-serif;">Attualmente affidata a:</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; width: 60%; border: 1px solid black; margin-bottom: 20px;">
       <tr>
         <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; width: 50%; font-family: Arial, sans-serif;">NOMINATIVO</td>
         <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; width: 50%; font-family: Arial, sans-serif;">DITTA ESTERNA</td>
       </tr>
       <tr>
         <td style="text-align: center; font-family: Arial, sans-serif;">${data.oldNominativo || ''}</td>
         <td style="text-align: center; font-family: Arial, sans-serif;">${data.oldDitta || ''}</td>
       </tr>
    </table>

    <p style="font-family: Arial, sans-serif;">Si richiede modifica nominativo dell'affidatario in:</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; width: 60%; border: 1px solid black;">
       <tr>
         <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; width: 50%; font-family: Arial, sans-serif;">NOMINATIVO</td>
         <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; width: 50%; font-family: Arial, sans-serif;">DITTA ESTERNA</td>
       </tr>
       <tr>
         <td style="text-align: center; font-family: Arial, sans-serif;">${data.newNominativo || ''}</td>
         <td style="text-align: center; font-family: Arial, sans-serif;">${data.newDitta || ''}</td>
       </tr>
    </table>
    `;
  } else {
    // Standard Case 1 & 3 (Multi-row)
    const rows = data.entries.map(entry => `
      <tr>
        <td style="text-align: center; font-family: Arial, sans-serif;">${entry.nominativo || ''}</td>
        <td style="text-align: center; font-family: Arial, sans-serif;">${normalizeMatricola(entry.code)}</td>
      </tr>
    `).join('');

    return `
    <p style="font-family: Arial, sans-serif;">Per i Colleghi:</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; width: 60%; border: 1px solid black;">
      <tr>
        <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; width: 60%; font-family: Arial, sans-serif;">NOMINATIVO</td>
        <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; text-align: center; width: 40%; font-family: Arial, sans-serif;">MATRICOLA</td>
      </tr>
      ${rows}
    </table>`;
  }
};

const getSubject = (caseType: MailCase, data: MailFormData) => {
  const base = "Richiesta abilitazione accessi via Trento, 38 Mestre (VE) Gruppo assegnazione BUIF101 (G01-CF-RILPRES)";
  
  // Construct the "Name (Code)" list string
  let namesList = "";
  
  if (caseType === 'CASE_6_PULIZIE_SWAP') {
    const part = `${data.newNominativo || 'Richiesta'} (${normalizeMatricola(data.swapTessera) || 'N/A'})`;
    return `Richiesta variazione assegnatario accessi via Trento, 38 Mestre (VE) Gruppo assegnazione BUIF101 (G01-CF-RILPRES) - ${part}`;
  } else {
    // For others, map the entries
    if (data.entries && data.entries.length > 0) {
        const parts = data.entries
            .filter(e => e.nominativo) // ensure not empty
            .map(e => `${e.nominativo} (${normalizeMatricola(e.code)})`)
            .join(', ');
        
        if (parts.length > 0) {
            namesList = ` - ${parts}`;
        }
    }
  }

  return `${base}${namesList}`;
};

const getPreambolo = (caseType: MailCase) => {
    if (caseType === 'CASE_6_PULIZIE_SWAP') {
        return "Si richiede <strong>verifica delle seguenti abilitazioni di accesso</strong>:";
    }
    return "Si richiede <strong>l'attivazione delle seguenti abilitazioni di accesso</strong>:";
};

const getAccessListHtml = (caseType: MailCase) => {
  let accessKey = "";
  if (caseType === 'CASE_1_DOIT_NO_TIMBRA') accessKey = "CASE_1";
  else if (caseType === 'CASE_3_TIMBRA_VIA_TRENTO') accessKey = "CASE_3";
  else if (caseType === 'CASE_6_PULIZIE_SWAP') accessKey = "CASE_6";

  const items = ACCESS_LISTS[accessKey];

  if (!items || items.length === 0) return "";

  const rows = items.map(item => `
    <tr>
      <td style="font-family: Arial, sans-serif;">${item}</td>
    </tr>
  `).join('');

  return `
  <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; width: 100%; border: 1px solid black;">
    <tr>
      <td bgcolor="#D9D9D9" style="background-color: #D9D9D9; font-weight: bold; font-family: Arial, sans-serif;">VARCHI DI ACCESSO RICHIESTI</td>
    </tr>
    ${rows}
  </table>
  `;
};

export const generateEmlFile = async (caseType: MailCase, data: MailFormData) => {
  console.log("Generating EML for case:", caseType);
  const recipient = "Service Desk - Almaviva <servicedeskaeta@almaviva.it>";
  const ccRecipient = "alma_ca_rfi@almaviva.it";
  const subject = getSubject(caseType, data);
  
  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #000000; }
  p { margin-bottom: 10px; font-family: Arial, sans-serif; }
  table { margin-bottom: 15px; font-family: Arial, sans-serif; }
  td { font-family: Arial, sans-serif; }
  li { font-family: Arial, sans-serif; }
  span { font-family: Arial, sans-serif; }
</style>
</head>
<body style="font-family: Arial, sans-serif; font-size: 11pt;">
  <p style="font-family: Arial, sans-serif;">Buongiorno,</p>
  <p style="font-family: Arial, sans-serif;">Premettendo le seguenti informazioni utili alla presa in carico:</p>
  
  ${COMMON_HEADER_TABLE}
  
  ${generateRecipientTable(caseType, data)}
  
  <p style="font-family: Arial, sans-serif;">${getPreambolo(caseType)}</p>
  
  ${getAccessListHtml(caseType)}
  
  ${caseType === 'CASE_6_PULIZIE_SWAP' ? FOOTER_CASE_6 : FOOTER_STD}
  
  <p style="font-family: Arial, sans-serif;">Grazie,<br>Cordiali saluti</p>
</body>
</html>
  `;

  // Construct EML Content
  const emlContent = [
    'To: ' + recipient,
    'Cc: ' + ccRecipient,
    'Subject: ' + subject,
    'X-Unsent: 1', // Opens as Draft
    'Content-Type: text/html; charset="utf-8"',
    '',
    bodyHtml
  ].join('\r\n');

  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  
  // Naming logic
  let namePart = "Generico";
  if (data.entries && data.entries.length > 0) {
      // Use first person's name for filename or "Multiplo"
      namePart = data.entries[0].nominativo || "Multiplo";
  } else if (data.newNominativo) {
      namePart = data.newNominativo;
  }

  namePart = namePart.replace(/[^a-z0-9]/gi, '_').substring(0,30);
  const filename = `Richiesta Abilitazioni ${namePart}.eml`;

  await saveFileAs(blob, filename, 'message/rfc822');
};
