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
export interface RegularScheduleConfig {
  workDays: WorkDay[];
  appointmentDuration: number;
  appointmentGapMinutes: number;
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

  return null;
}
isAppointmentDurationValid(): boolean {
  return (
    this.appointmentDuration !== null &&
    this.appointmentDuration > 0
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
getBreakError(): string | null {
  if (!this.breakConfig.enabled) {
    return null;
  }

  if (
    !this.breakConfig.startTime ||
    !this.breakConfig.endTime
  ) {
    return 'Debes definir el inicio y la finalización del descanso.';
  }

  if (
    this.breakConfig.startTime >=
    this.breakConfig.endTime
  ) {
    return 'La hora inicial del descanso debe ser anterior a la hora final.';
  }

  if (!this.isBreakInsideWorkingHours()) {
    return 'El descanso debe encontrarse dentro del horario de atención de los días habilitados.';
  }

  return null;
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

  if (!this.isBreakTimeValid()) {
    return false;
  }

  if (!this.isBreakInsideWorkingHours()) {
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

    break: {
      ...this.breakConfig,
    },
  };

  this.scheduleSaved.emit(config);
}
isBreakInsideWorkingHours(): boolean {
  if (!this.breakConfig.enabled) {
    return true;
  }

  if (!this.isBreakTimeValid()) {
    return false;
  }

  const enabledDays = this.workDays.filter(
    (day) => day.enabled && this.isDayTimeValid(day)
  );

  if (enabledDays.length === 0) {
    return false;
  }

  return enabledDays.every((day) => {
    return (
      this.breakConfig.startTime >= day.startTime &&
      this.breakConfig.endTime <= day.endTime
    );
  });
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