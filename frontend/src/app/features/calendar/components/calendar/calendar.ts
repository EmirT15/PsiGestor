import { AppointmentService } from '../../../appointments/services/appointment.service';
import { AppointmentForm } from '../../../appointments/components/appointment-form';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Availability } from '../../models/availability.model';
import { AvailabilityForm } from '../availability-form/availability-form';
import { AvailabilityCard } from '../availability-card/availability-card';
import { Appointment } from '../../../appointments/models/appointment.model';
import { StatusFilterComponent, StatusFilter } from '../../../../shared/components/status-filter/status-filter';
import { CalendarService } from '../../services/calendar.service';

@Component({
  imports: [
    AvailabilityForm,
    AvailabilityCard,
    StatusFilterComponent,
    AppointmentForm
  ],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {
  appointments: Appointment[] = [];
  isSavingAppointment = false;

  availabilities: Availability[] = [];

  currentDate = new Date();
  currentView: 'day' | 'week' | 'month' = 'month';
  statusFilter: StatusFilter = 'all';
  selectedDate = '';
  selectedSlot = '';
  selectedSlotDate = '';
  selectedAvailabilityId: number | null = null;

  selectedAvailability: Availability | null = null;
  showAppointmentPanel = false;

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

    this.selectedAvailability = availability;
    this.showAppointmentPanel = true;
  }

  closeAppointmentPanel(): void {
    this.showAppointmentPanel = false;
  }
  
  onAppointmentCreated(appointment: Appointment): void {

    if (this.isSavingAppointment) {
      return;
    }

    this.isSavingAppointment = true;

    this.appointmentService.createAppointment(appointment).subscribe({
      next: (savedAppointment) => {

        console.log('Appointment saved:', savedAppointment);

        const localAppointment: Appointment = {
          ...appointment,
          id: savedAppointment.id,
          status: savedAppointment.status
        };

        this.appointments.push(localAppointment);

        // Cerrar el panel
        this.closeAppointmentPanel();

        // Limpiar selección
        this.selectedAvailability = null;
        this.selectedSlot = '';

        // Reactivar el estado de guardado
        this.isSavingAppointment = false;

        // Forzar actualización visual de Angular
        this.changeDetectorRef.detectChanges();
      },

      error: (error) => {

        console.error('Error saving appointment:', error);

        this.isSavingAppointment = false;

        this.changeDetectorRef.detectChanges();

        alert('No se pudo guardar la cita.');
      }
    });
  }

  isSlotReserved(slot: string, date: string): boolean {

    const [startTime, endTime] = slot.split(' - ');

    return this.appointments.some(appointment =>
      appointment.date === date &&
      appointment.startTime === startTime &&
      appointment.endTime === endTime
    );
  }

  getReservedSlots(date: string): string[] {

    return this.appointments
      .filter(appointment => appointment.date === date)
      .map(appointment =>
        `${appointment.startTime} - ${appointment.endTime}`
      );

  }

  getAvailableSlots(availability: Availability): string[] {

    return this.generateSlots(availability).filter(
      slot => !this.isSlotReserved(slot, availability.date)
    );

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
    this.availabilities = [
      {
        id: 1,
        date: '2026-09-29',
        startTime: '09:00',
        endTime: '12:00',
        duration: 45,
        breakTime: 15,
        status: 'Disponible'
      },
      {
        id: 2,
        date: '2026-09-29',
        startTime: '13:00',
        endTime: '15:00',
        duration: 45,
        breakTime: 15,
        status: 'Disponible'
      }
    ];

    this.changeDetectorRef.detectChanges();
  }

  constructor(
    private calendarService: CalendarService,
    private changeDetectorRef: ChangeDetectorRef,
    private appointmentService: AppointmentService
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