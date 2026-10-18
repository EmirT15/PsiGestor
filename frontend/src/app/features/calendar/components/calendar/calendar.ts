import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  Inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { forkJoin } from 'rxjs';
import type { StatusFilter } from '../../../../shared/components/status-filter/status-filter';
import { Availability } from '../../models/availability.model';
import { CalendarService } from '../../services/calendar.service';
import type {
  RegularScheduleResponse
} from '../../services/regular-schedule.service';
import { RegularScheduleService } from '../../services/regular-schedule.service';
import { AppointmentDetails } from '../appointment-details/appointment-details';
import { AvailabilityCard } from '../availability-card/availability-card';
import { CalendarToolbar } from '../calendar-toolbar/calendar-toolbar';
import {
  CancelModal,
  CancelModalData
} from '../cancel-modal/cancel-modal';
import { ManageScheduleModal } from '../manage-schedule-modal/manage-schedule-modal';
import type {
  RegularScheduleConfig
} from '../regular-schedule/regular-schedule';
import { RescheduleDetails } from '../reschedule-details/reschedule-details';
import {
  RescheduleData,
  RescheduleModal
} from '../reschedule-modal/reschedule-modal';


@Component({
  imports: [
    AvailabilityCard,
    AppointmentDetails,
    RescheduleDetails,
    RescheduleModal,
    CancelModal,
    CalendarToolbar,
    ManageScheduleModal
  ],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar{

  private isBrowser: boolean;

  readonly calendarRenderVersion =
  signal(0);

  availabilities: Availability[] = [];

  regularSchedule: RegularScheduleResponse | null = null;

  currentDate = new Date();

  currentView: 'day' | 'week' | 'month' = 'week';

  statusFilter: StatusFilter = 'all';

  selectedDate = '';
  selectedSlot = '';
  selectedSlotDate = '';
  selectedAvailabilityId: number | null = null;

  selectedAvailabilityStatus = '';

  isSidebarOpen = false;
  isRescheduleModalOpen = false;
  isCancelModalOpen = false;
  isManageScheduleOpen = false;

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
  this.isManageScheduleOpen = true;
}

closeManageSchedule(): void {
  this.isManageScheduleOpen = false;
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

 selectDate(
  date: Date): void {

  this.currentDate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  this.selectedDate =
    this.formatDate(
      this.currentDate
    );

  this.selectedSlot = '';

  this.selectedSlotDate = '';

  this.selectedAvailabilityId = null;


  this.changeDetectorRef
    .detectChanges();

}

  selectSlot(slot: string, availability: Availability): void {
    this.selectedSlot = slot;
    this.selectedSlotDate = availability.date;
    this.selectedAvailabilityId = availability.id;
    this.selectedAvailabilityStatus = availability.status;

    this.cancelData = {
      folio: availability.folio || 'PSI-2026-0000',
      dateStr: availability.date,
      timeStr: `${availability.startTime} - ${availability.endTime} (${availability.duration} min)`,
      originalReason: availability.consultationReason || 'Consulta general'
    };

    this.rescheduleData = {
      studentName: availability.studentName || 'Alumno',
      studentInfo:
        `${availability.studentAge || 0} años • ` +
        `${availability.studentSemester || ''} - ` +
        `${availability.studentProgram || ''}`,
      modality:
        `${availability.modality || 'Presencial'} ` +
        `(${availability.location || ''})`,
      currentDate: availability.date,
      currentTime:
        `${availability.startTime} - ${availability.endTime}`
    };

    this.selectedAppointmentData = {
      id: availability.id,
      status: availability.status,
      studentName: availability.studentName || 'Alumno',
      studentAge: availability.studentAge || 0,
      studentSemester: availability.studentSemester || '',
      studentProgram: availability.studentProgram || '',
      dateStr:
        availability.date +
        ', ' +
        availability.startTime +
        ' - ' +
        availability.endTime,
      sessionType: 'Sesión individual',
      duration: availability.duration || 45,
      modality: availability.modality || 'Presencial',
      location: availability.location || 'Cubículo',
      locationDetail: 'Consultorio psicopedagógico',
      reason: availability.consultationReason || '',
      derivedBy: 'Asignación directa',
      sessionCount: '1ra Sesión'
    };

    this.selectedRescheduleDetails = {
      id: availability.id,
      studentName: availability.studentName || 'Alumno',
      studentInitials: availability.studentInitials || 'AL',
      studentAge: availability.studentAge || 0,
      studentSemester: availability.studentSemester || '',
      studentProgram: availability.studentProgram || '',
      originalDateStr:
        availability.date +
        ', ' +
        availability.startTime +
        ' - ' +
        availability.endTime,
      originalDetails:
        `${availability.modality || 'Presencial'} • ` +
        `${availability.location || ''} • ` +
        `${availability.duration} min`,
      proposedDateStr: availability.proposedDate
        ? `${availability.proposedDate}, ` +
        `${availability.proposedStartTime} - ` +
        `${availability.proposedEndTime}`
        : 'Propuesta pendiente',
      proposedDetails:
        `${availability.modality || 'Presencial'} • ` +
        `${availability.location || ''} • ` +
        `${availability.duration} min`,
      sentAtStr: 'Recientemente',
      reason: availability.consultationReason || ''
    };

    this.isSidebarOpen = true;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  openRescheduleModal(): void {
    this.isRescheduleModalOpen = true;
  }

  closeRescheduleModal(): void {
    this.isRescheduleModalOpen = false;
  }

  onRescheduleConfirm(data: any): void {
    if (this.selectedAvailabilityId === null) {
      return;
    }

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
      error: (error) => {
        console.error('Error al reprogramar:', error);
      }
    });
  }

  openCancelModal(): void {
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
  }

  onCancelConfirm(data: any): void {
    if (this.selectedAvailabilityId === null) {
      return;
    }

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
      error: (error) => {
        console.error('Error al cancelar:', error);
      }
    });
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
  const date =
    this.getCurrentViewDate();

  const dayOfWeek =
    date.getDay();

  const startOfWeek =
    new Date(date);


  if (dayOfWeek === 0) {

    /*
     * Si la fecha de referencia es domingo,
     * mostrar la siguiente semana laboral.
     */
    startOfWeek.setDate(
      date.getDate() + 1
    );

  } else {

    /*
     * Para lunes a sábado,
     * obtener el lunes de la semana actual.
     */
    const daysFromMonday =
      dayOfWeek - 1;

    startOfWeek.setDate(
      date.getDate() - daysFromMonday
    );
  }


  const days: Date[] = [];


  for (
    let index = 0;
    index < 7;
    index++
  ) {

    const day =
      new Date(startOfWeek);

    day.setDate(
      startOfWeek.getDate() + index
    );

    days.push(day);
  }


  return days;
}

 getDisplayedWeekDays(): Date[] {

  const weekDays =
    this.getWeekDays();

  /*
   * getWeekDays() conserva la lógica interna
   * lunes-domingo que ya funcionaba.
   *
   * Para mostrar la agenda como el calendario
   * mensual, agregamos el domingo anterior
   * y mostramos hasta sábado.
   */

  const sunday =
    new Date(weekDays[0]);

  sunday.setDate(
    sunday.getDate() - 1
  );


  return [
    sunday,
    ...weekDays.slice(0, 6)
  ];
}

 getWeekTimeRows(): string[] {

  const displayedDays =
    this.getDisplayedWeekDays();


  const displayedDates =
    new Set(
      displayedDays.map(
        (day) =>
          this.formatDate(day)
      )
    );


  const rows =
    new Set<string>();


  /*
   * Agregar únicamente horas que realmente
   * contienen disponibilidades.
   */
  for (
    const availability of
    this.availabilities
  ) {

    if (
      !displayedDates.has(
        availability.date
      )
    ) {
      continue;
    }


    if (
      availability.status !==
      'Disponible'
    ) {
      continue;
    }


    const startMinutes =
      this.timeToMinutes(
        availability.startTime
      );


    const hour =
      Math.floor(
        startMinutes / 60
      );


    rows.add(
      `${String(hour).padStart(
        2,
        '0'
      )}:00`
    );

  }


  /*
   * Agregar también la fila donde existe
   * descanso habitual, pero únicamente si
   * corresponde a una fecha válida.
   */
  for (
    const day of displayedDays
  ) {

    if (
      !this.doesHabitualBreakApplyToDay(
        day
      )
    ) {
      continue;
    }


    const breakStart =
      this.timeToMinutes(
        this.getHabitualBreakStartTime()
      );


    const hour =
      Math.floor(
        breakStart / 60
      );


    rows.add(
      `${String(hour).padStart(
        2,
        '0'
      )}:00`
    );

  }


  return Array
    .from(rows)
    .sort(
      (first, second) =>
        this.timeToMinutes(first) -
        this.timeToMinutes(second)
    );

}
getWeekBlockTopPercent(
  startTime: string
): number {

  const startMinutes =
    this.timeToMinutes(
      startTime
    );

  const minutesInsideHour =
    startMinutes % 60;

  return (
    minutesInsideHour / 60
  ) * 100;

}


