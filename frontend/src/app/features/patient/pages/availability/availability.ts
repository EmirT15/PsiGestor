import { ChangeDetectorRef, Component, OnInit, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import {
  Calendar
} from '../../../calendar/components/calendar/calendar';
import { BookAppointmentModal } from '../../components/book-appointment-modal/book-appointment-modal';
import { StudentHeader } from '../../components/student-header/student-header';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Appointment,
  CalendarService
} from '../../../calendar/services/calendar.service';

import { RescheduleAppointmentModal } from '../../components/reschedule-appointment-modal/reschedule-appointment-modal';
import { CancelAppointmentModal } from '../../components/cancel-appointment-modal/cancel-appointment-modal';
@Component({
  selector: 'app-patient-availability',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Calendar,
    StudentHeader,
    BookAppointmentModal,
    RescheduleAppointmentModal,
    CancelAppointmentModal
  ],
  templateUrl: './availability.html',
  styleUrl: './availability.css'
})
export class Availability implements OnInit {
  @ViewChild(Calendar) calendarComponent?: Calendar;

  private router = inject(Router);
  readonly authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef);

  readonly studentHeaderData = computed(() => {
    const user = this.authService.currentUser();

    if (!user || user.role !== 'alumno') {
      return null;
    }

    return {
      name: user.name,
      studentId:
        user.studentCode ||
        (user.studentId != null
          ? String(user.studentId)
          : 'No disponible'),
      role: 'Alumno'
    };
  });

  isBookingModalOpen = false;
  selectedSlotData: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  } | null = null;

  toastMessage: string | null = null;

  // Panel lateral de Mis citas
  isAppointmentsPanelOpen = false;
  isLoadingAppointments = false;
  appointmentsError = false;

  appointments: Appointment[] = [];
  selectedAppointment: Appointment | null = null;

  // Modales existentes para gestionar las citas
  reschedulingAppointment: Appointment | null = null;
  cancellingAppointment: Appointment | null = null;

  get currentUser() {
    return this.authService.currentUser();
  }

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      this.authService.checkSession().subscribe();
    }
  }

  onPatientScheduleSelected(event: any): void {
    const avail = event?.availability;
    const slot = event?.slot;

    const status = slot?.status || avail?.status;

    // Solo se puede iniciar el proceso desde un horario con estado Disponible
    if (status !== 'Disponible') {
      return;
    }

    const date = slot?.date || avail?.date;
    const startTime = slot?.startTime || avail?.startTime;
    const endTime = slot?.endTime || avail?.endTime;
    const duration = slot?.duration || avail?.duration || 45;

    this.selectedSlotData = {
      date,
      startTime,
      endTime,
      duration
    };

    this.isBookingModalOpen = true;
  }


  // Abrir el panel lateral y consultar las citas del alumno
  openAppointmentsPanel(): void {
    this.isAppointmentsPanelOpen = true;
    this.selectedAppointment = null;
    this.loadMyAppointments();
  }

  closeAppointmentsPanel(): void {
    this.isAppointmentsPanelOpen = false;
    this.selectedAppointment = null;
  }

  loadMyAppointments(): void {
    this.isLoadingAppointments = true;
    this.appointmentsError = false;
    this.cdr.detectChanges();

    this.calendarService.getStudentMyAppointments().subscribe({
      next: (response) => {
        this.appointments = response?.appointments ?? [];

        if (this.selectedAppointment) {
          this.selectedAppointment =
            this.appointments.find(
              (appointment) =>
                appointment.id === this.selectedAppointment?.id
            ) ?? null;
        }

        this.isLoadingAppointments = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar las citas del alumno:', error);
        this.appointmentsError = true;
        this.isLoadingAppointments = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Solo mostrar citas activas o con reprogramaciÃ³n pendiente
  get pendingAppointments(): Appointment[] {
    return this.appointments.filter((appointment) =>
      [
        'Reserved',
        'Pending Reschedule',
        'Reprogramacion pendiente'
      ].includes(appointment.status)
    );
  }

  selectAppointment(appointment: Appointment): void {
    this.selectedAppointment = appointment;
  }

  backToAppointmentList(): void {
    this.selectedAppointment = null;
  }

  isReschedulePending(appointment: Appointment): boolean {
    return [
      'Pending Reschedule',
      'Reprogramacion pendiente'
    ].includes(appointment.status);
  }

  isPresencial(modality?: string): boolean {
    return modality === 'In person' || modality === 'Presencial';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) {
      return '';
    }

    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Solicitar reprogramaciÃ³n con el modal existente
  openRescheduleModal(appointment: Appointment): void {
    if (this.isReschedulePending(appointment)) {
      return;
    }

    this.reschedulingAppointment = appointment;
  }

  closeRescheduleModal(): void {
    this.reschedulingAppointment = null;
  }

  onRescheduleRequested(): void {
    this.reschedulingAppointment = null;

    this.showToast(
      'Solicitud de reprogramaciÃ³n enviada correctamente.'
    );

    this.loadMyAppointments();
  }

  // Cancelar cita con el modal existente
  openCancelModal(appointment: Appointment): void {
    if (appointment.status !== 'Reserved') {
      return;
    }

    this.cancellingAppointment = appointment;
  }

  closeCancelModal(): void {
    this.cancellingAppointment = null;
  }

  onAppointmentCancelled(): void {
    this.cancellingAppointment = null;

    this.showToast('Tu cita ha sido cancelada correctamente.');

    this.loadMyAppointments();

    if (this.calendarComponent) {
      this.calendarComponent.loadAvailabilities();
    }

    this.calendarService.notifyScheduleChanged();
  }


  onAppointmentBooked(response: any): void {
    this.isBookingModalOpen = false;
    this.selectedSlotData = null;
    this.loadMyAppointments();

    this.showToast('Â¡Cita registrada correctamente! Se ha reflejado en tu agenda y en la de la psicÃ³loga.');

    // Recargar disponibilidades en el calendario
    if (this.calendarComponent) {
      this.calendarComponent.loadAvailabilities();
    }
    this.calendarService.notifyScheduleChanged();

    // Redirigir a 'Mis Citas' en el portal del alumno tras breve pausa
    setTimeout(() => {
      this.router.navigate(['/portal-alumno']);
    }, 2200);
  }

  closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.selectedSlotData = null;
  }

  showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => {
      this.toastMessage = null;
    }, 4500);
  }
}



