import { Component, OnInit, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import {
  Calendar
} from '../../../calendar/components/calendar/calendar';
import { BookAppointmentModal } from '../../components/book-appointment-modal/book-appointment-modal';
import { StudentHeader } from '../../components/student-header/student-header';
import { AuthService } from '../../../../core/services/auth.service';
import { CalendarService } from '../../../calendar/services/calendar.service';

@Component({
  selector: 'app-patient-availability',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Calendar,
    StudentHeader,
    BookAppointmentModal
  ],
  templateUrl: './availability.html',
  styleUrl: './availability.css'
})
export class Availability implements OnInit {
  @ViewChild(Calendar) calendarComponent?: Calendar;

  private router = inject(Router);
  readonly authService = inject(AuthService);
  private calendarService = inject(CalendarService);

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

  onAppointmentBooked(response: any): void {
    this.isBookingModalOpen = false;
    this.selectedSlotData = null;

    this.showToast('¡Cita registrada correctamente! Se ha reflejado en tu agenda y en la de la psicóloga.');

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