getWeekBlockHeightPercent(
  startTime: string,
  endTime: string
): number {

  const startMinutes =
    this.timeToMinutes(
      startTime
    );

  const endMinutes =
    this.timeToMinutes(
      endTime
    );

  const duration =
    Math.max(
      1,
      endMinutes - startMinutes
    );

  return (
    duration / 60
  ) * 100;

}

getAvailableSlotsForHour(
  date: Date,
  hour: string
): Availability[] {

  if (
    this.statusFilter !== 'all' &&
    this.statusFilter !== 'Disponible'
  ) {
    return [];
  }


  const dateString =
    this.formatDate(date);

  const hourStart =
    this.timeToMinutes(hour);

  const hourEnd =
    hourStart + 60;


  return this.availabilities
    .filter(
      (availability) => {

        if (
          availability.date !==
          dateString
        ) {
          return false;
        }


        if (
          availability.status !==
          'Disponible'
        ) {
          return false;
        }


        const availabilityStart =
          this.timeToMinutes(
            availability.startTime
          );


        return (
          availabilityStart >=
            hourStart &&
          availabilityStart <
            hourEnd
        );
      }
    )
    .sort(
      (first, second) =>
        this.timeToMinutes(
          first.startTime
        ) -
        this.timeToMinutes(
          second.startTime
        )
    );
}





