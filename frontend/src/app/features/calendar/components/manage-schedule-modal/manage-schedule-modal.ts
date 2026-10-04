import {
  Component,
  EventEmitter,
  Output,
} from '@angular/core';

import {
  RegularSchedule,
  RegularScheduleConfig,
} from '../regular-schedule/regular-schedule';

import {
  DisabledSchedulesList
} from '../disabled-schedules-list/disabled-schedules-list';

import {
  RegularScheduleService,
  SaveRegularScheduleRequest,
} from '../../services/regular-schedule.service';


type ScheduleTab =
  'regular'
  | 'disabled';


@Component({
  selector: 'app-manage-schedule-modal',

  imports: [
    RegularSchedule,
    DisabledSchedulesList,
  ],

  templateUrl: './manage-schedule-modal.html',

  styleUrl: './manage-schedule-modal.css',
})
export class ManageScheduleModal {

  @Output()
  closed = new EventEmitter<void>();

  @Output()
  scheduleUpdated = new EventEmitter<void>();


  activeTab: ScheduleTab =
    'regular';


  isSaving = false;

  saveError = '';


  constructor(
    private regularScheduleService:
      RegularScheduleService
  ) {}


  selectTab(
    tab: ScheduleTab
  ): void {
    this.activeTab = tab;
  }


  handleRegularScheduleSaved(
    config: RegularScheduleConfig
  ): void {

    if (this.isSaving) {
      return;
    }

    this.saveError = '';

    this.isSaving = true;


    const request:
      SaveRegularScheduleRequest = {

      appointmentDuration:
        config.appointmentDuration,

      appointmentGapMinutes:
        config.appointmentGapMinutes,

      workDays:
        config.workDays.map(
          (day) => ({
            dayOfWeek: day.id,

            startTime:
              day.startTime,

            endTime:
              day.endTime,
          })
        ),

      break: {
        enabled:
          config.break.enabled,

        startTime:
          config.break.startTime,

        endTime:
          config.break.endTime,
      },
    };


    this.regularScheduleService
      .saveRegularSchedule(request)
      .subscribe({

        next: () => {
          this.isSaving = false;

          this.scheduleUpdated.emit();

          this.close();
        },

        error: (error) => {
          console.error(
            'Error al guardar el horario habitual:',
            error
          );

          this.saveError =
            error?.error?.error
            ?? 'No fue posible guardar el horario habitual.';

          this.isSaving = false;
        }
      });
  }


  close(): void {
    this.closed.emit();
  }
}