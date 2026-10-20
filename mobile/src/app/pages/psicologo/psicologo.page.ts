import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
  IonSpinner,
  ToastController
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
  refreshOutline,
  schoolOutline,
  locationOutline,
  documentTextOutline,
  syncOutline,
  searchOutline,
  closeOutline,
  arrowForwardOutline,
  radioOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { CalendarService } from '../../core/services/calendar.service';
import { Availability, DisabledSchedule, InvalidationReason, Student } from '../../core/models/availability.model';

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
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  // Fecha seleccionada
  selectedDate: Date = new Date();
  
  // Datos
  availabilities: Availability[] = [];
  disabledSchedules: DisabledSchedule[] = [];
  isLoading = false;

  // Filtro
  statusFilter: 'all' | 'Disponible' | 'Reservado' | 'Cancelado' | 'Inhabilitado' = 'all';

  // Modal Activo
  activeModal: 'none' | 'disable' | 'booking' | 'details' | 'cancel' | 'reschedule' | 'rescheduleDetails' | 'cancelDetails' = 'none';
  selectedSlot: Availability | null = null;

  // Formulario Inhabilitar
  disableForm = {
    date: this.formatDate(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    reason: 'Reunión' as InvalidationReason,
    observation: ''
  };

  // Formulario Agendar Manualmente (Psicóloga)
  bookingForm = {
    studentSearch: '',
    selectedStudent: null as Student | null,
    modality: 'In person' as 'In person' | 'Online',
    location: 'Consultorio de Psicopedagogía',
    reason: ''
  };
  studentSearchResults: Student[] = [];
  isSearchingStudents = false;
  isSavingAppointment = false;

  // Formulario Cancelar
  cancelForm = {
    reason: 'Fuerza mayor',
    observation: ''
  };

  // Formulario Reprogramar
  rescheduleForm = {
    newDate: this.formatDate(new Date()),
    newSlotId: null as number | null,
    selectedNewSlot: null as Availability | null,
    reason: 'Ajuste de agenda psicopedagógica'
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
      refreshOutline,
      schoolOutline,
      locationOutline,
      documentTextOutline,
      syncOutline,
      searchOutline,
      closeOutline,
      arrowForwardOutline,
      radioOutline
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.calendarService.scheduleChanged$.subscribe(() => {
      this.loadData();
    });
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
      icon: color === 'success' ? 'checkmark-circle-outline' : (color === 'warning' ? 'alert-circle-outline' : 'close-circle-outline')
    });
    await toast.present();
  }

  loadData(event?: any): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.calendarService.getAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data || [];
        this.loadDisabledSchedules(event);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      }
    });
  }

  private loadDisabledSchedules(event?: any): void {
    this.calendarService.getDisabledSchedules().subscribe({
      next: (data) => {
        this.disabledSchedules = data || [];
        this.isLoading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      }
    });
  }

  // Navegación
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

  // Filtrado
  onFilterChange(event: any): void {
    this.statusFilter = event.detail.value || 'all';
  }

  get slotsForDay(): Availability[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(item => {
      const matchDate = item.date === dateStr;
      if (!matchDate) return false;
      if (this.statusFilter === 'all') return true;
      return item.status === this.statusFilter;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  get disabledSchedulesForDay(): DisabledSchedule[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.disabledSchedules.filter(item => {
      if (item.type === 'Puntual') {
        return item.startDate === dateStr;
      }
      return dateStr >= item.startDate && (!item.endDate || dateStr <= item.endDate);
    });
  }

  getCount(status: string): number {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(i => i.date === dateStr && i.status === status).length;
  }

  // Click en Slot
  onSlotClick(slot: Availability): void {
    this.selectedSlot = slot;

    if (slot.status === 'Disponible') {
      this.openBookingModal(slot);
    } else if (slot.status === 'Reservado') {
      this.activeModal = 'details';
    } else if (slot.status === 'Cancelado') {
      this.activeModal = 'cancelDetails';
    } else if (slot.status === 'Reprogramacion pendiente') {
      this.activeModal = 'rescheduleDetails';
    }
  }

  closeModal(): void {
    this.activeModal = 'none';
    this.cdr.detectChanges();
  }

  // 1. Inhabilitar Horario
  openDisableModal(): void {
    this.disableForm.date = this.formatDate(this.selectedDate);
    this.activeModal = 'disable';
  }

  saveDisabledSchedule(): void {
    this.calendarService.disableSchedule({
      date: this.disableForm.date,
      startTime: this.disableForm.startTime,
      endTime: this.disableForm.endTime,
      reason: this.disableForm.reason,
      observation: this.disableForm.observation
    }).subscribe({
      next: async () => {
        this.closeModal();
        this.loadData();
        await this.showToast('Horario inhabilitado correctamente.', 'success');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al inhabilitar horario.', 'danger');
      }
    });
  }

  // 2. Agendar Cita Manualmente
  openBookingModal(slot: Availability): void {
    this.selectedSlot = slot;
    this.bookingForm.studentSearch = '';
    this.bookingForm.selectedStudent = null;
    this.bookingForm.modality = 'In person';
    this.bookingForm.location = 'Consultorio de Psicopedagogía';
    this.bookingForm.reason = '';
    this.studentSearchResults = [];
    this.activeModal = 'booking';
  }

  onStudentSearchInput(value: string): void {
    this.bookingForm.studentSearch = value;
    if (!value || value.trim().length < 2) {
      this.studentSearchResults = [];
      this.cdr.detectChanges();
      return;
    }

    this.isSearchingStudents = true;
    this.cdr.detectChanges();
    this.calendarService.searchStudents(value.trim()).subscribe({
      next: (students) => {
        this.studentSearchResults = students || [];
        this.isSearchingStudents = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.studentSearchResults = [];
        this.isSearchingStudents = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectStudent(student: Student): void {
    this.bookingForm.selectedStudent = student;
    this.bookingForm.studentSearch = `${student.name} (${student.studentId})`;
    this.studentSearchResults = [];
    this.cdr.detectChanges();
  }

  saveManualAppointment(): void {
    if (!this.selectedSlot) return;

    if (!this.bookingForm.selectedStudent) {
      this.showToast('Por favor busca y selecciona a un alumno de la lista.', 'warning');
      return;
    }

    if (!this.bookingForm.reason.trim()) {
      this.showToast('Por favor escribe el motivo de la cita.', 'warning');
      return;
    }

    this.isSavingAppointment = true;
    this.cdr.detectChanges();

    this.calendarService.createAppointment({
      student_id: this.bookingForm.selectedStudent.id,
      student_name: this.bookingForm.selectedStudent.name,
      date: this.selectedSlot.date,
      start_time: this.selectedSlot.startTime,
      end_time: this.selectedSlot.endTime,
      duration: this.selectedSlot.duration,
      modality: this.bookingForm.modality,
      location: this.bookingForm.modality === 'In person' ? this.bookingForm.location : undefined,
      reason: this.bookingForm.reason.trim()
    }).subscribe({
      next: async () => {
        this.isSavingAppointment = false;
        this.closeModal();
        this.loadData();
        await this.showToast('¡Cita agendada exitosamente!', 'success');
      },
      error: async (err) => {
        this.isSavingAppointment = false;
        this.cdr.detectChanges();
        await this.showToast(err.error?.error || 'Error al agendar la cita.', 'danger');
      }
    });
  }

  // 3. Cancelar Cita
  openCancelModal(slot?: Availability): void {
    if (slot) this.selectedSlot = slot;
    this.cancelForm.reason = 'Fuerza mayor';
    this.cancelForm.observation = '';
    this.activeModal = 'cancel';
  }

  confirmCancel(): void {
    if (!this.selectedSlot) return;
    this.calendarService.cancelAppointment(
      this.selectedSlot.id,
      this.cancelForm.reason,
      this.cancelForm.observation
    ).subscribe({
      next: async () => {
        this.closeModal();
        this.loadData();
        await this.showToast('Cita cancelada correctamente.', 'warning');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al cancelar la cita.', 'danger');
      }
    });
  }

  // 4. Reprogramar Cita
  openRescheduleModal(slot?: Availability): void {
    if (slot) this.selectedSlot = slot;
    this.rescheduleForm.newDate = this.selectedSlot?.date || this.formatDate(this.selectedDate);
    this.rescheduleForm.newSlotId = null;
    this.rescheduleForm.selectedNewSlot = null;
    this.rescheduleForm.reason = 'Ajuste de agenda psicopedagógica';
    this.activeModal = 'reschedule';
  }

  get availableSlotsForReschedule(): Availability[] {
    return this.availabilities.filter(item =>
      item.date === this.rescheduleForm.newDate &&
      item.status === 'Disponible' &&
      item.id !== this.selectedSlot?.id
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  selectRescheduleSlot(slot: Availability): void {
    this.rescheduleForm.newSlotId = slot.id;
    this.rescheduleForm.selectedNewSlot = slot;
  }

  saveReschedule(): void {
    if (!this.selectedSlot || !this.rescheduleForm.selectedNewSlot) {
      this.showToast('Por favor selecciona el nuevo horario propuesto.', 'warning');
      return;
    }

    this.calendarService.rescheduleAppointment(
      this.selectedSlot.id,
      this.rescheduleForm.newDate,
      this.rescheduleForm.selectedNewSlot.startTime,
      this.rescheduleForm.selectedNewSlot.endTime
    ).subscribe({
      next: async () => {
        this.closeModal();
        this.loadData();
        await this.showToast('Propuesta de reprogramación enviada correctamente.', 'warning');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al proponer la reprogramación.', 'danger');
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