formatAvailabilityTime(
  time: string
): string {

  return time.substring(
    0,
    5
  );
}

getAvailabilityTimeRange(
  availability: Availability
): string {

  return (
    this.formatAvailabilityTime(
      availability.startTime
    )
    +
    ' - '
    +
    this.formatAvailabilityTime(
      availability.endTime
    )
  );
}

selectAvailableSlot(
  availability: Availability
): void {

  this.selectedAvailabilityId =
    availability.id;

  this.selectedSlotDate =
    availability.date;

  this.selectedSlot =
    this.getAvailabilityTimeRange(
      availability
    );
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

  getAvailableCountForDate(
  date: Date
): number {

  if (
    this.statusFilter !== 'all' &&
    this.statusFilter !== 'Disponible'
  ) {
    return 0;
  }

  const dateString =
    this.formatDate(date);

  return this.availabilities.filter(
    (availability) =>
      availability.date === dateString &&
      availability.status === 'Disponible'
  ).length;
}

  getAvailableSlots(): Availability[] {
    return this.availabilities.filter(
      availability => availability.status === 'Disponible'
    );
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
      const slotStart =
        this.formatTime12Hour(currentMinutes);

      const slotEnd =
        this.formatTime12Hour(
          currentMinutes + availability.duration
        );

      slots.push(
        `${slotStart} - ${slotEnd}`
      );

      currentMinutes +=
        availability.duration +
        availability.breakTime;
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] =
      time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return (
      `${hours.toString().padStart(2, '0')}:` +
      `${remainingMinutes.toString().padStart(2, '0')}`
    );
  }

  formatTime12Hour(minutes: number): string {
    const hours24 = Math.floor(minutes / 60);
    const minutesPart = minutes % 60;

    const period =
      hours24 >= 12 ? 'PM' : 'AM';

    let hours12 = hours24 % 12;

    if (hours12 === 0) {
      hours12 = 12;
    }

    return (
      `${String(hours12).padStart(2, '0')}:` +
      `${String(minutesPart).padStart(2, '0')} ` +
      period
    );
  }

  formatTimeString(time: string): string {
    const [hours, minutes] =
      time.split(':').map(Number);

    const totalMinutes =
      hours * 60 + minutes;

    return this.formatTime12Hour(totalMinutes);
  }

  /* ============================================================
   DESCANSO HABITUAL
   ============================================================ */

  shouldShowHabitualBreakForCurrentDay(): boolean {

  return this.doesHabitualBreakApplyToDay(
    this.getCurrentViewDate()
  );
  }


 getDayTimelineItems(
  date: Date
): Array<
  | {
      type: 'availability';
      startTime: string;
      availability: Availability;
    }
  | {
      type: 'habitualBreak';
      startTime: string;
    }
