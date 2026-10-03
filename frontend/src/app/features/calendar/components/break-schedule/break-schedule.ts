import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface BreakScheduleConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-break-schedule',
  imports: [FormsModule],
  templateUrl: './break-schedule.html',
  styleUrl: './break-schedule.css',
})
export class BreakSchedule {
  @Input({ required: true })
  config!: BreakScheduleConfig;

  @Input()
error: string | null = null;

  @Output()
  configChange = new EventEmitter<BreakScheduleConfig>();

  toggleBreak(): void {
    this.configChange.emit({
      ...this.config,
      enabled: !this.config.enabled,
    });
  }

  updateStartTime(startTime: string): void {
    this.configChange.emit({
      ...this.config,
      startTime,
    });
  }

  updateEndTime(endTime: string): void {
    this.configChange.emit({
      ...this.config,
      endTime,
    });
  }
  getBreakDurationMinutes(): number | null {
  if (
    !this.config.startTime ||
    !this.config.endTime
  ) {
    return null;
  }

  const [startHours, startMinutes] =
    this.config.startTime.split(':').map(Number);

  const [endHours, endMinutes] =
    this.config.endTime.split(':').map(Number);

  const start =
    startHours * 60 + startMinutes;

  const end =
    endHours * 60 + endMinutes;

  const duration = end - start;

  return duration > 0 ? duration : null;
}

getBreakDurationLabel(): string {
  const duration =
    this.getBreakDurationMinutes();

  if (duration === null) {
    return '';
  }

  if (duration < 60) {
    return `${duration} min de descanso`;
  }

  if (duration % 60 === 0) {
    const hours = duration / 60;

    return hours === 1
      ? '1 hora de descanso'
      : `${hours} horas de descanso`;
  }

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  return `${hours} h ${minutes} min de descanso`;
}

}