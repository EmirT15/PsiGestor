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
  | 'Inhabilitado'
  | 'Cancelado';
  createdAt?: string;
  studentName?: string;
  studentInitials?: string;
  studentAge?: number;
  studentSemester?: string;
  studentProgram?: string;
  consultationReason?: string;
  modality?: string;
  location?: string;
  folio?: string;
  proposedDate?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
  cancellationReason?: string;
  cancellationObservation?: string;
}