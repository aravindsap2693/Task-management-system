const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Email Automation Service
class EmailService {
  constructor() {
    this.emailLog = [];
  }

  // Simulate sending email
  async sendEmail(to, subject, message) {
    return new Promise((resolve) => {
      // Simulate email sending delay
      setTimeout(() => {
        const emailRecord = {
          to,
          subject,
          message,
          timestamp: new Date(),
          status: 'sent'
        };
        
        this.emailLog.push(emailRecord);
        
        // Log to console (as required)
        console.log(`📧 EMAIL SENT: To: ${to} | Subject: "${subject}" | Time: ${emailRecord.timestamp.toLocaleTimeString()}`);
        
        resolve(emailRecord);
      }, 1000); // 1 second delay to simulate email sending
    });
  }

  // Send task assignment notification
  async sendTaskAssignmentEmail(task, previousStatus) {
    if (!task.assigned_to) {
      console.log('⚠️  No email sent: Task has no assignee');
      return null;
    }

    const subject = `New Task Assigned: ${task.task_title}`;
    const message = `
Hello,

You have been assigned a new task:

Task Title: ${task.task_title}
Description: ${task.task_description}
Priority: ${task.priority}
Due Date: ${new Date(task.due_date).toLocaleDateString()}
Client: ${task.client_name}
Project: ${task.project_name}
Status: ${task.status}

Please review the task details and update the status as you progress.

Best regards,
Task Management System
    `.trim();

    return await this.sendEmail(task.assigned_to, subject, message);
  }

  // Send status update notification
  async sendStatusUpdateEmail(task, previousStatus, newStatus) {
    if (!task.assigned_to) return null;

    const subject = `Task Status Updated: ${task.task_title}`;
    const message = `
Hello,

The status of your task has been updated:

Task: ${task.task_title}
Previous Status: ${previousStatus}
New Status: ${newStatus}
Updated At: ${new Date().toLocaleString()}

${this.getStatusUpdateMessage(newStatus)}

Best regards,
Task Management System
    `.trim();

    return await this.sendEmail(task.assigned_to, subject, message);
  }

  getStatusUpdateMessage(status) {
    const messages = {
      'Assigned': 'The task has been assigned to you. Please start working on it.',
      'In Progress': 'The task is now in progress. Keep up the good work!',
      'Closed': 'The task has been completed. Thank you for your work!'
    };
    return messages[status] || `The task status has been changed to ${status}.`;
  }

  // Get email log (for debugging)
  getEmailLog() {
    return this.emailLog;
  }

  // Clear email log
  clearEmailLog() {
    this.emailLog = [];
  }
}

// Initialize email service
const emailService = new EmailService();

// Routes
const Task = require('./models/Task');

// Store previous task states for email tracking
const taskStateCache = new Map();

// Middleware to track task changes for email automation
const trackTaskChanges = async (req, res, next) => {
  if (req.params.id) {
    try {
      const task = await Task.findById(req.params.id);
      if (task) {
        taskStateCache.set(req.params.id, {
          status: task.status,
          assigned_to: task.assigned_to
        });
      }
    } catch (error) {
      // Continue even if tracking fails
      console.log('Tracking error:', error.message);
    }
  }
  next();
};

