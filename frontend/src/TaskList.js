import React, { useState, useEffect } from 'react';

const TaskList = ({ status, onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [status]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`http://localhost:5000/api/tasks/status/${status}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch tasks');
      }
      
      // Handle both response structures
      const tasksData = result.data || result;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message);
      setLoading(false);
      setTasks([]);
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task');
      }
      
      fetchTasks(); // Refresh the list
    } catch (error) {
      console.error('Error updating task:', error);
      setError(error.message);
    }
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = ['Unassigned', 'Assigned', 'In Progress', 'Closed'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  if (loading) {
    return (
      <div className="task-list">
        <h2>Tasks - {status}</h2>
        <button onClick={onBack}>Back to Dashboard</button>
        <div style={{padding: '20px', color: '#666'}}>Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list">
        <h2>Tasks - {status}</h2>
        <button onClick={onBack}>Back to Dashboard</button>
        <div style={{color: 'red', padding: '20px'}}>Error: {error}</div>
        <button onClick={fetchTasks}>Retry</button>
      </div>
    );
  }

  return (
    <div className="task-list">
      <h2>Tasks - {status}</h2>
      <button onClick={onBack}>Back to Dashboard</button>
      
      <div className="tasks">
        {tasks.length === 0 ? (
          <div style={{padding: '20px', color: '#666', fontSize: '1.2em'}}>
            No tasks found in {status} status.
          </div>
        ) : (
          tasks.map(task => (
            <div key={task._id} className="task-card">
              <h3>{task.task_title}</h3>
              <p><strong>Description:</strong> {task.task_description}</p>
              <p><strong>Assigned to:</strong> {task.assigned_to || 'Unassigned'}</p>
              <p><strong>Priority:</strong> {task.priority}</p>
              <p><strong>Due Date:</strong> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
              <p><strong>Client:</strong> {task.client_name}</p>
              <p><strong>Project:</strong> {task.project_name}</p>
              <p><strong>Created by:</strong> {task.created_by}</p>
              {task.notes && <p><strong>Notes:</strong> {task.notes}</p>}
              
              {getNextStatus(task.status) && (
                <button 
                  onClick={() => updateStatus(task._id, getNextStatus(task.status))}
                  className="status-btn"
                >
                  Move to {getNextStatus(task.status)}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;