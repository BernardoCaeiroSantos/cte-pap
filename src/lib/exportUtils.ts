import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

type ExportData = Record<string, any>[];

export function exportToCSV(data: ExportData, filename: string, headers: Record<string, string>) {
  if (data.length === 0) return;

  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);

  const csvContent = [
    headerValues.join(','),
    ...data.map(row =>
      headerKeys
        .map(key => {
          const value = row[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(data: ExportData, filename: string, headers: Record<string, string>) {
  if (data.length === 0) return;

  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);

  // Create XML for Excel
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Worksheet ss:Name="Relatório">\n';
  xml += '<Table>\n';

  // Header row
  xml += '<Row>\n';
  headerValues.forEach(header => {
    xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
  });
  xml += '</Row>\n';

  // Data rows
  data.forEach(row => {
    xml += '<Row>\n';
    headerKeys.forEach(key => {
      const value = row[key];
      const type = typeof value === 'number' ? 'Number' : 'String';
      const displayValue = value === null || value === undefined ? '' : String(value);
      xml += `<Cell><Data ss:Type="${type}">${escapeXml(displayValue)}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
  });

  xml += '</Table>\n';
  xml += '</Worksheet>\n';
  xml += '</Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xls`);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDateForExport(date: string | Date | null): string {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: pt });
}
