import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  BreakSchedule,
  BreakScheduleConfig,
} from '../break-schedule/break-schedule';

export interface WorkDay {
  id: number;
  name: string;
  shortName: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}
export type AvailabilityRangeUnit =
  | 'days'
  | 'weeks'
  | 'months';
export interface RegularScheduleConfig {
  workDays: WorkDay[];

  appointmentDuration: number;

  appointmentGapMinutes: number;

  availabilityRangeValue: number;

  availabilityRangeUnit:
    AvailabilityRangeUnit;

  break: BreakScheduleConfig;
}

@Component({
  selector: 'app-regular-schedule',
 imports: [
  FormsModule,
  BreakSchedule,
],
  templateUrl: './regular-schedule.html',
  styleUrl: './regular-schedule.css',
})
export class RegularSchedule {

  @Input()
  set initialConfig(
    config: RegularScheduleConfig | null) {
      if (config) {
      this.applyInitialConfig(config);
      }
    }

  @Output()
  scheduleSaved = new EventEmitter<RegularScheduleConfig>();

  @Output()
  cancelRequested = new EventEmitter<void>(); 

  saveError = '';

  appointmentDuration: number | null = null;

  editingDayId: number | null = null;

  readonly durationOptions = [30, 45, 60];
  
  customDurationEnabled = false;

  readonly appointmentGapOptions = [0, 5, 10, 15];

  appointmentGapMinutes: number | null = 0;

  customAppointmentGapEnabled = false;

