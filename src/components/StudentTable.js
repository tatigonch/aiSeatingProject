import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import StudentDialog from './StudentDialog';

const StudentTable = ({ 
  students, 
  studentManager, 
  selectedStudent, 
  onStudentSelect, 
  onRemoveStudent 
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  const handleEditStudent = (student) => {
    setStudentToEdit(student);
    setEditDialogOpen(true);
  };

  const handleDeleteStudent = (student) => {
    onRemoveStudent(student);
  };

  const handleRowClick = (student) => {
    onStudentSelect(student);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setStudentToEdit(null);
  };

  const getVisionColor = (vision) => {
    switch (vision) {
      case 'Плохое': return 'error';
      case 'Хорошее': return 'success';
      default: return 'default';
    }
  };

  if (students.length === 0) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height={200}
      >
        <Typography variant="body1" color="textSecondary">
          Нет добавленных учащихся
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 'calc(100vh - 240px)',
          '& .MuiTableRow-root': {
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          },
          '& .selected-row': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          }
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: 65, minWidth: 65 }}>
                №<br/>п/п
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Фамилия и Имя</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Зрение</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Рост</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Конфликты</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Желательное соседство</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => (
              <TableRow 
                key={index}
                className={selectedStudent && selectedStudent.equals(student) ? 'selected-row' : ''}
                onClick={() => handleRowClick(student)}
              >
                <TableCell sx={{ textAlign: 'center', fontWeight: 'medium' }}>{index + 1}</TableCell>
                <TableCell>{student.getFullName()}</TableCell>
                <TableCell>
                  <Chip 
                    label={student.getVision()} 
                    size="small"
                    color={getVisionColor(student.getVision())}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {student.getHeight()} см
                </TableCell>
                <TableCell>
                  {Array.from(student.getConflicts()).length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Array.from(student.getConflicts()).map((conflictStudent, idx) => (
                        <Chip
                          key={idx}
                          label={conflictStudent.getFullName()}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                      Нет конфликтов
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {Array.from(student.getPreferredNeighbors()).length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Array.from(student.getPreferredNeighbors()).map((preferredStudent, idx) => (
                        <Chip
                          key={idx}
                          label={preferredStudent.getFullName()}
                          size="small"
                          variant="outlined"
                          color="success"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                      Нет пожеланий
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStudent(student);
                    }}
                    sx={{ mr: 1 }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStudent(student);
                    }}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <StudentDialog
        open={editDialogOpen}
        student={studentToEdit}
        students={students}
        studentManager={studentManager}
        onClose={handleDialogClose}
        mode="edit"
      />
    </>
  );
};

export default StudentTable;