import React, { useState, useEffect } from 'react';

const Dashboard = ({ onStatusClick }) => {
  const [counts, setCounts] = useState({
    Unassigned: 0,
    Assigned: 0,
    'In Progress': 0,
    Closed: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 3000); // Poll every 3 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/tasks/counts');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch counts');
      }
      
      setCounts(result);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching counts:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Unassigned': '#ff6b6b',
      'Assigned': '#4ecdc4',
      'In Progress': '#45b7d1',
      'Closed': '#96ceb4'
    };
    return colors[status] || '#667eea';
  };

  if (loading) {
    return <div style={{color: 'white', fontSize: '1.5em'}}>Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div>
        <div style={{color: 'red', fontSize: '1.2em', marginBottom: '20px'}}>
          Error: {error}
        </div>
        <button onClick={fetchCounts} style={{
          background: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Task Dashboard</h2>
      <div className="counts-grid">
        {Object.entries(counts).map(([status, count]) => (
          <div 
            key={status} 
            className="count-card"
            onClick={() => onStatusClick(status)}
            style={{ borderLeft: `5px solid ${getStatusColor(status)}` }}
          >
            <h3>{status}</h3>
            <div className="count" style={{color: getStatusColor(status)}}>
              {count}
            </div>
            <p>Click to view tasks</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;