  availabilityRangeValue:
  number | null = null;

availabilityRangeUnit:
  AvailabilityRangeUnit = 'months';


readonly availabilityRangeLimits:
  Record<
    AvailabilityRangeUnit,
    number
  > = {

  days: 365,
  weeks: 52,
  months: 12
};


breakConfig: BreakScheduleConfig = {
  enabled: false,
  startTime: '',
  endTime: '',
};

updateBreakConfig(config: BreakScheduleConfig): void {
  this.breakConfig = config;
}

isDayTimeValid(day: WorkDay): boolean {
  if (!day.enabled) {
    return true;
  }

  if (!day.startTime || !day.endTime) {
    return false;
  }

  return day.startTime < day.endTime;
}
getDayError(day: WorkDay): string | null {
  if (!day.enabled) {
    return null;
  }

  if (!day.startTime || !day.endTime) {
    return 'Debes definir la hora de inicio y finalización.';
  }

  if (day.startTime >= day.endTime) {
    return 'La hora de inicio debe ser anterior a la hora de finalización.';
  }

  if (
  this.isAppointmentDurationValid() &&
  !this.doesDayHaveAppointmentCapacity(
    day
  )
) {

  return (
    `La jornada no tiene espacio suficiente ` +
    `para generar una cita de ` +
    `${this.appointmentDuration} minutos.`
  );
}

  return null;
}
isAppointmentDurationValid(): boolean {
  return (
    this.appointmentDuration !== null &&
    this.appointmentDuration > 0
  );
}
private timeToMinutes(
  time: string
): number {

  const [hours, minutes] =
    time.split(':').map(Number);

  return (
    hours * 60 +
    minutes
  );
}
selectDuration(duration: number): void {
  this.appointmentDuration = duration;
  this.customDurationEnabled = false;
}

enableCustomDuration(): void {
  this.customDurationEnabled = true;

  if (
    this.appointmentDuration !== null &&
    this.durationOptions.includes(this.appointmentDuration)
  ) {
    this.appointmentDuration = null;
  }
}

isDurationSelected(duration: number): boolean {
  return (
    !this.customDurationEnabled &&
    this.appointmentDuration === duration
  );
}

selectAppointmentGap(minutes: number): void {
  this.appointmentGapMinutes = minutes;
  this.customAppointmentGapEnabled = false;
}

enableCustomAppointmentGap(): void {
  this.customAppointmentGapEnabled = true;

  if (
    this.appointmentGapMinutes !== null &&
    this.appointmentGapOptions.includes(
      this.appointmentGapMinutes
    )
  ) {
    this.appointmentGapMinutes = null;
  }
}

isAppointmentGapSelected(minutes: number): boolean {
  return (
    !this.customAppointmentGapEnabled &&
    this.appointmentGapMinutes === minutes
  );
}

isAppointmentGapValid(): boolean {
  if (this.appointmentGapMinutes === null) {
    return false;
  }

  if (!Number.isFinite(this.appointmentGapMinutes)) {
    return false;
  }

  if (this.customAppointmentGapEnabled) {
    return this.appointmentGapMinutes > 0;
  }

  return this.appointmentGapMinutes >= 0;
}

isBreakTimeValid(): boolean {
  if (!this.breakConfig.enabled) {
    return true;
  }

  if (
    !this.breakConfig.startTime ||
    !this.breakConfig.endTime
  ) {
    return false;
  }

  return this.breakConfig.startTime < this.breakConfig.endTime;
}

doesBreakApplyToWorkDay(
  day: WorkDay
): boolean {

  

  if (
    !this.breakConfig.enabled ||
    !this.isBreakTimeValid() ||
    !day.enabled ||
    !this.isDayTimeValid(day)
  ) {
    return false;
  }

  return (
    this.breakConfig.startTime >=
      day.startTime &&
    this.breakConfig.endTime <=
      day.endTime
  );
}

doesDayHaveAppointmentCapacity(
  day: WorkDay
): boolean {

  if (!day.enabled) {
    return true;
  }


  if (!this.isDayTimeValid(day)) {
    return false;
  }


  /*
   * Si todavía no hay duración válida,
   * dejamos que la validación de duración
   * muestre su propio error.
   */
  if (
    !this.isAppointmentDurationValid()
  ) {
    return true;
  }


  /*
   * Si existe un cruce parcial con el
   * descanso, ese error se muestra por
   * separado.
   */
  if (
    this.doesBreakPartiallyOverlapWorkDay(
      day
    )
  ) {
    return true;
  }


  const appointmentDuration =
    this.appointmentDuration as number;


  const workStart =
    this.timeToMinutes(
      day.startTime
    );

  const workEnd =
    this.timeToMinutes(
      day.endTime
    );


  /*
   * Si el descanso habitual realmente
   * aplica en esta jornada, debe caber
   * al menos una cita antes o después.
   */
  if (
    this.doesBreakApplyToWorkDay(day)
  ) {

    const breakStart =
      this.timeToMinutes(
        this.breakConfig.startTime
      );

    const breakEnd =
      this.timeToMinutes(
        this.breakConfig.endTime
      );


    const fitsBeforeBreak =
      workStart +
      appointmentDuration
      <=
      breakStart;


    const fitsAfterBreak =
      breakEnd +
      appointmentDuration
      <=
      workEnd;


    return (
      fitsBeforeBreak ||
      fitsAfterBreak
    );
  }


  /*
   * Jornada sin descanso aplicable.
   */
  return (
    workStart +
    appointmentDuration
    <=
    workEnd
  );
}
getDaysWithoutAppointmentCapacity():
  WorkDay[] {

  return this.workDays.filter(
    (day) =>
      day.enabled &&
      !this.doesDayHaveAppointmentCapacity(
        day
      )
  );
}
doesBreakPartiallyOverlapWorkDay(
  day: WorkDay
): boolean {

  if (
    !this.breakConfig.enabled ||
    !this.isBreakTimeValid() ||
    !day.enabled ||
    !this.isDayTimeValid(day)
  ) {
    return false;
  }


  const overlaps =
    this.breakConfig.startTime <
      day.endTime &&
    this.breakConfig.endTime >
      day.startTime;


  const fullyInside =
    this.doesBreakApplyToWorkDay(day);


  return (
    overlaps &&
    !fullyInside
  );
}


getBreakConflictDays(): WorkDay[] {

  return this.workDays.filter(
    (day) =>
      this.doesBreakPartiallyOverlapWorkDay(
        day
      )
  );
}

getBreakError(): string | null {

  if (!this.breakConfig.enabled) {
    return null;
  }


  if (
    !this.breakConfig.startTime ||
    !this.breakConfig.endTime
  ) {

    return (
      'Debes definir el inicio y la ' +
      'finalización del descanso.'
    );
  }


  if (
    this.breakConfig.startTime >=
    this.breakConfig.endTime
  ) {

    return (
      'La hora inicial del descanso debe ' +
      'ser anterior a la hora final.'
    );
  }


  const conflictDays =
    this.getBreakConflictDays();


  if (conflictDays.length > 0) {

    const dayNames =
      conflictDays
        .map((day) => day.name)
        .join(', ');


    return (
      'El descanso se cruza parcialmente ' +
      `con: ${dayNames}. ` +
      'Debe quedar completamente dentro ' +
      'o fuera de cada jornada.'
    );
  }


  return null;
}

isAvailabilityRangeValid(): boolean {

  if (
    this.availabilityRangeValue === null
  ) {
    return false;
  }


  if (
    !Number.isInteger(
      this.availabilityRangeValue
    )
  ) {
    return false;
  }


  if (
    this.availabilityRangeValue <= 0
  ) {
    return false;
  }


  const maximum =
    this.availabilityRangeLimits[
      this.availabilityRangeUnit
    ];


  return (
    this.availabilityRangeValue <=
    maximum
  );

}

getAvailabilityRangeMax(): number {

  return this.availabilityRangeLimits[
    this.availabilityRangeUnit
  ];

}


getAvailabilityRangeError():
  string | null {

  if (
    this.availabilityRangeValue === null
  ) {
    return null;
  }


  if (
    !Number.isInteger(
      this.availabilityRangeValue
    ) ||
    this.availabilityRangeValue <= 0
  ) {

    return (
      'La cantidad debe ser un número ' +
      'entero mayor que 0.'
    );

  }


  const maximum =
    this.getAvailabilityRangeMax();


  if (
    this.availabilityRangeValue >
    maximum
  ) {

    const labels = {
      days: 'días',
      weeks: 'semanas',
      months: 'meses'
    };


    return (
      `El máximo permitido para ` +
      `${labels[this.availabilityRangeUnit]} ` +
      `es ${maximum}.`
    );

  }


  return null;

}


getAvailabilityRangeUnitLabel(): string {

  const value =
    this.availabilityRangeValue ?? 0;


  const singular = {
    days: 'día',
    weeks: 'semana',
    months: 'mes'
  };


  const plural = {
    days: 'días',
    weeks: 'semanas',
    months: 'meses'
  };


  return value === 1
    ? singular[this.availabilityRangeUnit]
    : plural[this.availabilityRangeUnit];

}


getGenerationStartDate(): Date {

  const now =
    new Date();


  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

}


getGenerationEndDate(): Date | null {

  if (
    !this.isAvailabilityRangeValid() ||
    this.availabilityRangeValue === null
  ) {
    return null;
  }


  const startDate =
    this.getGenerationStartDate();

  const value =
    this.availabilityRangeValue;


  if (
    this.availabilityRangeUnit === 'days'
  ) {

    const endDate =
      new Date(startDate);

    endDate.setDate(
      endDate.getDate() +
      value - 1
    );

    return endDate;

  }


  if (
    this.availabilityRangeUnit === 'weeks'
  ) {

    const endDate =
      new Date(startDate);

    endDate.setDate(
      endDate.getDate() +
      (value * 7) - 1
    );

    return endDate;

  }


  return this.addMonthsToDate(
    startDate,
    value
  );

}


private addMonthsToDate(
  sourceDate: Date,
  months: number
): Date {

  const sourceDay =
    sourceDate.getDate();


  const target =
    new Date(
      sourceDate.getFullYear(),
      sourceDate.getMonth() + months,
      1
    );


  const lastDayOfMonth =
    new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();


  target.setDate(
    Math.min(
      sourceDay,
      lastDayOfMonth
    )
  );


  return target;

}


formatGenerationDate(
  date: Date
): string {

  return date.toLocaleDateString(
    'es-MX',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );

}

isScheduleValid(): boolean {
  const enabledDays = this.workDays.filter(
    (day) => day.enabled
  );

  if (enabledDays.length === 0) {
    return false;
  }

  const daysAreValid = enabledDays.every(
    (day) => this.isDayTimeValid(day)
  );

  if (!daysAreValid) {
    return false;
  }

  if (!this.isAppointmentDurationValid()) {
    return false;
  }

  if (!this.isAppointmentGapValid()) {
  return false;
  }

  if (
  !this.isAvailabilityRangeValid()) {
  return false;
  }

  if (!this.isBreakTimeValid()) {
    return false;
  }
  if (
      this.getBreakConflictDays().length > 0
    ) {
      return false;
    }

    if (
  this.getDaysWithoutAppointmentCapacity()
    .length > 0
) {
  return false;
}
      return true;
  }
cancel(): void {
  this.cancelRequested.emit();
}
saveSchedule(): void {
  this.saveError = '';

  if (!this.isScheduleValid()) {
    this.saveError =
      'Revisa los datos del horario habitual antes de guardar.';
    return;
  }

  const config: RegularScheduleConfig = {
    workDays: this.workDays
      .filter((day) => day.enabled)
      .map((day) => ({
        ...day,
      })),

    appointmentDuration:
      this.appointmentDuration as number,

    appointmentGapMinutes:
      this.appointmentGapMinutes as number,

    availabilityRangeValue:
      this.availabilityRangeValue as number,

    availabilityRangeUnit:
      this.availabilityRangeUnit,

    break: {
      ...this.breakConfig,
    },
  };

  this.scheduleSaved.emit(config);
}
  workDays: WorkDay[] = [
    {
      id: 1,
      name: 'Lunes',
      shortName: 'LUN',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 2,
      name: 'Martes',
      shortName: 'MAR',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 3,
      name: 'Miércoles',
      shortName: 'MIÉ',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 4,
      name: 'Jueves',
      shortName: 'JUE',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 5,
      name: 'Viernes',
      shortName: 'VIE',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 6,
      name: 'Sábado',
      shortName: 'SÁB',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 7,
      name: 'Domingo',
      shortName: 'DOM',
      enabled: false,
      startTime: '',
      endTime: '',
    },
  ];

