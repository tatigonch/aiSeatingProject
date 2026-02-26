import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Box,
  Typography,
  Autocomplete
} from '@mui/material';
import { Student } from '../models/Student';

const StudentDialog = ({ 
  open, 
  student, 
  students, 
  studentManager, 
  onClose, 
  mode = 'add' 
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    vision: 'Хорошее',
    height: '',
    conflicts: [],
    preferredNeighbors: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === 'edit' && student) {
      setFormData({
        fullName: student.getFullName(),
        vision: student.getVision(),
        height: student.getHeight(),
        conflicts: Array.from(student.getConflicts()),
        preferredNeighbors: Array.from(student.getPreferredNeighbors())
      });
    } else {
      setFormData({
        fullName: '',
        vision: 'Хорошее',
        height: '',
        conflicts: [],
        preferredNeighbors: []
      });
    }
    setErrors({});
  }, [mode, student, open]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Пожалуйста, введите фамилию и имя';
    }
    
    if (!formData.vision) {
      newErrors.vision = 'Пожалуйста, выберите зрение';
    }

    // Check for duplicate name (except when editing the same student)
    const existingStudent = students.find(s => 
      s.getFullName().toLowerCase() === formData.fullName.trim().toLowerCase() &&
      (mode === 'add' || !s.equals(student))
    );
    if (existingStudent) {
      newErrors.fullName = 'Учащийся с таким именем уже существует';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (mode === 'edit' && student) {
        // Remove old conflicts
        Array.from(student.getConflicts()).forEach(conflictStudent => {
          conflictStudent.removeConflict(student);
        });

        // Remove old preferred neighbors
        Array.from(student.getPreferredNeighbors()).forEach(preferredStudent => {
          preferredStudent.removePreferredNeighbor(student);
        });

        // Update student data
        student.setFullName(formData.fullName.trim());
        student.setVision(formData.vision);
        student.setHeight(formData.height);
        student.setConflicts(new Set());
        student.setPreferredNeighbors(new Set());

        // Add new conflicts
        formData.conflicts.forEach(conflictStudent => {
          student.addConflict(conflictStudent);
          conflictStudent.addConflict(student);
        });

        // Add new preferred neighbors
        formData.preferredNeighbors.forEach(preferredStudent => {
          student.addPreferredNeighbor(preferredStudent);
          preferredStudent.addPreferredNeighbor(student);
        });

        studentManager.updateStudent(student);
      } else {
        // Create new student
        const newStudent = new Student(
          formData.fullName.trim(),
          formData.vision,
          formData.height
        );

        // Add conflicts
        formData.conflicts.forEach(conflictStudent => {
          newStudent.addConflict(conflictStudent);
          conflictStudent.addConflict(newStudent);
        });

        // Add preferred neighbors
        formData.preferredNeighbors.forEach(preferredStudent => {
          newStudent.addPreferredNeighbor(preferredStudent);
          preferredStudent.addPreferredNeighbor(newStudent);
        });

        studentManager.addStudent(newStudent);
      }

      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
      setErrors({ general: 'Произошла ошибка при сохранении данных' });
    }
  };

  const handleFieldChange = (field, value) => {
    let updatedValue = value;

    // Validate that the same student cannot be in both conflicts and preferred neighbors
    if (field === 'conflicts') {
      // Remove from preferredNeighbors if adding to conflicts
      const updatedPreferredNeighbors = formData.preferredNeighbors.filter(
        pn => !value.some(c => c.equals(pn))
      );
      setFormData(prev => ({
        ...prev,
        conflicts: value,
        preferredNeighbors: updatedPreferredNeighbors
      }));

      // Clear errors
      if (errors.conflicts || errors.preferredNeighbors) {
        setErrors(prev => ({
          ...prev,
          conflicts: undefined,
          preferredNeighbors: undefined
        }));
      }
      return;
    }

    if (field === 'preferredNeighbors') {
      // Remove from conflicts if adding to preferredNeighbors
      const updatedConflicts = formData.conflicts.filter(
        c => !value.some(pn => pn.equals(c))
      );
      setFormData(prev => ({
        ...prev,
        preferredNeighbors: value,
        conflicts: updatedConflicts
      }));

      // Clear errors
      if (errors.conflicts || errors.preferredNeighbors) {
        setErrors(prev => ({
          ...prev,
          conflicts: undefined,
          preferredNeighbors: undefined
        }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: updatedValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const getAvailableConflicts = () => {
    return students.filter(s => 
      !s.equals(student) && 
      s.getFullName().toLowerCase() !== formData.fullName.toLowerCase()
    );
  };

  const title = mode === 'edit' ? 'Редактировать учащегося' : 'Добавить учащегося';
  const buttonText = mode === 'edit' ? 'Сохранить' : 'Добавить';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        {title}
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {errors.general && (
            <Typography color="error" variant="body2">
              {errors.general}
            </Typography>
          )}

          <TextField
            label="Фамилия и Имя"
            value={formData.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            error={!!errors.fullName}
            helperText={errors.fullName}
            fullWidth
            variant="outlined"
            autoFocus
          />

          <FormControl fullWidth error={!!errors.vision}>
            <InputLabel>Зрение</InputLabel>
            <Select
              value={formData.vision}
              onChange={(e) => handleFieldChange('vision', e.target.value)}
              label="Зрение"
            >
              <MenuItem value="Хорошее">Хорошее</MenuItem>
              <MenuItem value="Плохое">Плохое</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Рост (см)"
            type="number"
            value={formData.height}
            onChange={(e) => handleFieldChange('height', parseInt(e.target.value) || '')}
            error={!!errors.height}
            helperText={errors.height}
            fullWidth
            variant="outlined"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Конфликты с другими учащимися
            </Typography>
            <Autocomplete
              multiple
              options={getAvailableConflicts()}
              getOptionLabel={(option) => option.getFullName()}
              value={formData.conflicts}
              onChange={(event, newValue) => handleFieldChange('conflicts', newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.getFullName()}
                    size="small"
                    {...getTagProps({ index })}
                    key={option.getFullName()}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={formData.conflicts.length === 0 ? "Выберите учащихся" : ""}
                  variant="outlined"
                />
              )}
              noOptionsText="Нет доступных учащихся"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Желательное соседство
            </Typography>
            <Autocomplete
              multiple
              options={getAvailableConflicts()}
              getOptionLabel={(option) => option.getFullName()}
              value={formData.preferredNeighbors}
              onChange={(event, newValue) => handleFieldChange('preferredNeighbors', newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.getFullName()}
                    size="small"
                    color="success"
                    {...getTagProps({ index })}
                    key={option.getFullName()}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={formData.preferredNeighbors.length === 0 ? "Выберите учащихся" : ""}
                  variant="outlined"
                />
              )}
              noOptionsText="Нет доступных учащихся"
            />
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Отмена
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          sx={{ ml: 1 }}
        >
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentDialog;