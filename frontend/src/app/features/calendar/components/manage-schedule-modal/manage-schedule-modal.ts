import {
  Component,
  EventEmitter,
  OnInit,
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
export class ManageScheduleModal implements OnInit {

  @Output()
  closed = new EventEmitter<void>();

 @Output()
scheduleUpdated =
  new EventEmitter<RegularScheduleConfig>();


  activeTab: ScheduleTab =
    'regular';

  isSaving = false;
  saveError = '';

  isLoadingRegularSchedule = true;

  loadError = '';

  regularScheduleConfig:
    RegularScheduleConfig | null = null;


  constructor(
    private regularScheduleService:
      RegularScheduleService
  ) {}

  ngOnInit(): void {
  this.loadRegularSchedule();
}

private loadRegularSchedule(): void {

  this.isLoadingRegularSchedule = true;

  this.loadError = '';


  this.regularScheduleService
    .getRegularSchedule()
    .subscribe({

      next: (schedule) => {

        if (!schedule) {
          this.regularScheduleConfig = null;

          this.isLoadingRegularSchedule =
            false;

          return;
        }


        this.regularScheduleConfig = {

          appointmentDuration:
            schedule.appointmentDuration,

          appointmentGapMinutes:
            schedule.appointmentGapMinutes,

          workDays:
            schedule.workDays.map(
              (day) => {

                const metadata =
                  this.dayMetadata[
                    day.dayOfWeek
                  ];


                return {

                  id:
                    day.dayOfWeek,

                  name:
                    metadata.name,

                  shortName:
                    metadata.shortName,

                  enabled:
                    true,

                  startTime:
                    day.startTime,

                  endTime:
                    day.endTime,
                };
              }
            ),

          break: {

            enabled:
              schedule.break.enabled,

            startTime:
              schedule.break.startTime
              ?? '',

            endTime:
              schedule.break.endTime
              ?? '',
          },
        };


        this.isLoadingRegularSchedule =
          false;
      },


      error: (error) => {

        console.error(
          'Error al cargar el horario habitual:',
          error
        );

        this.loadError =
          'No fue posible cargar el horario habitual.';

        this.isLoadingRegularSchedule =
          false;
      }
    });
}




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

  this.scheduleUpdated.emit(
    config
  );

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
  private readonly dayMetadata: Record<
  number,
  {
    name: string;
    shortName: string;
  }
> = {

  1: {
    name: 'Lunes',
    shortName: 'LUN',
  },

  2: {
    name: 'Martes',
    shortName: 'MAR',
  },

  3: {
    name: 'Miércoles',
    shortName: 'MIÉ',
  },

  4: {
    name: 'Jueves',
    shortName: 'JUE',
  },

  5: {
    name: 'Viernes',
    shortName: 'VIE',
  },

  6: {
    name: 'Sábado',
    shortName: 'SÁB',
  },

  7: {
    name: 'Domingo',
    shortName: 'DOM',
  },
};
}