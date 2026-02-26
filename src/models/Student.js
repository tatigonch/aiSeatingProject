export class Student {
  constructor(name, vision, height) {
    this.name = name;
    this.vision = vision;
    this.height = height;
    this.conflicts = new Set();
    this.preferredNeighbors = new Set();
  }

  getFullName() {
    return this.name;
  }

  setFullName(fullName) {
    this.name = fullName;
  }

  getVision() {
    return this.vision;
  }

  setVision(vision) {
    this.vision = vision;
  }

  getHeight() {
    return this.height;
  }

  setHeight(height) {
    this.height = height;
  }

  getConflicts() {
    return this.conflicts;
  }

  setConflicts(conflicts) {
    this.conflicts = new Set(conflicts);
  }

  addConflict(student) {
    this.conflicts.add(student);
  }

  removeConflict(student) {
    this.conflicts.delete(student);
  }

  getPreferredNeighbors() {
    return this.preferredNeighbors;
  }

  setPreferredNeighbors(preferredNeighbors) {
    this.preferredNeighbors = new Set(preferredNeighbors);
  }

  addPreferredNeighbor(student) {
    this.preferredNeighbors.add(student);
  }

  removePreferredNeighbor(student) {
    this.preferredNeighbors.delete(student);
  }

  toString() {
    return this.name;
  }

  equals(other) {
    if (!other || !(other instanceof Student)) return false;
    return this.name === other.name;
  }

  toJSON() {
    return {
      name: this.name,
      vision: this.vision,
      height: this.height,
      conflicts: Array.from(this.conflicts).map(s => s.name),
      preferredNeighbors: Array.from(this.preferredNeighbors).map(s => s.name)
    };
  }

  static fromJSON(data, allStudents = []) {
    const student = new Student(data.name, data.vision, data.height);
    if (data.conflicts) {
      data.conflicts.forEach(conflictName => {
        const conflictStudent = allStudents.find(s => s.name === conflictName);
        if (conflictStudent) {
          student.addConflict(conflictStudent);
        }
      });
    }
    if (data.preferredNeighbors) {
      data.preferredNeighbors.forEach(preferredName => {
        const preferredStudent = allStudents.find(s => s.name === preferredName);
        if (preferredStudent) {
          student.addPreferredNeighbor(preferredStudent);
        }
      });
    }
    return student;
  }
}