> {

  const items: Array<
    | {
        type: 'availability';
        startTime: string;
        availability: Availability;
      }
    | {
        type: 'habitualBreak';
        startTime: string;
      }
  > = [];


  /*
   * Agregar todas las disponibilidades
   * correspondientes al día.
   */
  for (
    const availability of
    this.getAvailabilitiesForDate(date)
  ) {

    items.push({
      type: 'availability',
      startTime: availability.startTime,
      availability
    });
  }


  /*
   * Agregar el descanso habitual solamente
   * si corresponde a esta fecha.
   */
  if (
      this.doesHabitualBreakApplyToDay(date)
  ) {

    items.push({
      type: 'habitualBreak',
      startTime:
        this.getHabitualBreakStartTime()
    });
  }


  /*
   * Ordenar todo cronológicamente.
   */
  items.sort(
    (first, second) => {

      const timeDifference =
        this.timeToMinutes(
          first.startTime
        ) -
        this.timeToMinutes(
          second.startTime
        );


      if (timeDifference !== 0) {
        return timeDifference;
      }


      /*
       * Si dos elementos comienzan exactamente
       * a la misma hora, el descanso aparece primero.
       */
      if (
        first.type === 'habitualBreak' &&
        second.type !== 'habitualBreak'
      ) {
        return -1;
      }

      if (
        second.type === 'habitualBreak' &&
        first.type !== 'habitualBreak'
      ) {
        return 1;
      }


      return 0;
    }
  );


  return items;
}

  hasHabitualBreak(): boolean {
    const breakConfig = this.regularSchedule?.break;

    return Boolean(
      breakConfig?.enabled &&
      breakConfig.startTime &&
      breakConfig.endTime
    );
  }

isRegularWorkDay(date: Date): boolean {
  if (!this.regularSchedule) {
    return false;
  }

  const javascriptDay = date.getDay();

  const dayOfWeek =
    javascriptDay === 0
      ? 7
      : javascriptDay;

  return this.regularSchedule.workDays.some(
    (day) => day.dayOfWeek === dayOfWeek
  );
}
 doesHabitualBreakApplyToDay(
  date: Date
): boolean {

  

  if (
    !this.hasHabitualBreak() ||
    !this.regularSchedule ||
    !this.isInsideAvailabilityRange(date)
    ) {
      return false;
      }


  const javascriptDay =
    date.getDay();


  const dayOfWeek =
    javascriptDay === 0
      ? 7
      : javascriptDay;


  const workDay =
    this.regularSchedule.workDays.find(
      (day) =>
        day.dayOfWeek === dayOfWeek
    );


  if (!workDay) {
    return false;
  }


  const breakStart =
    this.getHabitualBreakStartTime();

  const breakEnd =
    this.getHabitualBreakEndTime();


  const workStart =
    workDay.startTime.slice(0, 5);

  const workEnd =
    workDay.endTime.slice(0, 5);


  return (
    breakStart >= workStart &&
    breakEnd <= workEnd
  );
}

