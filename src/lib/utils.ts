export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatTIN(input: string) {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 9) digits = digits.slice(0, 9);
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 3 || i === 6) formatted += '-';
    formatted += digits[i];
  }
  return formatted;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getMonthName(monthNum: number | string) {
  return MONTHS[parseInt(monthNum as string) - 1];
}

export function generateCSV(filename: string, rows: any[][]) {
  const csvContent = rows.map(r => 
    r.map(item => {
      // Escape quotes and commas
      let str = String(item !== null && item !== undefined ? item : '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
