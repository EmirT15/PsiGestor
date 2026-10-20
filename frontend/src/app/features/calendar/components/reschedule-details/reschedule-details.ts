import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RescheduleDetailsMock {
  id: number;
  studentName: string;
  studentInitials: string;
  studentAge: number;
  studentSemester: string;
  studentProgram: string;
  originalDateStr: string;
  originalDetails: string;
  proposedDateStr: string;
  proposedDetails: string;
  sentAtStr: string;
  reason: string;
}

@Component({
  selector: 'app-reschedule-details',
  imports: [CommonModule],
  templateUrl: './reschedule-details.html',
  styleUrl: './reschedule-details.css',
})
export class RescheduleDetails {
  @Input() data: RescheduleDetailsMock | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() modify = new EventEmitter<void>();
  @Output() remind = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  defaultMock: RescheduleDetailsMock = {
    id: 2,
    studentName: 'Sofía Navarrete',
    studentInitials: 'SN',
    studentAge: 19,
    studentSemester: '3er Semestre',
    studentProgram: 'Psicología',
    originalDateStr: 'Jueves 24 de Oct., 09:15 – 10:00 AM',
    originalDetails: 'Presencial • Cubículo 2B • 45 min',
    proposedDateStr: 'Lunes 28 de Oct., 10:15 – 11:00 AM',
    proposedDetails: 'Presencial • Cubículo 2B • 45 min',
    sentAtStr: '22 de Oct. a las 11:30 AM',
    reason: '"Cruce de horario con reunión de coordinación departamental y solicitud de ajuste de franja."'
  };

  get displayData(): RescheduleDetailsMock {
    return this.data || this.defaultMock;
  }
}
