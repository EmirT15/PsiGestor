import {Component, EventEmitter,Input, Output, OnChanges, SimpleChanges} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Appointment,
  Student
} from '../models/appointment.model';

import { Availability } from '../../calendar/models/availability.model';
@Component({
  selector: 'app-appointment-form',
  imports: [FormsModule],
  templateUrl: './appointment-form.html',
  styleUrl: './appointment-form.css'
})
export class AppointmentForm implements OnChanges {

  @Input() availability: Availability | null = null;
  @Input() selectedSlot = '';
  @Input() availableSlots: string[] = [];
  @Input() reservedSlots: string[] = [];
  @Input() saving = false;

  appointmentSlot = '';

  ngOnChanges(changes: SimpleChanges): void {

      if (changes['availability'] || changes['selectedSlot']) {

          this.appointmentSlot = this.selectedSlot;

      }
  }
  

  getAvailableAppointmentSlots(): string[] {
    return this.availableSlots.filter(
      slot => !this.reservedSlots.includes(slot)
    );
  }

  private generateAvailableSlots(availability: Availability): string[] {

    const slots: string[] = [];

    const start = this.timeToMinutes(availability.startTime);
    const end = this.timeToMinutes(availability.endTime);

    let current = start;

    while (current + availability.duration <= end) {

        const slotStart = current;
        const slotEnd = current + availability.duration;

        slots.push(
            `${this.minutesToTime(slotStart)} - ${this.minutesToTime(slotEnd)}`
        );

        current += availability.duration + availability.breakTime;
    }

    return slots;
  }

  private timeToMinutes(time: string): number {

    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number): string {

    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const period = hours24 >= 12 ? 'PM' : 'AM';

    const hours12 =
        hours24 % 12 === 0
            ? 12
            : hours24 % 12;

    return `${hours12.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')} ${period}`;
  }


  @Output() appointmentCreated = new EventEmitter<Appointment>();
  @Output() cancelled = new EventEmitter<void>();

  searchText = '';

  selectedStudent: Student | null = null;

  modality: 'In person' | 'Online' = 'In person';

  location = '';

  locations: string[] = [
    'Consultorio 1',
    'Consultorio 2',
    'Cubículo 2B - ITESCAM • Edificio A',
    'Sala de atención psicológica'
  ];

  meetingUrl = '';

  reason = '';

  students: Student[] = [
    {
      id: 1,
      studentId: '20240001',
      name: 'Juan Pérez',
      program: 'Ingeniería en Sistemas',
      semester: 4
    },
    {
      id: 2,
      studentId: '20240002',
      name: 'María López',
      program: 'Ingeniería en Sistemas',
      semester: 6
    },
    {
      id: 3,
      studentId: '20240003',
      name: 'Carlos Hernández',
      program: 'Ingeniería Industrial',
      semester: 3
    },
    {
      id: 4,
      studentId: '20240004',
      name: 'Ana García',
      program: 'Ingeniería en Sistemas',
      semester: 5
    }
  ];

  get filteredStudents(): Student[] {
    const search = this.searchText.toLowerCase().trim();

    if (!search) {
      return [];
    }

    return this.students.filter(student =>
      student.name.toLowerCase().includes(search) ||
      student.studentId.toLowerCase().includes(search)
    );
  }

  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.searchText = student.name;
  }

  onModalityChange(): void {
    if (this.modality === 'In person') {
      this.meetingUrl = '';
    } else {
      this.location = '';
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {

    if (!this.selectedStudent) {
      alert('Selecciona un alumno.');
      return;
    }

    if (!this.availability) {
      alert('No se ha seleccionado un horario.');
      return;
    }

    if (!this.appointmentSlot) {
      alert('Selecciona un horario para la cita.');
      return;
    }

    if (this.modality === 'In person' && !this.location) {
      alert('Selecciona una ubicación.');
      return;
    }

    if (this.modality === 'Online' && !this.meetingUrl.trim()) {
      alert('Ingresa la URL de la reunión.');
      return;
    }

    if (!this.reason.trim()) {
      alert('Ingresa el motivo de la cita.');
      return;
    }

    const appointment: Appointment = {
      id: Date.now(),

      studentId: this.selectedStudent.id,
      studentName: this.selectedStudent.name,

      date: this.availability.date,

      startTime: this.appointmentSlot.split(' - ')[0],
      endTime: this.appointmentSlot.split(' - ')[1],

      duration: this.availability.duration,

      modality: this.modality,

      location:
        this.modality === 'In person'
          ? this.location
          : undefined,

      meetingUrl:
        this.modality === 'Online'
          ? this.meetingUrl
          : undefined,

      reason: this.reason.trim(),

      status: 'Reserved'
    };

    this.appointmentCreated.emit(appointment);
  }
}