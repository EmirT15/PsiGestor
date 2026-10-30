
import {
    ChangeDetectorRef,
    Component,
    OnInit,
    PLATFORM_ID,
    inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
    CalendarService,
    Appointment
} from '../../../calendar/services/calendar.service';

import {
    StudentHeader,
    StudentHeaderData
} from '../../components/student-header/student-header';
import {
    RescheduleAppointmentModal
} from '../../components/reschedule-appointment-modal/reschedule-appointment-modal';
import {
    CancelAppointmentModal
} from '../../components/cancel-appointment-modal/cancel-appointment-modal';

type AppointmentTab =
    | 'upcoming'
    | 'in-progress'
    | 'requests'
    | 'history'
    | 'cancelled';

@Component({
    selector: 'app-student-appointments',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        StudentHeader,
        RescheduleAppointmentModal,
        CancelAppointmentModal
    ],
    templateUrl: './appointments.html',
    styleUrl: './appointments.css'
})
export class Appointments implements OnInit {
    authService = inject(AuthService);

    private router = inject(Router);
    private calendarService = inject(CalendarService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    appointments: Appointment[] = [];

    isLoadingAppointments = false;
    isProcessing = false;
    toastMessage: string | null = null;

    activeTab: AppointmentTab = 'upcoming';

    reschedulingAppointment: Appointment | null = null;
    cancellingAppointment: Appointment | null = null;

    get user(): StudentHeaderData | null {
        const user = this.authService.currentUser();

        if (!user) return null;

        return {
            name: user.name,
            studentId: user.studentCode || (
                user.studentId != null ? String(user.studentId) : ''
            ),
            role: 'Alumno',
            photoUrl: user.avatarUrl
        };
    }

    // Citas confirmadas que todavía no comienzan.
    get upcomingAppointments(): Appointment[] {
        return this.appointments
            .filter(
                apt =>
                    apt.status === 'Reserved' &&
                    this.isUpcoming(apt)
            )
            .sort((a, b) => {
                const dateA = this.getAppointmentDateTime(
                    a.date,
                    a.start_time
                );

                const dateB = this.getAppointmentDateTime(
                    b.date,
                    b.start_time
                );

                return dateA - dateB;
            });
    }

    // Citas que ya comenzaron y todavía no terminan.
    get inProgressAppointments(): Appointment[] {
        return this.appointments.filter(
            apt =>
                apt.status === 'Reserved' &&
                this.isInProgress(apt)
        );
    }

    // Solicitudes pendientes de reprogramación.
    get pendingRescheduleAppointments(): Appointment[] {
        return this.appointments.filter(
            apt =>
                apt.status === 'Pending Reschedule' ||
                apt.status === 'Reprogramacion pendiente'
        );
    }

    // Citas cuya hora de finalización ya pasó.
    get historyAppointments(): Appointment[] {
        return this.appointments.filter(
            apt =>
                apt.status !== 'Cancelled' &&
                apt.status !== 'Pending Reschedule' &&
                apt.status !== 'Reprogramacion pendiente' &&
                this.isPast(apt)
        );
    }

    // Citas canceladas.
    get cancelledAppointments(): Appointment[] {
        return this.appointments.filter(
            apt => apt.status === 'Cancelled'
        );
    }

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (!this.authService.currentUser()) {
            this.authService.checkSession().subscribe({
                next: () => this.loadMyAppointments(),
                error: () => this.loadMyAppointments()
            });
        } else {
            this.loadMyAppointments();
        }
    }

    // Convierte la fecha y hora de la cita en una fecha local.
    private getAppointmentDateTime(
        date: string,
        time: string
    ): number {
        if (!date || !time) {
            return NaN;
        }

        const cleanTime = time.trim().slice(0, 5);

        return new Date(
            `${date.substring(0, 10)}T${cleanTime}:00`
        ).getTime();
    }

    private isUpcoming(apt: Appointment): boolean {
        const start = this.getAppointmentDateTime(
            apt.date,
            apt.start_time
        );

        return Number.isFinite(start) && start > Date.now();
    }

    private isInProgress(apt: Appointment): boolean {
        const start = this.getAppointmentDateTime(
            apt.date,
            apt.start_time
        );

        const end = this.getAppointmentDateTime(
            apt.date,
            apt.end_time
        );

        const now = Date.now();

        return (
            Number.isFinite(start) &&
            Number.isFinite(end) &&
            start <= now &&
            now < end
        );
    }

