import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Grid, Paper, Box } from '@mui/material';
import { StudentManager } from './utils/StudentManager';
import { Desk } from './models/Desk';
import StudentTable from './components/StudentTable';
import DeskGrid from './components/DeskGrid';
import ControlPanel from './components/ControlPanel';
import { arrangeStudents } from './utils/SeatingAlgorithm';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});

function App() {
  const [studentManager] = useState(() => new StudentManager());
  const [students, setStudents] = useState([]);
  const [desks, setDesks] = useState(() => {
    const initialDesks = [];
    for (let i = 0; i < 15; i++) { // 5 rows x 3 columns
      initialDesks.push(new Desk());
    }
    return initialDesks;
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isArranging, setIsArranging] = useState(false);
  const deskGridRef = useRef(null);

  // Handle screenshot
  const handleTakeScreenshot = useCallback(async () => {
    if (deskGridRef.current) {
      await deskGridRef.current.takeScreenshot();
    }
  }, []);

  // Add row of desks
  const addRow = useCallback(() => {
    const columnCount = 3;
    const newDesks = [...desks];
    for (let i = 0; i < columnCount; i++) {
      newDesks.push(new Desk());
    }
    setDesks(newDesks);
  }, [desks]);

  // Remove row of desks
  const removeRow = useCallback(() => {
    const columnCount = 3;
    const rowCount = Math.ceil(desks.length / columnCount);
    if (rowCount > 1) {
      const newDesks = desks.slice(0, -columnCount);
      setDesks(newDesks);
    }
  }, [desks]);

  // Clear all desks
  const clearDesks = useCallback(() => {
    const newDesks = desks.map(() => new Desk());
    setDesks(newDesks);
  }, [desks]);

  // Arrange students in desks
  const handleArrangeStudents = useCallback(async () => {
    setIsArranging(true);
    try {
      const newDesks = await arrangeStudents(students, desks);
      setDesks(newDesks);
    } finally {
      setIsArranging(false);
    }
  }, [students, desks]);

  // Remove student and update desks
  const handleRemoveStudent = useCallback((student) => {
    // Remove from student manager
    studentManager.removeStudent(student);
    
    // Remove from desks
    const newDesks = desks.map(desk => {
      const newDesk = new Desk();
      if (desk.getStudent1() && !desk.getStudent1().equals(student)) {
        newDesk.setStudent1(desk.getStudent1());
      }
      if (desk.getStudent2() && !desk.getStudent2().equals(student)) {
        newDesk.setStudent2(desk.getStudent2());
      }
      return newDesk;
    });
    setDesks(newDesks);
  }, [studentManager, desks]);

  // Student manager listener
  useEffect(() => {
    const listener = (updatedStudents) => {
      setStudents([...updatedStudents]);
      studentManager.saveToStorage();
    };

    studentManager.addStudentListener(listener);
    studentManager.loadFromStorage(); // Load initial data

    return () => {
      studentManager.removeStudentListener(listener);
    };
  }, [studentManager]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            AI-Рассадка учащихся
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {/* Student Table */}
          <Grid item xs={12} lg={5}>
            <Paper elevation={2} sx={{ p: 2, height: 'calc(100vh - 140px)' }}>
              <Typography variant="h6" gutterBottom>
                Список учащихся
              </Typography>
              <StudentTable
                students={students}
                studentManager={studentManager}
                selectedStudent={selectedStudent}
                onStudentSelect={setSelectedStudent}
                onRemoveStudent={handleRemoveStudent}
              />
            </Paper>
          </Grid>

          {/* Desk Grid */}
          <Grid item xs={12} lg={5}>
            <Paper elevation={2} sx={{ p: 2, height: 'calc(100vh - 140px)' }}>
              <Typography variant="h6" gutterBottom>
                Схема класса
              </Typography>
              <Box sx={{ overflow: 'auto', height: 'calc(100% - 40px)' }}>
                <DeskGrid ref={deskGridRef} desks={desks} columnCount={3} />
              </Box>
            </Paper>
          </Grid>

          {/* Control Panel */}
          <Grid item xs={12} lg={2}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Управление
              </Typography>
              <ControlPanel
                studentManager={studentManager}
                students={students}
                desks={desks}
                selectedStudent={selectedStudent}
                isArranging={isArranging}
                onAddRow={addRow}
                onRemoveRow={removeRow}
                onArrangeStudents={handleArrangeStudents}
                onClearDesks={clearDesks}
                onTakeScreenshot={handleTakeScreenshot}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}

export default App;