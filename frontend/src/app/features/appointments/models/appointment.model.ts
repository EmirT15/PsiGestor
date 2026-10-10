export type AttendanceMode = 'In person' | 'Online';

export interface Student {
  id: number;
  studentId: string;
  name: string;
  program: string;
  semester: number;
}

export interface Appointment {
  id: number;

  studentId: number;
  studentName: string;

  date: string;
  startTime: string;
  endTime: string;
  duration: number;

  modality: AttendanceMode;

  location?: string;
  meetingUrl?: string;

  reason: string;

  status: 'Reserved' | 'Cancelled';
}