  get activeDaysCount(): number {
    return this.workDays.filter(
      (day) => day.enabled
      ).length;
  }
  startEditingDay(day: WorkDay): void {
  this.editingDayId = day.id;
}

confirmDayEditing(day: WorkDay): void {
  if (!this.isDayTimeValid(day)) {
    return;
  }

  this.editingDayId = null;
}

isDayEditing(day: WorkDay): boolean {
  return this.editingDayId === day.id;
}

formatTime12Hour(time: string): string {
  if (!time) {
    return '';
  }

  const [hours, minutes] = time
    .split(':')
    .map(Number);

  const period = hours >= 12 ? 'PM' : 'AM';

  let formattedHours = hours % 12;

  if (formattedHours === 0) {
    formattedHours = 12;
  }

  return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

  toggleDay(day: WorkDay): void {
  day.enabled = !day.enabled;

  if (day.enabled) {
    if (!day.startTime || !day.endTime) {
      this.editingDayId = day.id;
    }

    return;
  }

  if (this.editingDayId === day.id) {
    this.editingDayId = null;
  }
}

private applyInitialConfig(
  config: RegularScheduleConfig
): void {

  const configuredDays = new Map(
    config.workDays.map(
      (day) => [day.id, day]
    )
  );


  this.workDays = this.workDays.map(
    (day) => {

      const configuredDay =
        configuredDays.get(day.id);


      if (!configuredDay) {
        return {
          ...day,
          enabled: false,
          startTime: '',
          endTime: '',
        };
      }


      return {
        ...day,

        enabled: true,

        startTime:
          configuredDay.startTime,

        endTime:
          configuredDay.endTime,
      };
    }
  );


  this.appointmentDuration =
    config.appointmentDuration;


  this.customDurationEnabled =
    !this.durationOptions.includes(
      config.appointmentDuration
    );


  this.appointmentGapMinutes =
    config.appointmentGapMinutes;

  this.availabilityRangeValue =
  config.availabilityRangeValue;

  this.availabilityRangeUnit =
    config.availabilityRangeUnit;

  this.customAppointmentGapEnabled =
    !this.appointmentGapOptions.includes(
      config.appointmentGapMinutes
    );


  this.breakConfig = {
    ...config.break,
  };


  this.editingDayId = null;

  this.saveError = '';
}
}