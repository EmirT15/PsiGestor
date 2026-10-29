import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService, Appointment } from '../../../calendar/services/calendar.service';

@Component({
  selector: 'app-cancel-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-appointment-modal.html',
  styleUrl: './cancel-appointment-modal.css'
})
export class CancelAppointmentModal {
  @Input() appointment!: Appointment;
  @Output() close = new EventEmitter<void>();
  @Output() appointmentCancelled = new EventEmitter<void>();

  private calendarService = inject(CalendarService);

  reason: string = '';
  isConfirmed = false;
  isSubmitting = false;
  errorMessage = '';

  isPresencial(modality?: string): boolean {
    return modality === 'In person' || modality === 'Presencial';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  submitCancellation(): void {
    this.errorMessage = '';
    const cleanReason = this.reason.trim();

    if (!cleanReason) {
      this.errorMessage = 'El motivo de la cancelación es obligatorio.';
      return;
    }

    if (cleanReason.length < 5) {
      this.errorMessage = 'Por favor ingresa un motivo más claro (mínimo 5 caracteres).';
      return;
    }

    if (!this.isConfirmed) {
      this.errorMessage = 'Debes marcar la casilla para confirmar definitivamente la cancelación.';
      return;
    }

    this.isSubmitting = true;

    this.calendarService
      .cancelStudentAppointment(this.appointment.id, cleanReason)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.appointmentCancelled.emit();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.error || 'No fue posible cancelar la cita.';
        }
      });
  }
}
