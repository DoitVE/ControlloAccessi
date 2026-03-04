
/**
 * MIFARE Decoder Logic - Bidirectional
 * 
 * Logic:
 * Code = (Matricola * 16) + Version
 * 
 * Therefore:
 * Version = Code % 16
 * Matricola = Code / 16 (Integer division)
 */

const MAX_CODE_LEN = 10;

/**
 * Calculates the final MIFARE Code based on Matricola and Version.
 * Formula: (Matricola * 16) + Version
 */
export const calculateMifareCode = (matricola: string, version: number): string => {
  if (!matricola) return '';

  try {
    const matBig = BigInt(matricola);
    const verBig = BigInt(version);

    // Shift left 4 bits (multiply by 16) and add version
    const finalValue = (matBig * 16n) + verBig;

    let result = finalValue.toString();
    
    // Pad to MAX_CODE_LEN (standard practice for access control systems)
    return result.padStart(MAX_CODE_LEN, '0');
  } catch (e) {
    console.error("Calculation error", e);
    return '';
  }
};

/**
 * Reverse calculates Matricola and Version from a MIFARE Code.
 */
export const reverseMifareCode = (code: string): { matricola: string, version: number } | null => {
  if (!code) return null;

  try {
    const valBig = BigInt(code);

    // Extract Version (last 4 bits / modulo 16)
    // If version is 0, it usually means something is wrong or it's v0, keeping it raw here.
    const version = Number(valBig % 16n);

    // Extract Matricola (shift right 4 bits / div 16)
    const matricola = (valBig / 16n).toString();

    return { matricola, version };
  } catch (e) {
    console.error("Reverse calculation error", e);
    return null;
  }
};
