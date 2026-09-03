export const XLSX_ACCEPT =
  ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export function isXlsxFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".xlsx");
}
