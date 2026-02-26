import * as XLSX from 'xlsx';
import { Student } from '../models/Student.js';

export class ExcelFileHandler {
  static importFromExcel(file, studentManager) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // First pass: create all students
          const studentsMap = new Map();
          const studentsData = [];

          jsonData.forEach(row => {
            const name = row['Фамилия и Имя'] || row['Name'] || row['name'];
            const vision = row['Зрение'] || row['Vision'] || row['vision'] || 'Хорошее';
            const heightRaw = row['Рост'] || row['Height'] || row['height'] || 160;
            const height = parseInt(heightRaw) || 160; // Преобразуем в число
            const conflicts = row['Конфликты'] || row['Conflicts'] || row['conflicts'] || '';
            const preferredNeighbors = row['Желательное соседство'] || row['PreferredNeighbors'] || row['preferredNeighbors'] || '';

            if (name) {
              const student = new Student(name.toString().trim(), vision, height);
              studentsMap.set(name, student);
              studentsData.push({
                student,
                conflictNames: conflicts.toString().split(',').map(c => c.trim()).filter(c => c.length > 0),
                preferredNeighborNames: preferredNeighbors.toString().split(',').map(c => c.trim()).filter(c => c.length > 0)
              });
            }
          });

          // Second pass: add conflicts and preferred neighbors
          studentsData.forEach(({ student, conflictNames, preferredNeighborNames }) => {
            conflictNames.forEach(conflictName => {
              const conflictStudent = studentsMap.get(conflictName);
              if (conflictStudent && !student.equals(conflictStudent)) {
                student.addConflict(conflictStudent);
                conflictStudent.addConflict(student);
              }
            });

            preferredNeighborNames.forEach(preferredName => {
              const preferredStudent = studentsMap.get(preferredName);
              if (preferredStudent && !student.equals(preferredStudent)) {
                student.addPreferredNeighbor(preferredStudent);
                preferredStudent.addPreferredNeighbor(student);
              }
            });
          });

          // Add to student manager
          const students = Array.from(studentsMap.values());
          studentManager.removeStudents();
          studentManager.addStudents(students);
          
          resolve(students.length);
        } catch (error) {
          reject(new Error(`Ошибка при чтении файла Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Ошибка при чтении файла'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  static exportToExcel(students, filename = 'students.xlsx') {
    try {
      const data = students.map(student => ({
        'Фамилия и Имя': student.getFullName(),
        'Зрение': student.getVision(),
        'Рост': student.getHeight(),
        'Конфликты': Array.from(student.getConflicts())
          .map(s => s.getFullName())
          .join(', '),
        'Желательное соседство': Array.from(student.getPreferredNeighbors())
          .map(s => s.getFullName())
          .join(', ')
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Учащиеся');

      // Auto-size columns
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 0;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            maxWidth = Math.max(maxWidth, cell.v.toString().length);
          }
        }
        colWidths[C] = { width: Math.min(maxWidth + 2, 50) };
      }
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, filename);
      return true;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error(`Ошибка при экспорте в Excel: ${error.message}`);
    }
  }
}