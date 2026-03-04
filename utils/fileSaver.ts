
/**
 * Generic function to trigger a "Save As" dialog.
 * Uses the modern File System Access API if available, falling back to anchor tag download.
 */
export const saveFileAs = async (blob: Blob, suggestedName: string, mimeType: string = 'application/octet-stream') => {
  try {
    // @ts-ignore - TypeScript might not know about showSaveFilePicker yet
    if (window.showSaveFilePicker) {
      // Determine extension from suggestedName
      const extension = suggestedName.includes('.') ? '.' + suggestedName.split('.').pop() : '';
      
      const options = {
        suggestedName,
        types: [{
          description: 'File',
          accept: { [mimeType]: [extension] }
        }]
      };
      
      // @ts-ignore
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
    throw new Error("API not supported");
  } catch (err) {
    // Fallback or user cancelled (AbortError)
    // If it's a real error/fallback, proceed with legacy download
    if ((err as Error).name !== 'AbortError') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  }
};
