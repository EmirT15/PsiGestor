import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../../calendar/services/calendar.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-book-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-appointment-modal.html',
  styleUrl: './book-appointment-modal.css'
})
export class BookAppointmentModal implements OnChanges {
  @Input() slotData!: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  };
  @Input() inline = false;

  @Output() close = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() appointmentBooked = new EventEmitter<any>();

  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  modality: 'Presencial' | 'En línea' = 'Presencial';
  reason: string = '';
  location: string = 'Cubículo 2B - Departamento de Orientación y Psicología';
  isLoading = false;
  errorMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slotData']) {
      this.errorMessage = '';
    }
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get formattedDate(): string {
    if (!this.slotData?.date) return '';
    try {
      const [year, month, day] = this.slotData.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return this.slotData.date;
    }
  }

  onModalityChange(mod: 'Presencial' | 'En línea'): void {
    this.modality = mod;
  }

  onCancelClick(): void {
    if (this.cancel.observed) {
      this.cancel.emit();
    } else {
      this.close.emit();
    }
  }

  submitBooking(): void {
    this.errorMessage = '';
    const cleanReason = this.reason.trim();

    if (!cleanReason) {
      this.errorMessage = 'El motivo de la consulta es obligatorio para agendar tu cita.';
      return;
    }

    if (cleanReason.length < 5) {
      this.errorMessage = 'Por favor escribe un motivo más detallado (mínimo 5 caracteres).';
      return;
    }

    this.isLoading = true;

    const payload = {
      date: this.slotData.date,
      start_time: this.slotData.startTime,
      end_time: this.slotData.endTime,
      duration: this.slotData.duration,
      modality: this.modality,
      location: this.modality === 'Presencial' ? this.location : undefined,
      reason: cleanReason
    };

    this.calendarService.bookStudentAppointment(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.reason = '';
        this.appointmentBooked.emit(response);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error || 'No fue posible registrar la cita. Verifica que el horario continúe disponible.';
      }
    });
  }
}