    private isPast(apt: Appointment): boolean {
        const end = this.getAppointmentDateTime(
            apt.date,
            apt.end_time
        );

        return Number.isFinite(end) && end <= Date.now();
    }

    isPendingRequestExpired(apt: Appointment): boolean {
        return this.isPast(apt);
    }

    isPresencial(modality?: string): boolean {
        return modality === 'In person' || modality === 'Presencial';
    }

    formatDate(dateStr: string): string {
        if (!dateStr) {
            return '';
        }

        try {
            const [year, month, day] = dateStr
                .substring(0, 10)
                .split('-')
                .map(Number);

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

    setActiveTab(tab: AppointmentTab): void {
        this.activeTab = tab;
    }

    loadMyAppointments(): void {
        this.isLoadingAppointments = true;
        this.cdr.detectChanges();

        this.calendarService.getStudentMyAppointments().subscribe({
            next: response => {
                this.appointments = response?.appointments || [];
                this.isLoadingAppointments = false;
                this.cdr.detectChanges();
            },
            error: error => {
                this.isLoadingAppointments = false;
                console.error('Error al cargar citas del alumno:', error);
                this.showToast('No fue posible cargar tus citas.');
                this.cdr.detectChanges();
            }
        });
    }

    openRescheduleModal(apt: Appointment): void {
        if (
            apt.status !== 'Reserved' ||
            !this.isUpcoming(apt)
        ) {
            return;
        }

        this.reschedulingAppointment = apt;
    }

    closeRescheduleModal(): void {
        this.reschedulingAppointment = null;
    }

    onRescheduleRequested(): void {
        this.reschedulingAppointment = null;

        this.showToast(
            'Solicitud de reprogramación enviada correctamente.'
        );

        this.loadMyAppointments();
    }

    openCancelModal(apt: Appointment): void {
        if (
            apt.status !== 'Reserved' ||
            !this.isUpcoming(apt)
        ) {
            return;
        }

        this.cancellingAppointment = apt;
    }

    closeCancelModal(): void {
        this.cancellingAppointment = null;
    }

    onAppointmentCancelled(): void {
        this.cancellingAppointment = null;

        this.showToast(
            'Tu cita ha sido cancelada correctamente.'
        );

        this.loadMyAppointments();
    }

    acceptReschedule(apt: Appointment): void {
        if (
            this.isProcessing ||
            this.isPendingRequestExpired(apt)
        ) {
            return;
        }

        if (!confirm('¿Deseas aceptar la propuesta de reprogramación?')) {
            return;
        }

        this.isProcessing = true;
        this.cdr.detectChanges();

        this.calendarService.approveReschedule(apt.id).subscribe({
            next: () => {
                this.isProcessing = false;

                this.showToast(
                    'La reprogramación ha sido aceptada.'
                );

                this.loadMyAppointments();
            },
            error: error => {
                this.isProcessing = false;

                this.showToast(
                    error.error?.error ||
                    'No se pudo aceptar la reprogramación.'
                );

                this.cdr.detectChanges();
            }
        });
    }

    rejectReschedule(apt: Appointment): void {
        if (
            this.isProcessing ||
            this.isPendingRequestExpired(apt)
        ) {
            return;
        }

        const isPsychologist =
            apt.reschedule_requested_by === 'psicologo';

        const message = isPsychologist
            ? '¿Deseas rechazar la propuesta de la psicóloga?'
            : '¿Deseas descartar tu solicitud de cambio de horario?';

        if (!confirm(message)) {
            return;
        }

        this.isProcessing = true;
        this.cdr.detectChanges();

        this.calendarService.rejectReschedule(apt.id).subscribe({
            next: response => {
                this.isProcessing = false;

                this.showToast(
                    response.action === 'cancelled'
                        ? 'La propuesta fue rechazada y la cita se canceló.'
                        : 'La solicitud fue descartada y se conservó el horario original.'
                );

                this.loadMyAppointments();
            },
            error: error => {
                this.isProcessing = false;

                this.showToast(
                    error.error?.error ||
                    'No se pudo procesar la solicitud.'
                );

                this.cdr.detectChanges();
            }
        });
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
            next: () => this.router.navigate(['/login']),
            error: () => this.router.navigate(['/login'])
        });
    }
}
