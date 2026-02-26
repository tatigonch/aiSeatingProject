export class Desk {
  constructor() {
    this.student1 = null;
    this.student2 = null;
  }

  getStudent1() {
    return this.student1;
  }

  setStudent1(student) {
    this.student1 = student;
  }

  getStudent2() {
    return this.student2;
  }

  setStudent2(student) {
    this.student2 = student;
  }

  isEmpty() {
    return !this.student1 && !this.student2;
  }

  isFull() {
    return this.student1 && this.student2;
  }

  hasSpace() {
    return !this.student1 || !this.student2;
  }

  clear() {
    this.student1 = null;
    this.student2 = null;
  }

  getStudents() {
    const students = [];
    if (this.student1) students.push(this.student1);
    if (this.student2) students.push(this.student2);
    return students;
  }

  toJSON() {
    return {
      student1: this.student1 ? this.student1.toJSON() : null,
      student2: this.student2 ? this.student2.toJSON() : null
    };
  }

  static fromJSON(data, allStudents = []) {
    const desk = new Desk();
    if (data.student1) {
      const student1 = allStudents.find(s => s.name === data.student1.name);
      desk.setStudent1(student1 || null);
    }
    if (data.student2) {
      const student2 = allStudents.find(s => s.name === data.student2.name);
      desk.setStudent2(student2 || null);
    }
    return desk;
  }
}