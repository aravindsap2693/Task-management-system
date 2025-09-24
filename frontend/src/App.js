import React, { useState } from 'react';
import Dashboard from './Dashboard';
import TaskList from './TaskList';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStatus, setSelectedStatus] = useState('');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Task Management System</h1>
        {currentView === 'taskList' && (
          <button className="back-btn" onClick={() => setCurrentView('dashboard')}>
            ← Back to Dashboard
          </button>
        )}
      </header>
      
      <main>
        {currentView === 'dashboard' ? (
          <Dashboard 
            onStatusClick={(status) => {
              setSelectedStatus(status);
              setCurrentView('taskList');
            }}
          />
        ) : (
          <TaskList 
            status={selectedStatus}
            onBack={() => setCurrentView('dashboard')}
          />
        )}
      </main>
    </div>
  );
}

export default App;