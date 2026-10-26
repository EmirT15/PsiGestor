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
  isProcessing = false;
  toastMessage: string | null = null;

  // Modales
  reschedulingAppointment: Appointment | null = null;
  cancellingAppointment: Appointment | null = null;

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
        this.showToast('¡Has aceptado la reprogramación! La cita ha sido confirmada en el nuevo horario.');
        this.loadMyAppointments();
      },
      error: (err) => {
        this.isProcessing = false;
        this.showToast(err.error?.error || 'No se pudo aceptar la reprogramación.');
        this.cdr.detectChanges();
      }
    });
  }

  rejectReschedule(apt: Appointment): void {
    if (this.isProcessing) return;
    const isPsicologo = apt.reschedule_requested_by === 'psicologo';
    const confirmMsg = isPsicologo
      ? '¿Estás seguro de que deseas rechazar la propuesta de la psicóloga? Al rechazarla, tu cita se cancelará definitivamente ya que la psicóloga no cuenta con disponibilidad en el horario original.'
      : '¿Deseas descartar tu solicitud de cambio de horario? Tu cita continuará agendada en el horario original.';

    if (!confirm(confirmMsg)) {
      return;
    }

    this.isProcessing = true;
    this.cdr.detectChanges();

    this.calendarService.rejectReschedule(apt.id).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.action === 'cancelled') {
          this.showToast('Propuesta rechazada. La cita ha sido cancelada definitivamente.');
        } else {
          this.showToast('Solicitud de cambio descartada. Se conserva el horario original.');
        }
        this.loadMyAppointments();
      },
      error: (err) => {
        this.isProcessing = false;
        this.showToast(err.error?.error || 'No se pudo rechazar la reprogramación.');
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
