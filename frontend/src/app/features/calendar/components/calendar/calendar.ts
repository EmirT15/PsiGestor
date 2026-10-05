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

import type {
  StatusFilter
} from '../../../../shared/components/status-filter/status-filter';

import {
  Availability
} from '../../models/availability.model';

import {
  CalendarService
} from '../../services/calendar.service';

import type {
  RegularScheduleResponse
} from '../../services/regular-schedule.service';

import {
  RegularScheduleService
} from '../../services/regular-schedule.service';

import {
  AppointmentDetails
} from '../appointment-details/appointment-details';

import {
  AvailabilityCard
} from '../availability-card/availability-card';

import {
  CalendarToolbar
} from '../calendar-toolbar/calendar-toolbar';

import {
  CancelModal,
  CancelModalData
} from '../cancel-modal/cancel-modal';

import {
  ManageScheduleModal
} from '../manage-schedule-modal/manage-schedule-modal';

import type {
  RegularScheduleConfig
} from '../regular-schedule/regular-schedule';

import {
  RescheduleDetails
} from '../reschedule-details/reschedule-details';

import {
  RescheduleData,
  RescheduleModal
} from '../reschedule-modal/reschedule-modal';


@Component({
  selector: 'app-calendar',
  standalone: true,

  imports: [
    AvailabilityCard,
    AppointmentDetails,
    RescheduleDetails,
    RescheduleModal,
    CancelModal,
    CalendarToolbar,
    ManageScheduleModal
  ],

  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar {

  private isBrowser: boolean;


  /*
   * Fuerza la actualización visual del calendario
   * cuando llegan datos asíncronos.
   */
  readonly calendarRenderVersion =
    signal(0);


  /*
   * Disponibilidades / citas.
   */
  availabilities: Availability[] = [];


  /*
   * Horarios inhabilitados de HU-02B.
   */
  disabledSchedules: any[] = [];


  /*
   * Configuración del horario habitual HU-02A.
   */
  regularSchedule:
    RegularScheduleResponse | null = null;


  currentDate = new Date();

  currentView:
    'day'
    | 'week'
    | 'month' = 'week';

  statusFilter:
    StatusFilter = 'all';


  selectedDate = '';
  selectedSlot = '';
  selectedSlotDate = '';

  selectedAvailabilityId:
    number | null = null;

  selectedAvailabilityStatus = '';


  /*
   * Estados de ventanas y paneles.
   */
  isSidebarOpen = false;

  isRescheduleModalOpen = false;

  isCancelModalOpen = false;

  isManageScheduleOpen = false;


  /*
   * Datos precargados cuando se abre
   * "Inhabilitar horario" desde agenda.
   */
  initialModalData: any = null;


  /*
   * HU-03.
   */
  selectedAppointmentData: any = null;

  selectedRescheduleDetails: any = null;


  rescheduleData:
    RescheduleData = {

      studentName: '',
      studentInfo: '',
      modality: '',
      currentDate: '',
      currentTime: ''
    };


  cancelData:
    CancelModalData = {

      folio: '',
      dateStr: '',
      timeStr: '',
      originalReason: ''
    };


  /*
   * Filas predeterminadas para vista Semana.
   */
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


  /* ============================================================
     VISTA MES
     ============================================================ */


  getDaysInMonth(): Date[] {

    const year =
      this.currentDate.getFullYear();

    const month =
      this.currentDate.getMonth();

    const days: Date[] = [];


    const totalDays =
      new Date(
        year,
        month + 1,
        0
      ).getDate();


    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {

      days.push(
        new Date(
          year,
          month,
          day
        )
      );
    }


    return days;
  }


  getFirstDayOfMonth(): number {

    const year =
      this.currentDate.getFullYear();

    const month =
      this.currentDate.getMonth();


    return new Date(
      year,
      month,
      1
    ).getDay();
  }


  /* ============================================================
     NAVEGACIÓN
     ============================================================ */


  changeMonth(
    offset: number
  ): void {

    const newDate =
      new Date(
        this.currentDate
      );


    if (
      this.currentView === 'day'
    ) {

      newDate.setDate(
        newDate.getDate()
        + offset
      );

    } else if (
      this.currentView === 'week'
    ) {

      newDate.setDate(
        newDate.getDate()
        + (offset * 7)
      );

    } else {

      newDate.setMonth(
        newDate.getMonth()
        + offset
      );

      newDate.setDate(1);
    }


    this.currentDate =
      newDate;

    this.selectedDate = '';

    this.selectedSlot = '';
  }


  goToToday(): void {

    const today =
      new Date();


    this.currentDate =
      today;

    this.selectedDate =
      this.formatDate(today);

    this.selectedSlot = '';
  }


  /* ============================================================
     MODAL GESTIONAR HORARIO
     ============================================================ */


  openManageSchedule(): void {

    /*
     * Apertura general:
     * no precargar inhabilitación.
     */
    this.initialModalData = null;

    this.isManageScheduleOpen =
      true;
  }


  closeManageSchedule(): void {

    this.isManageScheduleOpen =
      false;

    this.initialModalData =
      null;


    /*
     * Actualizar las tres fuentes después
     * de cerrar el modal:
     *
     * - disponibilidades
     * - horario habitual
     * - inhabilitaciones
     */
    this.refreshCalendarData();
  }


  /*
   * Inhabilitación rápida desde
   * una disponibilidad concreta.
   */
  handleDisableFromCard(
    availability: Availability
  ): void {

    const dateStr =
      availability.date ||
      this.formatDate(
        this.getCurrentViewDate()
      );


    this.initialModalData = {

      startDate:
        dateStr,

      endDate:
        dateStr,

      startTime:
        availability.startTime,

      endTime:
        availability.endTime,

      activeTab:
        'disabled'
    };


    this.isManageScheduleOpen =
      true;
  }


  /*
   * Inhabilitación rápida del bloque
   * actualmente seleccionado.
   */
  handleDisableSelectedSlot(): void {

    if (
      !this.selectedSlot ||
      !this.selectedSlotDate
    ) {
      return;
    }


    /*
     * Primero intentar localizar
     * la disponibilidad real.
     */
    const availability =
      this.availabilities.find(
        (item) =>
          item.id ===
          this.selectedAvailabilityId
      );


    if (availability) {

      this.handleDisableFromCard(
        availability
      );

      return;
    }


    /*
     * Si no existe disponibilidad identificable,
     * recuperar el rango mostrado.
     */
    const parts =
      this.selectedSlot.split(
        ' - '
      );


    const normalizeTime = (
      value: string
    ): string => {

      const cleanValue =
        value.trim();


      if (
        cleanValue.includes('AM') ||
        cleanValue.includes('PM')
      ) {

        return this.convert12to24(
          cleanValue
        );
      }


      return (
        `${cleanValue.slice(0, 5)}:00`
      );
    };


    const startTime =
      parts[0]
        ? normalizeTime(
            parts[0]
          )
        : '08:00:00';


    const endTime =
      parts[1]
        ? normalizeTime(
            parts[1]
          )
        : '09:00:00';


    this.initialModalData = {

      startDate:
        this.selectedSlotDate,

      endDate:
        this.selectedSlotDate,

      startTime,

      endTime,

      activeTab:
        'disabled'
    };


    this.isManageScheduleOpen =
      true;
  }


  /*
   * Inhabilitación rápida desde
   * una celda de la vista Semana.
   */
  handleDisableFromWeekCell(
    date: Date,
    timeRow: string
  ): void {

    /*
     * Si existe una disponibilidad concreta
     * en esa hora, utilizar su rango real.
     */
    const availability =
      this.getAvailableSlotsForHour(
        date,
        timeRow
      )[0];


    if (availability) {

      this.handleDisableFromCard(
        availability
      );

      return;
    }


    /*
     * Si no hay disponibilidad concreta,
     * precargar una hora completa.
     */
    const dateStr =
      this.formatDate(date);

    const startMinutes =
      this.timeToMinutes(
        timeRow
      );

    const endMinutes =
      startMinutes + 60;


    this.initialModalData = {

      startDate:
        dateStr,

      endDate:
        dateStr,

      startTime:
        `${this.minutesToTime(
          startMinutes
        )}:00`,

      endTime:
        `${this.minutesToTime(
          endMinutes
        )}:00`,

      activeTab:
        'disabled'
    };


    this.isManageScheduleOpen =
      true;
  }


  /* ============================================================
     INFORMACIÓN GENERAL
     ============================================================ */


  getMonthName(): string {

    return this.currentDate
      .toLocaleDateString(
        'es-MX',
        {
          month: 'long',
          year: 'numeric'
        }
      );
  }


  /* ============================================================
     DISPONIBILIDADES
     ============================================================ */


  getAvailabilitiesForDate(
    date: Date
  ): Availability[] {

    const dateString =
      this.formatDate(date);


    return this.availabilities
      .filter(
        (availability) => {

          const sameDate =
            availability.date ===
            dateString;


          const sameStatus =
            this.statusFilter ===
              'all'
            ||
            availability.status ===
              this.statusFilter;


          return (
            sameDate &&
            sameStatus
          );
        }
      );
  }


  selectDate(
    date: Date
  ): void {

    this.selectedDate =
      this.formatDate(date);

    this.selectedSlot = '';

    this.changeDetectorRef
      .detectChanges();
  }


  /*
   * Selección proveniente de
   * AvailabilityCard.
   */
  selectSlot(
    slot: string,
    availability: Availability
  ): void {

    this.selectedSlot =
      slot;

    this.selectedSlotDate =
      availability.date;

    this.selectedAvailabilityId =
      availability.id;

    this.selectedAvailabilityStatus =
      availability.status;


    /*
     * Datos del modal Cancelar.
     */
    this.cancelData = {

      folio:
        availability.folio ||
        'PSI-2026-0000',

      dateStr:
        availability.date,

      timeStr:
        `${availability.startTime} - ` +
        `${availability.endTime} ` +
        `(${availability.duration} min)`,

      originalReason:
        availability.consultationReason ||
        'Consulta general'
    };


    /*
     * Datos del modal Reprogramar.
     */
    this.rescheduleData = {

      studentName:
        availability.studentName ||
        'Alumno',

      studentInfo:
        `${availability.studentAge || 0} años • ` +
        `${availability.studentSemester || ''} - ` +
        `${availability.studentProgram || ''}`,

      modality:
        `${availability.modality || 'Presencial'} ` +
        `(${availability.location || ''})`,

      currentDate:
        availability.date,

      currentTime:
        `${availability.startTime} - ` +
        `${availability.endTime}`
    };


    /*
     * Datos del sidebar de cita.
     */
    this.selectedAppointmentData = {

      id:
        availability.id,

      status:
        availability.status,

      studentName:
        availability.studentName ||
        'Alumno',

      studentAge:
        availability.studentAge ||
        0,

      studentSemester:
        availability.studentSemester ||
        '',

      studentProgram:
        availability.studentProgram ||
        '',

      dateStr:
        availability.date +
        ', ' +
        availability.startTime +
        ' - ' +
        availability.endTime,

      sessionType:
        'Sesión individual',

      duration:
        availability.duration ||
        45,

      modality:
        availability.modality ||
        'Presencial',

      location:
        availability.location ||
        'Cubículo',

      locationDetail:
        'Consultorio psicopedagógico',

      reason:
        availability.consultationReason ||
        '',

      derivedBy:
        'Asignación directa',

      sessionCount:
        '1ra Sesión'
    };


    /*
     * Datos para detalle de
     * reprogramación.
     */
    this.selectedRescheduleDetails = {

      id:
        availability.id,

      studentName:
        availability.studentName ||
        'Alumno',

      studentInitials:
        availability.studentInitials ||
        'AL',

      studentAge:
        availability.studentAge ||
        0,

      studentSemester:
        availability.studentSemester ||
        '',

      studentProgram:
        availability.studentProgram ||
        '',

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

      proposedDateStr:
        availability.proposedDate
          ? `${availability.proposedDate}, ` +
            `${availability.proposedStartTime} - ` +
            `${availability.proposedEndTime}`
          : 'Propuesta pendiente',

      proposedDetails:
        `${availability.modality || 'Presencial'} • ` +
        `${availability.location || ''} • ` +
        `${availability.duration} min`,

      sentAtStr:
        'Recientemente',

      reason:
        availability.consultationReason ||
        ''
    };


    this.isSidebarOpen =
      true;
  }


  /*
   * Selección visual de un bloque Disponible
   * en Día/Semana.
   */
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


  /* ============================================================
     SIDEBAR HU-03
     ============================================================ */


  closeSidebar(): void {

    this.isSidebarOpen =
      false;
  }


  openRescheduleModal(): void {

    this.isRescheduleModalOpen =
      true;
  }


  closeRescheduleModal(): void {

    this.isRescheduleModalOpen =
      false;
  }


  onRescheduleConfirm(
    data: any
  ): void {

    if (
      this.selectedAvailabilityId ===
      null
    ) {
      return;
    }


    this.calendarService
      .rescheduleAppointment(

        this.selectedAvailabilityId,

        data.date,

        data.startTime,

        data.endTime
      )
      .subscribe({

        next: () => {

          this.closeRescheduleModal();

          this.closeSidebar();

          this.loadAvailabilities();
        },

        error: (error) => {

          console.error(
            'Error al reprogramar:',
            error
          );
        }

      });
  }


  openCancelModal(): void {

    this.isCancelModalOpen =
      true;
  }


  closeCancelModal(): void {

    this.isCancelModalOpen =
      false;
  }


  onCancelConfirm(
    data: any
  ): void {

    if (
      this.selectedAvailabilityId ===
      null
    ) {
      return;
    }


    this.calendarService
      .cancelAppointment(

        this.selectedAvailabilityId,

        data.reason,

        data.observation
      )
      .subscribe({

        next: () => {

          this.closeCancelModal();

          this.closeSidebar();

          this.loadAvailabilities();
        },

        error: (error) => {

          console.error(
            'Error al cancelar:',
            error
          );
        }

      });
  }


  /* ============================================================
     FECHA ACTUAL / SELECCIONADA
     ============================================================ */


  getSelectedDate(): Date {

    return new Date(
      this.selectedDate +
      'T00:00:00'
    );
  }


  getCurrentViewDate(): Date {

    if (this.selectedDate) {

      return this.getSelectedDate();
    }


    return this.currentDate;
  }


  /* ============================================================
     VISTA SEMANA
     ============================================================ */


  /*
   * Lógica interna lunes-domingo.
   */
  getWeekDays(): Date[] {

    const date =
      this.getCurrentViewDate();

    const dayOfWeek =
      date.getDay();

    const startOfWeek =
      new Date(date);


    if (
      dayOfWeek === 0
    ) {

      /*
       * Si la referencia es domingo,
       * comenzar el lunes siguiente.
       */
      startOfWeek.setDate(
        date.getDate() + 1
      );

    } else {

      /*
       * Obtener lunes de la semana.
       */
      const daysFromMonday =
        dayOfWeek - 1;

      startOfWeek.setDate(
        date.getDate() -
        daysFromMonday
      );
    }


    const days: Date[] = [];


    for (
      let index = 0;
      index < 7;
      index++
    ) {

      const day =
        new Date(
          startOfWeek
        );


      day.setDate(
        startOfWeek.getDate() +
        index
      );


      days.push(day);
    }


    return days;
  }


  /*
   * Visualmente mostrar
   * domingo-sábado.
   */
  getDisplayedWeekDays(): Date[] {

    const weekDays =
      this.getWeekDays();


    const sunday =
      new Date(
        weekDays[0]
      );


    sunday.setDate(
      sunday.getDate() - 1
    );


    return [
      sunday,
      ...weekDays.slice(0, 6)
    ];
  }


  /*
   * Generar filas horarias a partir
   * de las disponibilidades existentes.
   */
  getWeekTimeRows(): string[] {

    const displayedDates =
      new Set(
        this.getDisplayedWeekDays()
          .map(
            (day) =>
              this.formatDate(day)
          )
      );


    const weekAvailabilities =
      this.availabilities.filter(
        (availability) =>

          displayedDates.has(
            availability.date
          )

          &&

          availability.status ===
            'Disponible'
      );


    if (
      weekAvailabilities.length ===
      0
    ) {

      return this.visualTimeRows;
    }


    const startHours =
      weekAvailabilities.map(
        (availability) =>

          Math.floor(

            this.timeToMinutes(
              availability.startTime
            ) / 60

          )
      );


    const firstHour =
      Math.min(
        ...startHours
      );

    const lastHour =
      Math.max(
        ...startHours
      );


    const rows: string[] = [];


    for (
      let hour = firstHour;
      hour <= lastHour;
      hour++
    ) {

      rows.push(
        `${hour
          .toString()
          .padStart(
            2,
            '0'
          )}:00`
      );
    }


    return rows;
  }


  getAvailableSlotsForHour(
    date: Date,
    hour: string
  ): Availability[] {

    if (
      this.statusFilter !==
        'all'
      &&
      this.statusFilter !==
        'Disponible'
    ) {

      return [];
    }


    const dateString =
      this.formatDate(date);

    const hourStart =
      this.timeToMinutes(
        hour
      );

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
              hourStart
            &&
            availabilityStart <
              hourEnd
          );
        }
      )
      .sort(
        (first, second) =>

          this.timeToMinutes(
            first.startTime
          )

          -

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


  isToday(
    date: Date
  ): boolean {

    const today =
      new Date();


    return (

      date.getDate() ===
        today.getDate()

      &&

      date.getMonth() ===
        today.getMonth()

      &&

      date.getFullYear() ===
        today.getFullYear()
    );
  }


  getWeekdayLabel(
    date: Date
  ): string {

    const weekdays = [
      'DOM',
      'LUN',
      'MAR',
      'MIÉ',
      'JUE',
      'VIE',
      'SÁB'
    ];


    return weekdays[
      date.getDay()
    ];
  }


  /* ============================================================
     INFORMACIÓN DE DISPONIBILIDAD
     ============================================================ */


  hasAvailability(
    date: Date
  ): boolean {

    return (
      this.getAvailabilitiesForDate(
        date
      ).length > 0
    );
  }


  getAvailableCountForDate(
    date: Date
  ): number {

    if (
      this.statusFilter !==
        'all'
      &&
      this.statusFilter !==
        'Disponible'
    ) {

      return 0;
    }


    const dateString =
      this.formatDate(date);


    return this.availabilities
      .filter(
        (availability) =>

          availability.date ===
            dateString

          &&

          availability.status ===
            'Disponible'
      )
      .length;
  }


  getAvailableSlots():
    Availability[] {

    return this.availabilities
      .filter(
        (availability) =>
          availability.status ===
          'Disponible'
      );
  }


  isSelected(
    date: Date
  ): boolean {

    return (
      this.selectedDate ===
      this.formatDate(date)
    );
  }


  /* ============================================================
     GENERACIÓN LEGACY DE SLOTS
     ============================================================ */


  generateSlots(
    availability: Availability
  ): string[] {

    const slots: string[] = [];


    let currentMinutes =
      this.timeToMinutes(
        availability.startTime
      );


    const endMinutes =
      this.timeToMinutes(
        availability.endTime
      );


    while (

      currentMinutes +
      availability.duration <=
      endMinutes

    ) {

      const slotStart =
        this.formatTime12Hour(
          currentMinutes
        );


      const slotEnd =
        this.formatTime12Hour(

          currentMinutes +
          availability.duration

        );


      slots.push(
        `${slotStart} - ${slotEnd}`
      );


      currentMinutes +=

        availability.duration

        +

        availability.breakTime;
    }


    return slots;
  }


  private timeToMinutes(
    time: string
  ): number {

    const [
      hours,
      minutes
    ] =
      time
        .split(':')
        .map(Number);


    return (
      hours * 60 +
      minutes
    );
  }


  private minutesToTime(
    minutes: number
  ): string {

    const hours =
      Math.floor(
        minutes / 60
      );

    const remainingMinutes =
      minutes % 60;


    return (
      `${hours
        .toString()
        .padStart(2, '0')}:`
      +
      `${remainingMinutes
        .toString()
        .padStart(2, '0')}`
    );
  }


  formatTime12Hour(
    minutes: number
  ): string {

    const hours24 =
      Math.floor(
        minutes / 60
      );

    const minutesPart =
      minutes % 60;


    const period =
      hours24 >= 12
        ? 'PM'
        : 'AM';


    let hours12 =
      hours24 % 12;


    if (
      hours12 === 0
    ) {

      hours12 = 12;
    }


    return (
      `${String(hours12)
        .padStart(2, '0')}:`
      +
      `${String(minutesPart)
        .padStart(2, '0')} `
      +
      period
    );
  }


  private convert12to24(
    time12h: string
  ): string {

    const [
      time,
      modifier
    ] =
      time12h
        .trim()
        .split(' ');


    let [
      hours,
      minutes
    ] =
      time.split(':');


    let hour =
      parseInt(
        hours,
        10
      );


    if (
      hour === 12
    ) {

      hour = 0;
    }


    if (
      modifier === 'PM'
    ) {

      hour += 12;
    }


    return (
      `${String(hour)
        .padStart(2, '0')}:`
      +
      `${minutes}:00`
    );
  }


  formatTimeString(
    time: string
  ): string {

    const [
      hours,
      minutes
    ] =
      time
        .split(':')
        .map(Number);


    const totalMinutes =
      hours * 60 +
      minutes;


    return this.formatTime12Hour(
      totalMinutes
    );
  }


  /* ============================================================
     VISTA DÍA / DESCANSO HABITUAL
     ============================================================ */


  shouldShowHabitualBreakForCurrentDay():
    boolean {

    return this
      .doesHabitualBreakApplyToDay(
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
     * Agregar disponibilidades
     * correspondientes al día.
     */
    for (
      const availability of
        this.getAvailabilitiesForDate(
          date
        )
    ) {

      items.push({

        type:
          'availability',

        startTime:
          availability.startTime,

        availability
      });
    }


    /*
     * Agregar descanso habitual únicamente
     * cuando corresponde a esa jornada.
     */
    if (
      this.doesHabitualBreakApplyToDay(
        date
      )
    ) {

      items.push({

        type:
          'habitualBreak',

        startTime:
          this.getHabitualBreakStartTime()
      });
    }


    /*
     * Orden cronológico.
     */
    items.sort(
      (
        first,
        second
      ) => {

        const timeDifference =

          this.timeToMinutes(
            first.startTime
          )

          -

          this.timeToMinutes(
            second.startTime
          );


        if (
          timeDifference !== 0
        ) {

          return timeDifference;
        }


        /*
         * Si comienzan a la misma hora,
         * colocar primero el descanso.
         */
        if (
          first.type ===
            'habitualBreak'
          &&
          second.type !==
            'habitualBreak'
        ) {

          return -1;
        }


        if (
          second.type ===
            'habitualBreak'
          &&
          first.type !==
            'habitualBreak'
        ) {

          return 1;
        }


        return 0;
      }
    );


    return items;
  }


  /* ============================================================
     HU-02B - HORARIOS INHABILITADOS
     ============================================================ */


  getDisabledSchedulesForDate(
    date: Date
  ): any[] {

    /*
     * Respetar filtro de estado.
     */
    if (
      this.statusFilter !==
        'all'
      &&
      this.statusFilter !==
        'Inhabilitado'
    ) {

      return [];
    }


    const dateString =
      this.formatDate(date);


    return this.disabledSchedules
      .filter(
        (disabledSchedule) => {

          const startDate =
            disabledSchedule.startDate ||
            disabledSchedule.date;

          const endDate =
            disabledSchedule.endDate ||
            disabledSchedule.date;


          if (
            !startDate ||
            !endDate
          ) {

            return false;
          }


          return (
            dateString >=
              startDate
            &&
            dateString <=
              endDate
          );
        }
      );
  }


  hasDisabledSchedule(
    date: Date
  ): boolean {

    return (
      this.getDisabledSchedulesForDate(
        date
      ).length > 0
    );
  }


  /*
   * Comprueba traslape real entre
   * inhabilitación y fila horaria.
   */
  getDisabledForTimeCell(
    date: Date,
    timeRow: string
  ): any[] {

    const rowStart =
      this.timeToMinutes(
        timeRow
      );

    const rowEnd =
      rowStart + 60;


    return this
      .getDisabledSchedulesForDate(
        date
      )
      .filter(
        (disabledSchedule) => {

          if (
            !disabledSchedule.startTime ||
            !disabledSchedule.endTime
          ) {

            return false;
          }


          const disabledStart =
            this.timeToMinutes(
              disabledSchedule.startTime
            );

          const disabledEnd =
            this.timeToMinutes(
              disabledSchedule.endTime
            );


          return (
            disabledStart <
              rowEnd
            &&
            disabledEnd >
              rowStart
          );
        }
      );
  }


  /*
   * Se conserva para compatibilidad
   * con HU-02B.
   */
  getAvailabilitiesForTimeCell(
    date: Date,
    timeRow: string
  ): Availability[] {

    const rowStart =
      this.timeToMinutes(
        timeRow
      );

    const rowEnd =
      rowStart + 60;


    return this
      .getAvailabilitiesForDate(
        date
      )
      .filter(
        (availability) => {

          const availabilityStart =
            this.timeToMinutes(
              availability.startTime
            );

          const availabilityEnd =
            this.timeToMinutes(
              availability.endTime
            );


          return (
            availabilityStart <
              rowEnd
            &&
            availabilityEnd >
              rowStart
          );
        }
      );
  }


  /* ============================================================
     HORARIO HABITUAL HU-02A
     ============================================================ */


  hasHabitualBreak(): boolean {

    const breakConfig =
      this.regularSchedule?.break;


    return Boolean(

      breakConfig?.enabled

      &&

      breakConfig.startTime

      &&

      breakConfig.endTime
    );
  }


  isRegularWorkDay(
    date: Date
  ): boolean {

    if (
      !this.regularSchedule
    ) {

      return false;
    }


    const javascriptDay =
      date.getDay();


    const dayOfWeek =
      javascriptDay === 0
        ? 7
        : javascriptDay;


    return this
      .regularSchedule
      .workDays
      .some(
        (day) =>
          day.dayOfWeek ===
          dayOfWeek
      );
  }


  doesHabitualBreakApplyToDay(
    date: Date
  ): boolean {

    if (
      !this.hasHabitualBreak()
      ||
      !this.regularSchedule
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
      this.regularSchedule
        .workDays
        .find(
          (day) =>
            day.dayOfWeek ===
            dayOfWeek
        );


    if (
      !workDay
    ) {

      return false;
    }


    const breakStart =
      this.getHabitualBreakStartTime();

    const breakEnd =
      this.getHabitualBreakEndTime();


    const workStart =
      workDay.startTime
        .slice(0, 5);

    const workEnd =
      workDay.endTime
        .slice(0, 5);


    return (
      breakStart >=
        workStart
      &&
      breakEnd <=
        workEnd
    );
  }


  isHabitualBreakSegmentStart(
    date: Date
  ): boolean {

    if (
      !this.doesHabitualBreakApplyToDay(
        date
      )
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
      index <= 0
    ) {

      return true;
    }


    return (
      !this.doesHabitualBreakApplyToDay(
        days[index - 1]
      )
    );
  }


  isHabitualBreakSegmentEnd(
    date: Date
  ): boolean {

    if (
      !this.doesHabitualBreakApplyToDay(
        date
      )
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
      index === -1
      ||
      index ===
        days.length - 1
    ) {

      return true;
    }


    return (
      !this.doesHabitualBreakApplyToDay(
        days[index + 1]
      )
    );
  }


  getHabitualBreakStartTime():
    string {

    return (
      this.regularSchedule
        ?.break
        .startTime
        ?.slice(0, 5)
      ??
      ''
    );
  }


  getHabitualBreakEndTime():
    string {

    return (
      this.regularSchedule
        ?.break
        .endTime
        ?.slice(0, 5)
      ??
      ''
    );
  }


  getHabitualBreakRange():
    string {

    if (
      !this.hasHabitualBreak()
    ) {

      return '';
    }


    return (
      `${this.getHabitualBreakStartTime()} - `
      +
      `${this.getHabitualBreakEndTime()}`
    );
  }


  getHabitualBreakDuration():
    number {

    if (
      !this.hasHabitualBreak()
    ) {

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


    return Math.max(
      0,
      end - start
    );
  }


  isHabitualBreakRow(
    time: string
  ): boolean {

    if (
      !this.hasHabitualBreak()
    ) {

      return false;
    }


    const breakStart =
      this.timeToMinutes(
        this.getHabitualBreakStartTime()
      );


    const rowStart =
      this.timeToMinutes(
        time
      );

    const rowEnd =
      rowStart + 60;


    return (
      breakStart >=
        rowStart
      &&
      breakStart <
        rowEnd
    );
  }


  /* ============================================================
     SINCRONIZACIÓN / CARGA DE DATOS
     ============================================================ */


  private notifyCalendarDataChanged():
    void {

    this.calendarRenderVersion
      .update(
        (version) =>
          version + 1
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


  loadDisabledSchedules(): void {

    this.calendarService
      .getDisabledSchedules()
      .subscribe({

        next: (data) => {

          this.disabledSchedules =
            data;

          this.notifyCalendarDataChanged();
        },

        error: (error) => {

          console.error(
            'Error loading disabled schedules:',
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


  /*
   * Refresca de forma conjunta:
   *
   * HU-01/HU-03 -> availabilities
   * HU-02A -> regular schedule
   * HU-02B -> disabled schedules
   */
  refreshCalendarData(): void {

    forkJoin({

      availabilities:
        this.calendarService
          .getAvailabilities(),

      schedule:
        this.regularScheduleService
          .getRegularSchedule(),

      disabledSchedules:
        this.calendarService
          .getDisabledSchedules()

    })
      .subscribe({

        next: ({
          availabilities,
          schedule,
          disabledSchedules
        }) => {

          this.availabilities =
            availabilities;

          this.regularSchedule =
            schedule;

          this.disabledSchedules =
            disabledSchedules;


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


  /* ============================================================
     CONSTRUCTOR / HIDRATACIÓN
     ============================================================ */


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
      isPlatformBrowser(
        platformId
      );


    afterNextRender(
      () => {

        if (
          !this.isBrowser
        ) {

          return;
        }


        /*
         * Primera carga después
         * de la hidratación.
         */
        this.refreshCalendarData();


        /*
         * Cuando HU-02B modifica,
         * elimina o crea un horario
         * inhabilitado, refrescar agenda.
         */
        this.calendarService
          .scheduleChanged$
          .subscribe(
            () => {

              this.refreshCalendarData();

            }
          );

      }
    );
  }


  /* ============================================================
     UTILIDADES
     ============================================================ */


  formatDate(
    date: Date
  ): string {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        date.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return (
      `${year}-${month}-${day}`
    );
  }

}