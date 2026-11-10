import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  CalendarService,
  Appointment
} from '../../../calendar/services/calendar.service';
import {
  RescheduleAppointmentModal
} from '../../components/reschedule-appointment-modal/reschedule-appointment-modal';
import {
  CancelAppointmentModal
} from '../../components/cancel-appointment-modal/cancel-appointment-modal';
import {
  StudentHeader
} from '../../components/student-header/student-header';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StudentHeader,
    RescheduleAppointmentModal,
    CancelAppointmentModal
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private calendarService = inject(CalendarService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  appointments: Appointment[] = [];
  isLoadingAppointments = false;
  isProcessing = false;
  toastMessage: string | null = null;
  toastType: 'success' | 'warning' | 'error' = 'success';
  private toastTimer: any = null;

  // Modales
  reschedulingAppointment: Appointment | null = null;
  cancellingAppointment: Appointment | null = null;
  rejectingRescheduleAppointment: Appointment | null = null;

  get user() {
    return this.authService.currentUser();
  }

  get pendingAppointments(): Appointment[] {
    return this.appointments.filter(
      (apt) =>
        (apt.status === 'Reserved' || apt.status === 'Pending Reschedule' || apt.status === 'Reprogramacion pendiente') &&
        this.isTodayOrFuture(apt)
    );
  }

  get nextAppointment(): Appointment | null {
    const now = new Date();

    return this.appointments
      .filter((apt) => {
        if (apt.status !== 'Reserved') return false;

        const start = new Date(`${apt.date}T${apt.start_time}:00`);
        return start > now;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time}:00`).getTime();
        const dateB = new Date(`${b.date}T${b.start_time}:00`).getTime();
        return dateA - dateB;
      })[0] ?? null;
  }

  // Fecha local actual en formato YYYY-MM-DD
  private getTodayString(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  // Solo citas del día actual o posteriores
  private isTodayOrFuture(appointment: Appointment): boolean {
    const date = String(appointment.date ?? '').substring(0, 10);
    return date >= this.getTodayString();
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

  acceptReschedule(apt: Appointment): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.cdr.detectChanges();

    this.calendarService.approveReschedule(apt.id).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showToast('¡Has aceptado la reprogramación! La cita ha sido confirmada en el nuevo horario.', 'success');
        this.loadMyAppointments();
      },
      error: (err) => {
        this.isProcessing = false;
        this.showToast(err.error?.error || 'No se pudo aceptar la reprogramación.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  rejectReschedule(apt: Appointment): void {
    if (this.isProcessing) return;
    this.rejectingRescheduleAppointment = apt;
  }

  closeRejectRescheduleModal(): void {
    if (this.isProcessing) return;
    this.rejectingRescheduleAppointment = null;
  }

  confirmRejectReschedule(): void {
    const apt = this.rejectingRescheduleAppointment;
    if (!apt || this.isProcessing) return;

    this.isProcessing = true;
    this.cdr.detectChanges();

    this.calendarService.rejectReschedule(apt.id).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.rejectingRescheduleAppointment = null;
        if (res.action === 'cancelled') {
          this.showToast('Propuesta rechazada. La cita ha sido cancelada definitivamente.', 'warning');
        } else {
          this.showToast('Solicitud de cambio descartada. Se conserva el horario original.', 'success');
        }
        this.loadMyAppointments();
      },
      error: (err) => {
        this.isProcessing = false;
        this.rejectingRescheduleAppointment = null;
        this.showToast(err.error?.error || 'No se pudo rechazar la reprogramación.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  openCancelModal(appointment: Appointment): void {
    this.cancellingAppointment = appointment;
  }

  closeCancelModal(): void {
    this.cancellingAppointment = null;
  }

  onAppointmentCancelled(): void {
    this.cancellingAppointment = null;
    this.showToast('Tu cita ha sido cancelada correctamente y el horario fue liberado.', 'success');
    this.loadMyAppointments();
  }

  showToast(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastMessage = message;
    this.toastType = type;
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => {
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
