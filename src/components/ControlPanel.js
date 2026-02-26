import React, { useState, useRef } from 'react';
import {
  Button,
  Stack,
  Divider,
  Typography,
  Alert,
  Snackbar,
  Box,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Remove,
  AutoAwesome,
  Clear,
  Upload,
  Download,
  CameraAlt,
  Person,
  Edit,
  DeleteSweep
} from '@mui/icons-material';
import { ExcelFileHandler } from '../utils/ExcelFileHandler';
import StudentDialog from './StudentDialog';

const ControlPanel = ({
  studentManager,
  students,
  desks,
  selectedStudent,
  isArranging,
  onAddRow,
  onRemoveRow,
  onArrangeStudents,
  onClearDesks,
  onTakeScreenshot
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const fileInputRef = useRef(null);

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const count = await ExcelFileHandler.importFromExcel(file, studentManager);
      showSnackbar(`Успешно импортировано ${count} учащихся`, 'success');
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveToExcel = () => {
    if (students.length === 0) {
      showSnackbar('Нет данных для экспорта', 'warning');
      return;
    }

    try {
      ExcelFileHandler.exportToExcel(students);
      showSnackbar('Файл успешно сохранен', 'success');
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };

  const handleTakeScreenshot = async () => {
    const hasArrangedStudents = desks.some(desk => 
      desk.getStudent1() || desk.getStudent2()
    );

    if (!hasArrangedStudents) {
      showSnackbar('Сначала выполните рассадку учащихся', 'warning');
      return;
    }

    try {
      await onTakeScreenshot();
      showSnackbar('Изображение успешно сохранено', 'success');
    } catch (error) {
      showSnackbar('Ошибка при сохранении изображения', 'error');
    }
  };

  const handleArrangeStudents = async () => {
    if (students.length === 0) {
      showSnackbar('Нет учащихся для рассадки', 'warning');
      return;
    }

    try {
      await onArrangeStudents();
      showSnackbar('AI успешно рассадил учащихся', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Ошибка при рассадке учащихся', 'error');
    }
  };

  const handleEditSelectedStudent = () => {
    if (!selectedStudent) {
      showSnackbar('Выберите учащегося для редактирования', 'warning');
      return;
    }
    setEditDialogOpen(true);
  };

  const handleClearStudents = () => {
    if (students.length === 0) {
      showSnackbar('Список учащихся уже пуст', 'info');
      return;
    }
    
    studentManager.removeStudents();
    showSnackbar('Список учащихся очищен', 'success');
  };

  return (
    <>
      <Stack spacing={2}>
        {/* Desk Management */}
        <Box>
          <Typography variant="subtitle2" gutterBottom color="primary">
            Управление партами
          </Typography>
          <Stack spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={onAddRow}
              fullWidth
              size="small"
            >
              Добавить ряд
            </Button>
            <Button
              variant="outlined"
              startIcon={<Remove />}
              onClick={onRemoveRow}
              fullWidth
              size="small"
            >
              Удалить ряд
            </Button>
          </Stack>
        </Box>

        <Divider />

        {/* Student Management */}
        <Box>
          <Typography variant="subtitle2" gutterBottom color="primary">
            Управление учащимися
          </Typography>
          <Stack spacing={1}>
            <Button
              variant="contained"
              startIcon={<Person />}
              onClick={() => setAddDialogOpen(true)}
              fullWidth
              size="small"
            >
              Добавить учащегося
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEditSelectedStudent}
              fullWidth
              size="small"
              disabled={!selectedStudent}
            >
              Редактировать
            </Button>
            <Button
              variant="outlined"
              startIcon={<DeleteSweep />}
              onClick={handleClearStudents}
              fullWidth
              size="small"
              disabled={students.length === 0}
              color="error"
            >
              Очистить список
            </Button>
          </Stack>
        </Box>

        <Divider />

        {/* File Operations */}
        <Box>
          <Typography variant="subtitle2" gutterBottom color="primary">
            Работа с файлами
          </Typography>
          <Stack spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={handleOpenFile}
              fullWidth
              size="small"
            >
              Открыть Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleSaveToExcel}
              fullWidth
              size="small"
              disabled={students.length === 0}
            >
              Сохранить Excel
            </Button>
          </Stack>
        </Box>

        <Divider />

        {/* Seating Operations */}
        <Box>
          <Typography variant="subtitle2" gutterBottom color="primary">

            AI-Рассадка
          </Typography>
          <Stack spacing={1}>
            <Button
              variant="contained"
              startIcon={isArranging ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
              onClick={handleArrangeStudents}
              fullWidth
              size="small"
              disabled={students.length === 0 || isArranging}
              color="success"
            >
              {isArranging ? 'AI думает...' : 'AI-Рассадка'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={onClearDesks}
              fullWidth
              size="small"
            >
              Очистить парты
            </Button>
            <Button
              variant="outlined"
              startIcon={<CameraAlt />}
              onClick={handleTakeScreenshot}
              fullWidth
              size="small"
              disabled={!desks.some(desk => desk.getStudent1() || desk.getStudent2())}
            >
              Сохранить изображение
            </Button>
          </Stack>
        </Box>

        {/* Statistics */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Статистика
          </Typography>
          <Typography variant="caption" display="block">
            Учащихся: {students.length}
          </Typography>
          <Typography variant="caption" display="block">
            Парт: {desks.length}
          </Typography>
          <Typography variant="caption" display="block">
            Занятых мест: {desks.reduce((acc, desk) => {
              let count = 0;
              if (desk.getStudent1()) count++;
              if (desk.getStudent2()) count++;
              return acc + count;
            }, 0)}
          </Typography>
        </Box>
      </Stack>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Dialogs */}
      <StudentDialog
        open={addDialogOpen}
        students={students}
        studentManager={studentManager}
        onClose={() => setAddDialogOpen(false)}
        mode="add"
      />

      <StudentDialog
        open={editDialogOpen}
        student={selectedStudent}
        students={students}
        studentManager={studentManager}
        onClose={() => setEditDialogOpen(false)}
        mode="edit"
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ControlPanel;