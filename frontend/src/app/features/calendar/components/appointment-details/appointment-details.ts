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

  get displayAppointment(): AppointmentMock {
    return this.appointment || this.defaultMock;
  }
}
