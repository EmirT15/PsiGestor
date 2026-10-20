import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonFab,
  IonFabButton,
  IonModal,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonRefresher,
  IonRefresherContent,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  todayOutline,
  addOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  banOutline,
  personOutline,
  timeOutline,
  refreshOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { CalendarService } from '../../core/services/calendar.service';
import { Availability, DisabledSchedule, InvalidationReason } from '../../core/models/availability.model';

@Component({
  selector: 'app-psicologo',
  templateUrl: './psicologo.page.html',
  styleUrls: ['./psicologo.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonFab,
    IonFabButton,
    IonModal,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonRefresher,
    IonRefresherContent,
    IonSpinner
  ]
})
export class PsicologoPage implements OnInit {
  authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private router = inject(Router);

  // Fecha seleccionada
  selectedDate: Date = new Date();
  
  // Datos
  availabilities: Availability[] = [];
  disabledSchedules: DisabledSchedule[] = [];
  isLoading = false;

  // Filtro
  statusFilter: 'all' | 'Disponible' | 'Reservado' | 'Cancelado' | 'Inhabilitado' = 'all';

  onFilterChange(event: any): void {
    this.statusFilter = event.detail.value || 'all';
  }

  // Modales
  isDisableModalOpen = false;
  isCancelModalOpen = false;
  selectedAvailability: Availability | null = null;

  // Formulario inhabilitar
  disableForm = {
    date: this.formatDate(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    reason: 'Reunión' as InvalidationReason,
    observation: ''
  };

  // Formulario cancelar
  cancelForm = {
    reason: 'Fuerza mayor',
    observation: ''
  };

  readonly invalidationReasons: InvalidationReason[] = [
    'Reunión',
    'Comida',
    'Actividad personal',
    'Evento académico',
    'Emergencia',
    'Otro motivo'
  ];

  constructor() {
    addIcons({
      logOutOutline,
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      todayOutline,
      addOutline,
      closeCircleOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      banOutline,
      personOutline,
      timeOutline,
      refreshOutline
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.calendarService.scheduleChanged$.subscribe(() => {
      this.loadData();
    });
  }

  loadData(event?: any): void {
    this.isLoading = true;
    this.calendarService.getAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data || [];
        this.loadDisabledSchedules(event);
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  private loadDisabledSchedules(event?: any): void {
    this.calendarService.getDisabledSchedules().subscribe({
      next: (data) => {
        this.disabledSchedules = data || [];
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  // Navegación de fecha
  changeDay(offset: number): void {
    const nextDate = new Date(this.selectedDate);
    nextDate.setDate(nextDate.getDate() + offset);
    this.selectedDate = nextDate;
    this.disableForm.date = this.formatDate(this.selectedDate);
  }

  goToToday(): void {
    this.selectedDate = new Date();
    this.disableForm.date = this.formatDate(this.selectedDate);
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
      month: 'long',
      year: 'numeric'
    });
  }

  // Filtrado de slots para el día seleccionado
  get slotsForDay(): Availability[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(item => {
      const matchDate = item.date === dateStr;
      if (!matchDate) return false;
      if (this.statusFilter === 'all') return true;
      return item.status === this.statusFilter;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Horarios inhabilitados del día
  get disabledSchedulesForDay(): DisabledSchedule[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.disabledSchedules.filter(item => {
      if (item.type === 'Puntual') {
        return item.startDate === dateStr;
      }
      return dateStr >= item.startDate && (!item.endDate || dateStr <= item.endDate);
    });
  }

  // Contadores del día
  getCount(status: string): number {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(i => i.date === dateStr && i.status === status).length;
  }

  // Abrir modal de inhabilitar
  openDisableModal(): void {
    this.disableForm.date = this.formatDate(this.selectedDate);
    this.isDisableModalOpen = true;
  }

  closeDisableModal(): void {
    this.isDisableModalOpen = false;
  }

  saveDisabledSchedule(): void {
    this.calendarService.disableSchedule({
      date: this.disableForm.date,
      startTime: this.disableForm.startTime,
      endTime: this.disableForm.endTime,
      reason: this.disableForm.reason,
      observation: this.disableForm.observation
    }).subscribe({
      next: () => {
        this.closeDisableModal();
        this.loadData();
      },
      error: (err) => {
        alert(err.error?.error || 'Error al inhabilitar horario.');
      }
    });
  }

  // Abrir modal de cancelar
  openCancelModal(item: Availability): void {
    this.selectedAvailability = item;
    this.cancelForm.reason = 'Fuerza mayor';
    this.cancelForm.observation = '';
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
    this.selectedAvailability = null;
  }

  confirmCancel(): void {
    if (!this.selectedAvailability) return;
    this.calendarService.cancelAppointment(
      this.selectedAvailability.id,
      this.cancelForm.reason,
      this.cancelForm.observation
    ).subscribe({
      next: () => {
        this.closeCancelModal();
        this.loadData();
      },
      error: (err) => {
        alert(err.error?.error || 'Error al cancelar la cita.');
      }
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
