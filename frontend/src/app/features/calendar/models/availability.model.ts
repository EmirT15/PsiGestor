export interface Availability {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  breakTime: number;
  status: 'active' | 'blocked' | 'cancelled';
}