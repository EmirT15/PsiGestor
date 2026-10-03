import {
  Component,
  EventEmitter,
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

  @Output()
scheduleSaved = new EventEmitter<RegularScheduleConfig>();

saveError = '';

  appointmentDuration: number | null = null;

  readonly durationOptions = [30, 45, 60];
  
  customDurationEnabled = false;


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

  if (!this.isBreakTimeValid()) {
    return false;
  }

  if (!this.isBreakInsideWorkingHours()) {
    return false;
  }

  return true;
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

  toggleDay(day: WorkDay): void {
    day.enabled = !day.enabled;
  }
}