private getAvailabilityRangeStartDate():
  Date | null {

  if (
    !this.regularSchedule?.updatedAt
  ) {
    return null;
  }


  const updatedAt =
    new Date(
      this.regularSchedule.updatedAt
    );


  if (
    Number.isNaN(
      updatedAt.getTime()
    )
  ) {
    return null;
  }


  /*
   * El backend genera el horario usando
   * America/Merida, por lo que recuperamos
   * la fecha del último guardado usando
   * la misma zona horaria.
   */
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: 'America/Merida',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(
      updatedAt
    );


  const year =
    Number(
      parts.find(
        part =>
          part.type === 'year'
      )?.value
    );


  const month =
    Number(
      parts.find(
        part =>
          part.type === 'month'
      )?.value
    );


  const day =
    Number(
      parts.find(
        part =>
          part.type === 'day'
      )?.value
    );


  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }


  return new Date(
    year,
    month - 1,
    day
  );

}


private getAvailabilityRangeEndDate():
  Date | null {

  if (
    !this.regularSchedule
  ) {
    return null;
  }


  const startDate =
    this.getAvailabilityRangeStartDate();


  if (!startDate) {
    return null;
  }


  const value =
    this.regularSchedule
      .availabilityRangeValue;


  const unit =
    this.regularSchedule
      .availabilityRangeUnit;


  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }


  if (unit === 'days') {

    const endDate =
      new Date(startDate);


    endDate.setDate(
      endDate.getDate() +
      value - 1
    );


    return endDate;

  }


  if (unit === 'weeks') {

    const endDate =
      new Date(startDate);


    endDate.setDate(
      endDate.getDate() +
      (value * 7) - 1
    );


    return endDate;

  }


  if (unit === 'months') {

    const sourceDay =
      startDate.getDate();


    const endDate =
      new Date(
        startDate.getFullYear(),
        startDate.getMonth() + value,
        1
      );


    const lastDay =
      new Date(
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        0
      ).getDate();


    endDate.setDate(
      Math.min(
        sourceDay,
        lastDay
      )
    );


    return endDate;

  }


  return null;

}


private isInsideAvailabilityRange(
  date: Date
): boolean {

  const startDate =
    this.getAvailabilityRangeStartDate();


  const endDate =
    this.getAvailabilityRangeEndDate();


  if (
    !startDate ||
    !endDate
  ) {
    return false;
  }


  const targetDate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  return (
    targetDate >= startDate &&
    targetDate <= endDate
  );

}

  isHabitualBreakSegmentStart(
  date: Date
): boolean {

  if (
  !this.doesHabitualBreakApplyToDay(date)
) {
  return false;
}

  const days =
    this.getDisplayedWeekDays();

  const index =
    days.findIndex(
      (day) =>
        this.formatDate(day) ===
        this.formatDate(date)
    );

  if (index <= 0) {
    return true;
  }

  return !this.doesHabitualBreakApplyToDay(
  days[index - 1]
);
}


