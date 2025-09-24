 
# Task Management System

A simple MERN stack application for managing tasks.

## Setup Instructions for backend

1. Install MongoDB locally
2. Clone the repository
3. Backend setup:
   ```bash
   cd backend
   npm install
   npm start
## Setup Instructions for frontend(another terminal)
cd frontend 
npm install
npm start


## Test with Postman:
Health Check:

GET: http://localhost:5000/api/health

Add Sample Data:

POST: http://localhost:5000/api/sample-data

Create New Task:

POST: http://localhost:5000/api/tasks

Body (JSON):

json
{
  "task_title": "API Integration",
  "task_description": "Integrate with third-party payment API",
  "assigned_to": "dev@company.com",
  "priority": "High",
  "due_date": "2024-02-01",
  "client_name": "FinTech Corp",
  "project_name": "Payment System",
  "created_by": "projectmanager",
  "attachments": [],
  "notes": "Ensure secure connection"
}