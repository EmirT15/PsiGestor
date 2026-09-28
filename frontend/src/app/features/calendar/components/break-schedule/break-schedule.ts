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
}