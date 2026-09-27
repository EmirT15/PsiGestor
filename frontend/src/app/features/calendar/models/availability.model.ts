export interface Availability {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  breakTime: number;
  status:
  | 'Disponible'
  | 'Reservado'
  | 'Reprogramacion pendiente'
  | 'Inhabilitado';
}