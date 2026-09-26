export type Role = "ADMIN" | "PM" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  pmId: string;
  client?: { id: string; name: string };
  pm?: { id: string; name: string };
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string } | null;
  project?: { id: string; name: string };
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  userId: string;
  userName: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  message: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_IN_REVIEW" | "TASK_OVERDUE";
  message: string;
  taskId: string | null;
  read: boolean;
  createdAt: string;
}
