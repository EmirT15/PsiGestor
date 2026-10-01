import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Availability } from '../../models/availability.model';
import type { StatusFilter } from '../../../../shared/components/status-filter/status-filter';
import { CalendarService } from '../../services/calendar.service';
import { AvailabilityCard } from '../availability-card/availability-card';
import {CalendarToolbar} from '../calendar-toolbar/calendar-toolbar';
import { ManageScheduleModal } from '../manage-schedule-modal/manage-schedule-modal';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    AvailabilityCard,
    CalendarToolbar,
    ManageScheduleModal
  ],
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {

  availabilities: Availability[] = [];
  disabledSchedules: any[] = []; // 1. Nuevo arreglo para inhabilitaciones

  currentDate = new Date();
  currentView: 'day' | 'week' | 'month' = 'week'; //se cambio month por week para que se vea la semana por default
  statusFilter: StatusFilter = 'all';
  selectedDate = '';
  selectedSlot = '';
  selectedSlotDate = '';
  selectedAvailabilityId: number | null = null;

  isManageScheduleOpen = false;
  initialModalData: any = null; // Para precompletar el modal al inhabilitar desde la agenda

  readonly visualTimeRows = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00'
  ];

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

  openManageSchedule(): void {
    this.initialModalData = null;
    this.isManageScheduleOpen = true;
  }

  closeManageSchedule(): void {
    this.isManageScheduleOpen = false;
    this.initialModalData = null;

    // Recargar listas al cerrar el modal
    this.loadAvailabilities();
    this.loadDisabledSchedules();
  }

  // Inhabilitar directamente desde la tarjeta de disponibilidad completa
  handleDisableFromCard(availability: Availability): void {
    const dateStr = availability.date || this.formatDate(this.getCurrentViewDate());
    this.initialModalData = {
      startDate: dateStr,
      endDate: dateStr,
      startTime: availability.startTime, // Carga la hora de inicio exacta de la tarjeta seleccionada
      endTime: availability.endTime,     // Carga la hora de fin exacta de la tarjeta seleccionada
      activeTab: 'disabled'
    };

    this.isManageScheduleOpen = true;
  }

  // Inhabilitar un slot de tiempo específico seleccionado en vista diaria
  handleDisableSelectedSlot(): void {
    if (!this.selectedSlot || !this.selectedSlotDate) return;

    // Convertir el rango ej. "08:00 AM - 09:00 AM" a horas
    const parts = this.selectedSlot.split(' - ');
    const startTime24 = parts[0] ? this.convert12to24(parts[0]) : '08:00:00';
    const endTime24 = parts[1] ? this.convert12to24(parts[1]) : '09:00:00';

    this.openManageSchedule();
  }

  // Inhabilitar una celda disponible desde la vista semanal
  handleDisableFromWeekCell(date: Date, timeRow: string): void {
    const dateStr = this.formatDate(date);
    // Asignar bloque de 1 hora
    const [h] = timeRow.split(':').map(Number);
    const endTimeRow = `${String(h + 1).padStart(2, '0')}:00:00`;

    this.openManageSchedule();
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

  getDisplayedWeekDays(): Date[] {
    return this.getWeekDays().slice(0, 5);
  }

  isToday(date: Date): boolean {
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  getWeekdayLabel(date: Date): string {
    const weekdays = [
      'DOM',
      'LUN',
      'MAR',
      'MIÉ',
      'JUE',
      'VIE',
      'SÁB'
    ];

    return weekdays[date.getDay()];
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

  private convert12to24(time12h: string): string {
    const [time, modifier] = time12h.trim().split(' ');
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);
    if (h === 12) h = 0;
    if (modifier === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${minutes}:00`;
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
      }
    });
  }

  constructor(
    private calendarService: CalendarService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAvailabilities();
    this.loadDisabledSchedules(); // 2. Cargar al iniciar

    // Escucha reactiva cuando se inhabilitan o habilitan horarios
    this.calendarService.scheduleChanged$.subscribe(() => {
    this.loadAvailabilities();
    this.loadDisabledSchedules();
  });
  }

  // 3. Método para cargar inhabilitaciones
  loadDisabledSchedules(): void {
    this.calendarService.getDisabledSchedules().subscribe({
      next: (data) => {
        this.disabledSchedules = data;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => console.error('Error loading disabled schedules:', error)
    });
  }

  // 5. Filtro para obtener inhabilitaciones por día
  getDisabledSchedulesForDate(date: Date): any[] {
    const dateString = this.formatDate(date);
    return this.disabledSchedules.filter((ds) => {
      // Maneja si la inhabilitación tiene startDate/endDate o solo date
      const start = ds.startDate || ds.date;
      const end = ds.endDate || ds.date;
      return dateString >= start && dateString <= end;
    });
  }

  // 6. Verificar si un día entero tiene inhabilitaciones
  hasDisabledSchedule(date: Date): boolean {
    return this.getDisabledSchedulesForDate(date).length > 0;
  }

  // 7. Verificar si un bloque de hora específico (ej. "08:00") cae en una inhabilitación
  getDisabledForTimeCell(date: Date, timeRow: string): any[] {
    const disabledForDay = this.getDisabledSchedulesForDate(date);
    return disabledForDay.filter(ds => {
      // Simplificación: si la hora de inicio de la fila entra en el rango inhabilitado
      return timeRow >= ds.startTime && timeRow < ds.endTime;
    });
  }

  getAvailabilitiesForTimeCell(date: Date, timeRow: string): Availability[] {
    const availForDay = this.getAvailabilitiesForDate(date);
    return availForDay.filter(a => timeRow >= a.startTime && timeRow < a.endTime);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}