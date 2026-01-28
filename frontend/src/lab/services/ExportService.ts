/**
 * ExportService
 * Provides export functionality for simulation data
 */

export class ExportService {
  /**
   * Export data as CSV and trigger download
   */
  static downloadCSV(csv: string, filename: string = 'simulation-data.csv'): void {
    console.debug(`[ExportService] Downloading CSV as ${filename}, size: ${csv.length} bytes`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.debug('[ExportService] CSV download completed');
  }

  /**
   * Export data as JSON and trigger download
   */
  static downloadJSON(data: unknown, filename: string = 'simulation-data.json'): void {
    console.debug(`[ExportService] Downloading JSON as ${filename}`);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.debug('[ExportService] JSON download completed');
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      console.debug('[ExportService] Copying to clipboard, size: ' + text.length + ' chars');
      await navigator.clipboard.writeText(text);
      console.debug('[ExportService] Clipboard copy completed');
      return true;
    } catch (err) {
      console.error('[ExportService] Clipboard copy failed:', err);
      return false;
    }
  }
}
