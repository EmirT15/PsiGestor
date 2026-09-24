import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Availability } from '../../models/availability.model';
import { AvailabilityForm } from '../availability-form/availability-form';
import { AvailabilityCard } from '../availability-card/availability-card';
import { CalendarService } from '../../services/calendar.service';

@Component({
  imports: [AvailabilityForm, AvailabilityCard],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {

  availabilities: Availability[] = [];

  currentDate = new Date();
  selectedDate = '';
  selectedSlot = '';

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
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + offset,
      1
    );
  }

  getMonthName(): string {
    return this.currentDate.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric'
    });
  }

  getAvailabilitiesForDate(date: Date): Availability[] {
    const dateString = date.toISOString().split('T')[0];

    return this.availabilities.filter(
      (availability) => availability.date === dateString
    );
  }

  selectDate(date: Date): void {
    this.selectedDate = date.toISOString().split('T')[0];
    this.selectedSlot = '';
    this.changeDetectorRef.detectChanges();
  }

  selectSlot(slot: string, availability: Availability): void {
    this.selectedSlot = slot;

  }

  getSelectedDate(): Date {
    return new Date(this.selectedDate + 'T00:00:00');
  }

  hasAvailability(date: Date): boolean {
    return this.getAvailabilitiesForDate(date).length > 0;
  }

  isSelected(date: Date): boolean {
    return this.selectedDate === date.toISOString().split('T')[0];
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
      const slotStart = this.minutesToTime(currentMinutes);

      const slotEnd = this.minutesToTime(
        currentMinutes + availability.duration
      );

      slots.push(`${slotStart} - ${slotEnd}`);

      currentMinutes +=
        availability.duration + availability.breakTime;
    }

    console.log('Slots generados:', slots);

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
  }
}