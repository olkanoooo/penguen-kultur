import { format, parseISO } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ShootingSession } from '../types';

export async function exportSessionsToExcel(
  sessions: ShootingSession[],
  type: 'all' | 'completed' = 'all'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type === 'completed' ? 'Tamamlanmış' : 'Planlı Çekimler');

  worksheet.columns = [
    { header: 'PROGRAM ADI', key: 'programName', width: 30 },
    { header: 'BÖLÜM', key: 'title', width: 35 },
    { header: 'KATEGORİ', key: 'category', width: 20 },
    { header: 'TARİH', key: 'date', width: 15 },
    { header: 'SAAT', key: 'time', width: 12 },
    { header: 'KONUM', key: 'location', width: 25 },
    { header: 'ÇEKİM TÜRÜ', key: 'shootingType', width: 18 },
    { header: 'MODERATÖRLER', key: 'moderators', width: 30 },
    { header: 'KONUKLAR', key: 'guests', width: 30 },
    { header: 'NOTLAR', key: 'notes', width: 40 },
    { header: 'DURUM', key: 'status', width: 18 },
  ];

  const columnColors: Record<string, string> = {
    programName: 'FFAED6F1',
    title: 'FFABEBC6',
    category: 'FFF9E79F',
    date: 'FFF5CBA7',
    time: 'FFD2B4DE',
    location: 'FFA3E4D7',
    shootingType: 'FFFAB1A0',
    moderators: 'FFA29BFE',
    guests: 'FFE8F396',
    notes: 'FFFAD7A0',
    status: 'FFF2D7D5',
  };

  const headerColors: Record<string, string> = {
    programName: 'FF3498DB',
    title: 'FF27AE60',
    category: 'FFF1C40F',
    date: 'FFE67E22',
    time: 'FF8E44AD',
    location: 'FF1ABC9C',
    shootingType: 'FFFD79A8',
    moderators: 'FF6C5CE7',
    guests: 'FFBADB00',
    notes: 'FFF39C12',
    status: 'FFE74C3C',
  };

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  worksheet.columns.forEach((col, idx) => {
    if (col.key && headerColors[col.key]) {
      const cell = headerRow.getCell(idx + 1);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerColors[col.key] },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    }
  });

  const addSessionRow = (s: ShootingSession) => {
    const row = worksheet.addRow({
      programName: s.programName,
      title: s.title,
      category: s.category || 'DİĞER',
      date: format(parseISO(s.startTime), 'dd.MM.yyyy'),
      time: format(parseISO(s.startTime), 'HH:mm'),
      location: s.location,
      shootingType: s.shootingType,
      moderators: s.moderators.join(', '),
      guests: s.guests.join(', '),
      notes: s.notes || '',
      status: s.status,
    });

    row.height = 25;

    worksheet.columns.forEach((col, idx) => {
      if (col.key && columnColors[col.key]) {
        const cell = row.getCell(idx + 1);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: columnColors[col.key] },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { color: { argb: 'FF1E293B' } };
      }
    });
  };

  if (type === 'all') {
    const plannedSessions = sessions
      .filter((s) => s.status !== 'Tamamlandı' && s.status !== 'İptal Edildi')
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

    plannedSessions.forEach(addSessionRow);

    for (let i = 0; i < 5; i++) {
      worksheet.addRow({});
    }

    const separatorRow = worksheet.addRow({ programName: 'TAMAMLANMIŞ ÇEKİMLER ARŞİVİ' });
    separatorRow.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    worksheet.mergeCells(`A${separatorRow.number}:K${separatorRow.number}`);
    separatorRow.alignment = { horizontal: 'center', vertical: 'middle' };
    separatorRow.height = 30;

    const completedSessions = sessions
      .filter((s) => s.status === 'Tamamlandı')
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

    completedSessions.forEach(addSessionRow);
  } else {
    const completedSessions = sessions
      .filter((s) => s.status === 'Tamamlandı')
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

    completedSessions.forEach(addSessionRow);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), 'dd_MM_yyyy');
  const fileName =
    type === 'completed'
      ? `penguen_tv_tamamlanmis_cekimler_${dateStr}.xlsx`
      : `penguen_tv_planli_cekimler_${dateStr}.xlsx`;
  saveAs(new Blob([buffer]), fileName);
}
