import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AppointmentMock {
  id: number;
  status: string;
  studentName: string;
  studentAge: number;
  studentSemester: string;
  studentProgram: string;
  studentPhoto?: string;
  dateStr: string;
  sessionType: string;
  duration: number;
  modality: string;
  location: string;
  locationDetail: string;
  reason: string;
  derivedBy: string;
  sessionCount: string;
  cancellationReason?: string | null;
  cancellationObservation?: string | null;
  // Rehabilitación de horarios cancelados
  rehabilitable?: boolean;
  endsAtMs?: number;
}

@Component({
  selector: 'app-appointment-details',
  imports: [CommonModule],
  templateUrl: './appointment-details.html',
  styleUrl: './appointment-details.css',
})
export class AppointmentDetails {
  @Input() appointment: AppointmentMock | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() reschedule = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() rehabilitate = new EventEmitter<void>();

  // Use a default mock if none is provided, to match the design for now
  defaultMock: AppointmentMock = {
    id: 1,
    status: 'Reservado',
    studentName: 'Mateo Fernández Gómez',
    studentAge: 21,
    studentSemester: '7to Semestre',
    studentProgram: 'ISC',
    dateStr: 'Martes 22 de Oct., 10:00 - 10:45 AM',
    sessionType: 'Sesión individual',
    duration: 45,
    modality: 'Presencial',
    location: 'Cubículo 2B',
    locationDetail: 'ITESCAM • Edificio A',
    reason: '"Dificultades persistentes de concentración en evaluaciones bimestrales y manifestaciones de ansiedad pre-exámenes."',
    derivedBy: 'Coordinación Académica',
    sessionCount: '2da Sesión'
  };

  // El botón solo se ofrece para citas canceladas cuyo horario aún no ha pasado
  get canRehabilitate(): boolean {
    const appointment = this.displayAppointment;

    return (
      appointment.status === 'Cancelado' &&
      appointment.rehabilitable === true &&
      typeof appointment.endsAtMs === 'number' &&
      appointment.endsAtMs > Date.now()
    );
  }

  get isCancelledPast(): boolean {
    const appointment = this.displayAppointment;

    return (
      appointment.status === 'Cancelado' &&
      typeof appointment.endsAtMs === 'number' &&
      appointment.endsAtMs <= Date.now()
    );
  }

  get displayAppointment(): AppointmentMock {
    return this.appointment || this.defaultMock;
  }
}
