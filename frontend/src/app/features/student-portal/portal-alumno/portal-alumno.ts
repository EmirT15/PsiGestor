import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CalendarService, Appointment } from '../../calendar/services/calendar.service';
import { RescheduleAppointmentModal } from '../../patient/components/reschedule-appointment-modal/reschedule-appointment-modal';
import { CancelAppointmentModal } from '../../patient/components/cancel-appointment-modal/cancel-appointment-modal';

@Component({
  selector: 'app-portal-alumno',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RescheduleAppointmentModal,
    CancelAppointmentModal
  ],
  templateUrl: './portal-alumno.html',
  styleUrl: './portal-alumno.css'
})
export class PortalAlumno implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private calendarService = inject(CalendarService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  appointments: Appointment[] = [];
  isLoadingAppointments = false;
  toastMessage: string | null = null;

  // Modales
  reschedulingAppointment: Appointment | null = null;
  cancellingAppointment: Appointment | null = null;

  get user() {
    return this.authService.currentUser();
  }

  get pendingAppointments(): Appointment[] {
    return this.appointments.filter(
      (apt) => apt.status === 'Reserved' || apt.status === 'Pending Reschedule' || apt.status === 'Reprogramacion pendiente'
    );
  }

  get historyAppointments(): Appointment[] {
    return this.appointments.filter(
      (apt) => apt.status === 'Cancelled'
    );
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.authService.currentUser()) {
        this.authService.checkSession().subscribe({
          next: () => {
            this.loadMyAppointments();
          },
          error: () => {
            this.loadMyAppointments();
          }
        });
      } else {
        this.loadMyAppointments();
      }
    }
  }

  isPresencial(modality?: string): boolean {
    return modality === 'In person' || modality === 'Presencial';
  }

  loadMyAppointments(): void {
    this.isLoadingAppointments = true;
    this.cdr.detectChanges();

    this.calendarService.getStudentMyAppointments().subscribe({
      next: (response) => {
        this.appointments = response?.appointments || [];
        this.isLoadingAppointments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingAppointments = false;
        console.error('Error al cargar citas del alumno:', err);
        this.cdr.detectChanges();
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  openRescheduleModal(appointment: Appointment): void {
    if (appointment.status === 'Pending Reschedule' || appointment.status === 'Reprogramacion pendiente') {
      return;
    }
    this.reschedulingAppointment = appointment;
  }

  closeRescheduleModal(): void {
    this.reschedulingAppointment = null;
  }

  onRescheduleRequested(): void {
    this.reschedulingAppointment = null;
    this.showToast('Solicitud de reprogramación enviada correctamente. Queda a la espera de aprobación.');
    this.loadMyAppointments();
  }

  openCancelModal(appointment: Appointment): void {
    this.cancellingAppointment = appointment;
  }

  closeCancelModal(): void {
    this.cancellingAppointment = null;
  }

  onAppointmentCancelled(): void {
    this.cancellingAppointment = null;
    this.showToast('Tu cita ha sido cancelada correctamente y el horario fue liberado.');
    this.loadMyAppointments();
  }

  showToast(message: string): void {
    this.toastMessage = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.detectChanges();
    }, 4500);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}
