import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService, Appointment } from '../../../calendar/services/calendar.service';
import { Availability } from '../../../calendar/models/availability.model';

@Component({
  selector: 'app-reschedule-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reschedule-appointment-modal.html',
  styleUrl: './reschedule-appointment-modal.css'
})
export class RescheduleAppointmentModal implements OnInit {
  @Input() appointment!: Appointment;
  @Output() close = new EventEmitter<void>();
  @Output() rescheduleRequested = new EventEmitter<void>();

  private calendarService = inject(CalendarService);

  availableSlots: Availability[] = [];
  selectedSlotId: number | null = null;
  reason: string = '';
  isLoadingSlots = true;
  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadAvailableSlots();
  }

  loadAvailableSlots(): void {
    this.isLoadingSlots = true;
    this.calendarService.getAvailabilities().subscribe({
      next: (availabilities) => {
        // Filtrar únicamente horarios con estado 'Disponible' y futuros (o del día en adelante)
        const todayStr = new Date().toISOString().split('T')[0];
        this.availableSlots = availabilities.filter((slot) => {
          return slot.status === 'Disponible' && slot.date >= todayStr;
        }).sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.startTime.localeCompare(b.startTime);
        });

        this.isLoadingSlots = false;
      },
      error: () => {
        this.isLoadingSlots = false;
        this.errorMessage = 'No se pudo consultar la disponibilidad actual de la psicóloga.';
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  submitReschedule(): void {
    this.errorMessage = '';
    const cleanReason = this.reason.trim();

    if (!this.selectedSlotId) {
      this.errorMessage = 'Debes seleccionar un nuevo horario disponible de la psicóloga.';
      return;
    }

    if (!cleanReason) {
      this.errorMessage = 'El motivo de la reprogramación es obligatorio.';
      return;
    }

    if (cleanReason.length < 5) {
      this.errorMessage = 'Por favor ingresa un motivo más descriptivo (mínimo 5 caracteres).';
      return;
    }

    this.isSubmitting = true;

    this.calendarService
      .requestStudentReschedule(this.appointment.id, this.selectedSlotId, cleanReason)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.rescheduleRequested.emit();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.error || 'No fue posible enviar la solicitud de reprogramación.';
        }
      });
  }
}
