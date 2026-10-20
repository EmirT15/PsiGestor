import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonModal,
  IonButtons,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonRefresher,
  IonRefresherContent,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  checkmarkCircleOutline,
  closeOutline
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';
import { CalendarService } from '../core/services/calendar.service';
import { Availability } from '../core/models/availability.model';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonModal,
    IonButtons,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonRefresher,
    IonRefresherContent,
    IonSpinner
  ]
})
export class Tab2Page implements OnInit {
  authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private router = inject(Router);

  selectedDate: Date = new Date();
  availabilities: Availability[] = [];
  isLoading = false;

  // Modal Agendar
  isBookingModalOpen = false;
  selectedSlot: Availability | null = null;
  bookingForm = {
    modality: 'In person' as 'In person' | 'Online',
    reason: 'Asesoría psicológica inicial'
  };
  isSubmitting = false;

  constructor() {
    addIcons({
      calendarOutline,
      timeOutline,
      chevronBackOutline,
      chevronForwardOutline,
      checkmarkCircleOutline,
      closeOutline
    });
  }

  ngOnInit(): void {
    this.loadAvailableSlots();
  }

  loadAvailableSlots(event?: any): void {
    this.isLoading = true;
    this.calendarService.getAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data || [];
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  changeDay(offset: number): void {
    const next = new Date(this.selectedDate);
    next.setDate(next.getDate() + offset);
    this.selectedDate = next;
  }

  goToToday(): void {
    this.selectedDate = new Date();
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get formattedSelectedDate(): string {
    return this.selectedDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  get availableSlotsForDay(): Availability[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(item => item.date === dateStr && item.status === 'Disponible')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  openBookingModal(slot: Availability): void {
    this.selectedSlot = slot;
    this.isBookingModalOpen = true;
  }

  closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.selectedSlot = null;
  }

  confirmBooking(): void {
    if (!this.selectedSlot) return;
    const user = this.authService.currentUser();
    if (!user) return;

    this.isSubmitting = true;
    this.calendarService.createAppointment({
      student_id: user.student_id || user.id,
      student_name: user.name,
      date: this.selectedSlot.date,
      start_time: this.selectedSlot.startTime,
      end_time: this.selectedSlot.endTime,
      duration: this.selectedSlot.duration,
      modality: this.bookingForm.modality,
      reason: this.bookingForm.reason
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeBookingModal();
        this.loadAvailableSlots();
        // Redirigir a "Mis Citas"
        this.router.navigate(['/tabs/tab1']);
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.error || 'No se pudo reservar la cita.');
      }
    });
  }
}