// Create task endpoint
app.post('/api/tasks', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      due_date: new Date(req.body.due_date)
    };
    
    const task = new Task(taskData);
    await task.save();
    
    // Send email if task is created with Assigned status
    if (task.status === 'Assigned' && task.assigned_to) {
      await emailService.sendTaskAssignmentEmail(task, 'Unassigned');
    }
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update task status with email automation
app.put('/api/tasks/:id/status', trackTaskChanges, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Email automation logic
    const previousState = taskStateCache.get(id);
    
    if (previousState) {
      // Check if status changed from Unassigned to Assigned
      if (previousState.status === 'Unassigned' && status === 'Assigned' && task.assigned_to) {
        console.log(`🚀 TRIGGER: Status changed from Unassigned to Assigned`);
        await emailService.sendTaskAssignmentEmail(task, previousState.status);
      }
      // Check if status changed and task is assigned
      else if (previousState.status !== status && task.assigned_to) {
        console.log(`🔄 TRIGGER: Status changed from ${previousState.status} to ${status}`);
        await emailService.sendStatusUpdateEmail(task, previousState.status, status);
      }
      
      // Clear cache
      taskStateCache.delete(id);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update entire task (including assignment)
app.put('/api/tasks/:id', trackTaskChanges, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.due_date) {
      updateData.due_date = new Date(updateData.due_date);
    }

    const task = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const previousState = taskStateCache.get(id);
    
    // Email automation for assignment changes
    if (previousState) {
      // Check if task was just assigned (from Unassigned to having an assignee)
      if ((!previousState.assigned_to || previousState.assigned_to === '') && 
          task.assigned_to && task.assigned_to !== '' &&
          task.status === 'Assigned') {
        console.log(`🎯 TRIGGER: Task assigned to ${task.assigned_to}`);
        await emailService.sendTaskAssignmentEmail(task, previousState.status);
      }
      
      taskStateCache.delete(id);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get email log (for testing/debugging)
app.get('/api/emails', (req, res) => {
  res.json({
    success: true,
    data: emailService.getEmailLog()
  });
});

// Clear email log
app.delete('/api/emails', (req, res) => {
  emailService.clearEmailLog();
  res.json({
    success: true,
    message: 'Email log cleared'
  });
});

// ... (keep all other existing endpoints: counts, status, sample-data, health, etc.)

// Get task counts for dashboard
app.get('/api/tasks/counts', async (req, res) => {
  try {
    const counts = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedCounts = {
      Unassigned: 0,
      Assigned: 0,
      'In Progress': 0,
      Closed: 0
    };

    counts.forEach(item => {
      formattedCounts[item._id] = item.count;
    });

    res.json(formattedCounts);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get tasks by status
app.get('/api/tasks/status/:status', async (req, res) => {
  try {
    const tasks = await Task.find({ status: req.params.status })
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add sample data endpoint with email simulation
app.post('/api/sample-data', async (req, res) => {
  try {
     const sampleTasks = [
      {
        task_title: "Fix Login Issue",
        task_description: "Users cannot login with correct credentials",
        assigned_to: "john@company.com",
        priority: "High",
        due_date: new Date('2024-01-15'),
        client_name: "ABC Corp",
        project_name: "Website Redesign",
        created_by: "admin",
        attachments: ["https://example.com/file1.pdf"],
        notes: "Urgent fix required",
        status: "Unassigned"
      },
      {
        task_title: "Update Homepage Design",
        task_description: "Refresh the homepage with new layout",
        assigned_to: "sarah@company.com",
        priority: "Medium",
        due_date: new Date('2024-01-20'),
        client_name: "XYZ Inc",
        project_name: "UI Update",
        created_by: "manager",
        attachments: [],
        notes: "Client requested modern look",
        status: "Assigned"
      },
      {
        task_title: "Database Optimization",
        task_description: "Optimize database queries for better performance",
        assigned_to: "mike@company.com",
        priority: "High",
        due_date: new Date('2024-01-25'),
        client_name: "DataTech Solutions",
        project_name: "Backend Improvement",
        created_by: "techlead",
        attachments: ["https://example.com/db-schema.pdf"],
        notes: "Focus on slow queries",
        status: "In Progress"
      },
      {
        task_title: "Mobile App Testing",
        task_description: "Complete testing of new mobile application",
        assigned_to: "lisa@company.com",
        priority: "Medium",
        due_date: new Date('2024-01-10'),
        client_name: "MobileFirst Inc",
        project_name: "App Launch",
        created_by: "qa",
        attachments: [],
        notes: "Test on iOS and Android",
        status: "Closed"
      }
    ];

    await Task.deleteMany({});
    const tasks = await Task.insertMany(sampleTasks);

    // Simulate email for already assigned task
    const assignedTask = tasks.find(task => task.status === 'Assigned');
    if (assignedTask) {
      await emailService.sendTaskAssignmentEmail(assignedTask, 'Unassigned');
    }

    res.json({
      success: true,
      message: "Sample data added successfully",
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    emailService: 'Active',
    emailsSent: emailService.getEmailLog().length
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`📧 Email Automation: Active`);
  console.log(`🌐 API available at: http://localhost:${PORT}/api`);
  console.log(`📨 Email log available at: http://localhost:${PORT}/api/emails`);
});