isHabitualBreakSegmentEnd(
  date: Date
): boolean {

  if (
    !this.doesHabitualBreakApplyToDay(date)
  ) {
    return false;
  }

  const days =
    this.getDisplayedWeekDays();

  const index =
    days.findIndex(
      (day) =>
        this.formatDate(day) ===
        this.formatDate(date)
    );

  if (
    index === -1 ||
    index === days.length - 1
  ) {
    return true;
  }

  return !this.doesHabitualBreakApplyToDay(
    days[index + 1]
  );
}


   /* getHabitualBreakSegments():
  { gridColumn: string }[] {

  const days =
    this.getDisplayedWeekDays();

  const segments:
    { gridColumn: string }[] = [];

  let startIndex: number | null = null;

  days.forEach((day, index) => {

    const isWorkDay =
      this.isRegularWorkDay(day);

    if (
      isWorkDay &&
      startIndex === null
    ) {
      startIndex = index;
    }

    const isLastDay =
      index === days.length - 1;

    if (
      startIndex !== null &&
      (!isWorkDay || isLastDay)
    ) {

      const endIndex =
        isWorkDay && isLastDay
          ? index
          : index - 1;

      segments.push({
        gridColumn:
          `${startIndex + 1} / ${endIndex + 2}`
      });

      startIndex = null;
    }

  });

  return segments;
}*/

  getHabitualBreakStartTime(): string {
    return (
      this.regularSchedule?.break.startTime?.slice(0, 5) ??
      ''
    );
  }


  getHabitualBreakEndTime(): string {
    return (
      this.regularSchedule?.break.endTime?.slice(0, 5) ??
      ''
    );
  }


  getHabitualBreakRange(): string {
    if (!this.hasHabitualBreak()) {
      return '';
    }

    return (
      `${this.getHabitualBreakStartTime()} - ` +
      `${this.getHabitualBreakEndTime()}`
    );
  }


  getHabitualBreakDuration(): number {
    if (!this.hasHabitualBreak()) {
      return 0;
    }

    const start =
      this.timeToMinutes(
        this.getHabitualBreakStartTime()
      );

    const end =
      this.timeToMinutes(
        this.getHabitualBreakEndTime()
      );

    return Math.max(0, end - start);
  }


  isHabitualBreakRow(time: string): boolean {
  if (!this.hasHabitualBreak()) {
    return false;
  }

  const breakStart =
    this.timeToMinutes(
      this.getHabitualBreakStartTime()
    );

  const rowStart =
    this.timeToMinutes(time);

  const rowEnd =
    rowStart + 60;

  return (
    breakStart >= rowStart &&
    breakStart < rowEnd
  );
}

    private notifyCalendarDataChanged(): void {

      this.calendarRenderVersion.update(
        version => version + 1
      );
    }

  loadAvailabilities(): void {

  this.calendarService
    .getAvailabilities()
    .subscribe({

      next: (data) => {

        this.availabilities =
          data;

        this.notifyCalendarDataChanged();
      },

      error: (error) => {

        console.error(
          'Error loading availabilities:',
          error
        );
      }

    });
}

   loadRegularSchedule(): void {

  this.regularScheduleService
    .getRegularSchedule()
    .subscribe({

      next: (schedule) => {

        this.regularSchedule =
          schedule;

        this.notifyCalendarDataChanged();
      },

      error: (error) => {

        console.error(
          'Error loading regular schedule:',
          error
        );
      }

    });
}
refreshCalendarData(): void {

  forkJoin({

    availabilities:
      this.calendarService
        .getAvailabilities(),

    schedule:
      this.regularScheduleService
        .getRegularSchedule()

  })
  .subscribe({

    next: ({
      availabilities,
      schedule
    }) => {

      this.availabilities =
        availabilities;

      this.regularSchedule =
        schedule;

      this.notifyCalendarDataChanged();
    },

    error: (error) => {

      console.error(
        'Error al actualizar los datos del calendario:',
        error
      );
    }

  });
}
  handleScheduleUpdated(
  _config: RegularScheduleConfig
): void {

  this.refreshCalendarData();
}

  constructor(
  private calendarService:
    CalendarService,

  private regularScheduleService:
    RegularScheduleService,

  private changeDetectorRef:
    ChangeDetectorRef,

  @Inject(PLATFORM_ID)
  platformId: object
) {

  this.isBrowser =
    isPlatformBrowser(platformId);


  afterNextRender(() => {

    if (!this.isBrowser) {
      return;
    }

    this.refreshCalendarData();
  });
}

  formatDate(date: Date): string {
    const year = date.getFullYear();

    const month =
      String(date.getMonth() + 1).padStart(2, '0');

    const day =
      String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}