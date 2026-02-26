import { Student } from '../models/Student.js';

export class StudentManager {
  constructor() {
    this.students = [];
    this.listeners = [];
  }

  getStudents() {
    return this.students;
  }

  addStudent(student) {
    this.students.push(student);
    this.notifyListeners();
  }

  addStudents(studentsList) {
    this.students.push(...studentsList);
    this.notifyListeners();
  }

  updateStudent(updatedStudent) {
    const index = this.students.findIndex(student => student.equals(updatedStudent));
    if (index !== -1) {
      this.students[index] = updatedStudent;
      this.notifyListeners();
    }
  }

  removeStudent(student) {
    // Remove from conflicts of other students
    this.students.forEach(s => {
      if (s.getConflicts().has(student)) {
        s.removeConflict(student);
      }
    });

    // Remove the student
    const index = this.students.findIndex(s => s.equals(student));
    if (index !== -1) {
      this.students.splice(index, 1);
      this.notifyListeners();
    }
  }

  removeStudents() {
    this.students = [];
    this.notifyListeners();
  }

  findStudentByName(name) {
    return this.students.find(student => 
      student.getFullName().toLowerCase() === name.toLowerCase()
    );
  }

  addStudentListener(listener) {
    this.listeners.push(listener);
  }

  removeStudentListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener([...this.students]));
  }

  // Save to localStorage
  saveToStorage() {
    const data = this.students.map(student => student.toJSON());
    localStorage.setItem('seatingProject_students', JSON.stringify(data));
  }

  // Load from localStorage
  loadFromStorage() {
    const data = localStorage.getItem('seatingProject_students');
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        // First pass: create all students without conflicts
        const studentsMap = new Map();
        parsedData.forEach(studentData => {
          const student = new Student(studentData.name, studentData.vision, studentData.height);
          studentsMap.set(student.name, student);
        });

        // Second pass: add conflicts
        parsedData.forEach(studentData => {
          if (studentData.conflicts) {
            const student = studentsMap.get(studentData.name);
            studentData.conflicts.forEach(conflictName => {
              const conflictStudent = studentsMap.get(conflictName);
              if (conflictStudent) {
                student.addConflict(conflictStudent);
              }
            });
          }
        });

        this.students = Array.from(studentsMap.values());
        this.notifyListeners();
      } catch (error) {
        console.error('Error loading students from storage:', error);
      }
    }
  }

  // Clear storage
  clearStorage() {
    localStorage.removeItem('seatingProject_students');
  }
}