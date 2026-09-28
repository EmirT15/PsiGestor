import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Availability } from '../../models/availability.model';
import { AvailabilityForm } from '../availability-form/availability-form';
import { AvailabilityCard } from '../availability-card/availability-card';
import { AppointmentDetails } from '../appointment-details/appointment-details';
import { RescheduleDetails } from '../reschedule-details/reschedule-details';
import { RescheduleModal, RescheduleData } from '../reschedule-modal/reschedule-modal';
import { CancelModal, CancelModalData } from '../cancel-modal/cancel-modal';
import {
  StatusFilterComponent,
  StatusFilter
} from '../../../../shared/components/status-filter/status-filter';
import { CalendarService } from '../../services/calendar.service';

@Component({
  imports: [
    AvailabilityForm,
    AvailabilityCard,
    AppointmentDetails,
    RescheduleDetails,
    RescheduleModal,
    CancelModal,
    StatusFilterComponent
  ],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {

  availabilities: Availability[] = [];

  currentDate = new Date();
  currentView: 'day' | 'week' | 'month' = 'month';
  statusFilter: StatusFilter = 'all';
  selectedDate = '';
  selectedSlot = '';
  selectedSlotDate = '';
  selectedAvailabilityId: number | null = null;
  selectedAvailabilityStatus: string = '';
  isSidebarOpen = false;
  isRescheduleModalOpen = false;
  isCancelModalOpen = false;

  selectedAppointmentData: any = null;
  selectedRescheduleDetails: any = null;

  rescheduleData: RescheduleData = {
    studentName: '',
    studentInfo: '',
    modality: '',
    currentDate: '',
    currentTime: ''
  };

  cancelData: CancelModalData = {
    folio: '',
    dateStr: '',
    timeStr: '',
    originalReason: ''
  };

  openRescheduleModal(): void {
    this.isRescheduleModalOpen = true;
  }

  closeRescheduleModal(): void {
    this.isRescheduleModalOpen = false;
  }

  onRescheduleConfirm(data: any): void {
    if (this.selectedAvailabilityId) {
      this.calendarService.rescheduleAppointment(
        this.selectedAvailabilityId, 
        data.date, 
        data.startTime, 
        data.endTime
      ).subscribe({
        next: () => {
          this.closeRescheduleModal();
          this.closeSidebar();
          this.loadAvailabilities();
        },
        error: (err) => console.error('Error al reprogramar:', err)
      });
    }
  }

  openCancelModal(): void {
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
  }

  onCancelConfirm(data: any): void {
    if (this.selectedAvailabilityId) {
      this.calendarService.cancelAppointment(
        this.selectedAvailabilityId, 
        data.reason, 
        data.observation
      ).subscribe({
        next: () => {
          this.closeCancelModal();
          this.closeSidebar();
          this.loadAvailabilities();
        },
        error: (err) => console.error('Error al cancelar:', err)
      });
    }
  }

  getDaysInMonth(): Date[] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const days: Date[] = [];
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  getFirstDayOfMonth(): number {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    return new Date(year, month, 1).getDay();
  }

  changeMonth(offset: number): void {
    const newDate = new Date(this.currentDate);

    if (this.currentView === 'day') {
      newDate.setDate(newDate.getDate() + offset);
    } else if (this.currentView === 'week') {
      newDate.setDate(newDate.getDate() + (offset * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + offset);
      newDate.setDate(1);
    }

    this.currentDate = newDate;
    this.selectedDate = '';
    this.selectedSlot = '';
  }

  goToToday(): void {
    const today = new Date();

    this.currentDate = today;
    this.selectedDate = this.formatDate(today);
    this.selectedSlot = '';
  }

  getMonthName(): string {
    return this.currentDate.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric'
    });
  }

  getAvailabilitiesForDate(date: Date): Availability[] {
    const dateString = this.formatDate(date);
    return this.availabilities.filter((availability) => {
      const sameDate = availability.date === dateString;

      const sameStatus =
        this.statusFilter === 'all' ||
        availability.status === this.statusFilter;

      return sameDate && sameStatus;
    });
  }

  selectDate(date: Date): void {
    this.selectedDate = this.formatDate(date);
    this.selectedSlot = '';
    this.changeDetectorRef.detectChanges();
  }

  selectSlot(slot: string, availability: Availability): void {
    this.selectedSlot = slot;
    this.selectedSlotDate = availability.date;
    this.selectedAvailabilityId = availability.id;
    this.selectedAvailabilityStatus = availability.status;
    
    // Map to cancelData so the modal shows real info
    this.cancelData = {
      folio: availability.folio || 'PSI-2026-0000',
      dateStr: availability.date,
      timeStr: `${availability.startTime} - ${availability.endTime} (${availability.duration} min)`,
      originalReason: availability.consultationReason || 'Consulta general'
    };

    // Map to rescheduleData
    this.rescheduleData = {
      studentName: availability.studentName || 'Alumno',
      studentInfo: `${availability.studentAge || 0} años • ${availability.studentSemester || ''} - ${availability.studentProgram || ''}`,
      modality: `${availability.modality || 'Presencial'} (${availability.location || ''})`,
      currentDate: availability.date,
      currentTime: `${availability.startTime} - ${availability.endTime}`
    };

    // Map to appointment data
    this.selectedAppointmentData = {
      id: availability.id,
      status: availability.status,
      studentName: availability.studentName || 'Alumno',
      studentAge: availability.studentAge || 0,
      studentSemester: availability.studentSemester || '',
      studentProgram: availability.studentProgram || '',
      dateStr: availability.date + ', ' + availability.startTime + ' - ' + availability.endTime,
      sessionType: 'Sesión individual',
      duration: availability.duration || 45,
      modality: availability.modality || 'Presencial',
      location: availability.location || 'Cubículo',
      locationDetail: 'Consultorio psicopedagógico',
      reason: availability.consultationReason || '',
      derivedBy: 'Asignación directa',
      sessionCount: '1ra Sesión'
    };

    // Map to reschedule details
    this.selectedRescheduleDetails = {
      id: availability.id,
      studentName: availability.studentName || 'Alumno',
      studentInitials: availability.studentInitials || 'AL',
      studentAge: availability.studentAge || 0,
      studentSemester: availability.studentSemester || '',
      studentProgram: availability.studentProgram || '',
      originalDateStr: availability.date + ', ' + availability.startTime + ' - ' + availability.endTime,
      originalDetails: `${availability.modality || 'Presencial'} • ${availability.location || ''} • ${availability.duration} min`,
      proposedDateStr: availability.proposedDate ? (availability.proposedDate + ', ' + availability.proposedStartTime + ' - ' + availability.proposedEndTime) : 'Propuesta pendiente',
      proposedDetails: `${availability.modality || 'Presencial'} • ${availability.location || ''} • ${availability.duration} min`,
      sentAtStr: 'Recientemente',
      reason: availability.consultationReason || ''
    };
    
    this.isSidebarOpen = true;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  getSelectedDate(): Date {
    return new Date(this.selectedDate + 'T00:00:00');
  }

  getCurrentViewDate(): Date {
    if (this.selectedDate) {
      return this.getSelectedDate();
    }

    return this.currentDate;
  }

  getWeekDays(): Date[] {
    const date = this.getCurrentViewDate();
    const dayOfWeek = date.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - daysFromMonday);

    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }

  hasAvailability(date: Date): boolean {
    return this.getAvailabilitiesForDate(date).length > 0;
  }

  getAvailableSlots(): Availability[] {
    return this.availabilities.filter(a => a.status === 'Disponible');
  }

  isSelected(date: Date): boolean {
    return this.selectedDate === this.formatDate(date);
  }

  generateSlots(availability: Availability): string[] {
    const slots: string[] = [];

    let currentMinutes =
      this.timeToMinutes(availability.startTime);

    const endMinutes =
      this.timeToMinutes(availability.endTime);

    while (
      currentMinutes + availability.duration <= endMinutes
    ) {
      const slotStart = this.formatTime12Hour(currentMinutes);

      const slotEnd = this.formatTime12Hour(
        currentMinutes + availability.duration
      );

      slots.push(`${slotStart} - ${slotEnd}`);

      currentMinutes +=
        availability.duration + availability.breakTime;
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours.toString().padStart(2, '0')}:${remainingMinutes
      .toString()
      .padStart(2, '0')}`;
  }

  formatTime12Hour(minutes: number): string {
    const hours24 = Math.floor(minutes / 60);
    const minutesPart = minutes % 60;

    const period = hours24 >= 12 ? 'PM' : 'AM';

    let hours12 = hours24 % 12;

    if (hours12 === 0) {
      hours12 = 12;
    }

    return `${String(hours12).padStart(2, '0')}:${String(minutesPart).padStart(2, '0')} ${period}`;
  }

  formatTimeString(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);

    const totalMinutes = hours * 60 + minutes;

    return this.formatTime12Hour(totalMinutes);
  }

  loadAvailabilities(): void {
    this.calendarService.getAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data;

        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Error loading availabilities:', error);
        
        // --- MOCK DATA PARA PRUEBAS (En caso de que el backend no esté corriendo) ---
        const todayStr = this.formatDate(new Date());
        this.availabilities = [
          {
            id: 999,
            date: todayStr,
            startTime: '10:00',
            endTime: '10:45',
            duration: 45,
            breakTime: 0,
            status: 'Reservado'
          },
          {
            id: 998,
            date: todayStr,
            startTime: '11:00',
            endTime: '11:45',
            duration: 45,
            breakTime: 0,
            status: 'Reprogramacion pendiente'
          }
        ];
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  constructor(
    private calendarService: CalendarService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAvailabilities();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}