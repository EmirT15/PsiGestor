import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Availability
} from '../../models/availability.model';

import {
  RegularScheduleService,
  SaveRegularScheduleRequest
} from '../../services/regular-schedule.service';

import {
  DisabledSchedulesList
} from '../disabled-schedules-list/disabled-schedules-list';

import {
  RegularSchedule,
  RegularScheduleConfig
} from '../regular-schedule/regular-schedule';


type ScheduleTab =
  'regular'
  | 'disabled';


export const REASON_OPTIONS = [
  'Reunión',
  'Comida',
  'Actividad personal',
  'Evento académico',
  'Emergencia',
  'Otro motivo'
] as const;


@Component({
  selector: 'app-manage-schedule-modal',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RegularSchedule,
    DisabledSchedulesList
  ],

  templateUrl:
    './manage-schedule-modal.html',

  styleUrl:
    './manage-schedule-modal.css',
})
export class ManageScheduleModal
  implements OnInit, OnChanges {


  /* ============================================================
     ENTRADAS
     ============================================================ */


  /*
   * Disponibilidad seleccionada directamente
   * desde la agenda.
   *
   * Se conserva por compatibilidad con
   * la implementación de HU-02B.
   */
  @Input()
  selectedAvailability:
    Availability | null = null;


  /*
   * Información precargada enviada desde
   * calendar.ts para la inhabilitación rápida.
   */
  @Input()
  initialData: any = null;


  /* ============================================================
     SALIDAS
     ============================================================ */


  @Output()
  closed =
    new EventEmitter<void>();


  /*
   * Notifica al calendario cuando
   * HU-02A actualiza el horario habitual.
   */
  @Output()
  scheduleUpdated =
    new EventEmitter<
      RegularScheduleConfig
    >();


  /* ============================================================
     ESTADO DEL MODAL
     ============================================================ */


  activeTab:
    ScheduleTab = 'regular';


  /* ============================================================
     HU-02A - HORARIO HABITUAL
     ============================================================ */


  isSaving = false;

  saveError = '';


  isLoadingRegularSchedule =
    true;

  loadError = '';


  regularScheduleConfig:
    RegularScheduleConfig | null =
      null;


  /* ============================================================
     HU-02B - INHABILITAR HORARIO
     ============================================================ */


  isDisableFormOpen = false;


  readonly reasonOptions =
    REASON_OPTIONS;


  disableForm = {

    isRange: false,

    date: '',

    startDate: '',

    endDate: '',

    startTime: '',

    endTime: '',

    reason: '',

    observation: ''
  };


  /* ============================================================
     CONSTRUCTOR
     ============================================================ */


  constructor(
    private regularScheduleService:
      RegularScheduleService
  ) {}


  /* ============================================================
     CICLO DE VIDA
     ============================================================ */


  ngOnInit(): void {

    /*
     * HU-02A:
     * recuperar configuración habitual.
     */
    this.loadRegularSchedule();


    /*
     * HU-02B:
     * revisar si el modal fue abierto
     * desde una disponibilidad concreta.
     */
    this.processInitialInputs();
  }


  ngOnChanges(
    changes: SimpleChanges
  ): void {

    /*
     * Si calendar.ts modifica initialData
     * o selectedAvailability mientras
     * el componente existe, volver a
     * procesar la precarga.
     */
    if (
      changes['initialData']
      ||
      changes['selectedAvailability']
    ) {

      this.processInitialInputs();
    }
  }


  /* ============================================================
     HU-02A - CARGAR HORARIO HABITUAL
     ============================================================ */


  private loadRegularSchedule():
    void {

    this.isLoadingRegularSchedule =
      true;

    this.loadError = '';


    this.regularScheduleService
      .getRegularSchedule()
      .subscribe({

        next: (schedule) => {

          /*
           * Todavía no existe una
           * configuración guardada.
           */
          if (!schedule) {

            this.regularScheduleConfig =
              null;

            this.isLoadingRegularSchedule =
              false;

            return;
          }


          /*
           * Adaptar respuesta del backend
           * al modelo usado por
           * <app-regular-schedule>.
           */
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


  /* ============================================================
     NAVEGACIÓN ENTRE PESTAÑAS
     ============================================================ */


  selectTab(
    tab: ScheduleTab
  ): void {

    this.activeTab =
      tab;
  }


  /* ============================================================
     HU-02A - GUARDAR HORARIO HABITUAL
     ============================================================ */


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

            dayOfWeek:
              day.id,

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
      .saveRegularSchedule(
        request
      )
      .subscribe({

        next: () => {

          this.isSaving =
            false;


          /*
           * Avisar a calendar.ts para
           * regenerar/refrescar la agenda.
           */
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
            ??
            'No fue posible guardar el horario habitual.';


          this.isSaving =
            false;
        }

      });
  }


  /* ============================================================
     HU-02B - PROCESAR INHABILITACIÓN RÁPIDA
     ============================================================ */


  private processInitialInputs():
    void {

    /*
     * Caso 1:
     * se recibió una Availability
     * completa.
     */
    if (
      this.selectedAvailability
    ) {

      this.activeTab =
        'disabled';


      this.openDisableForm(
        this.selectedAvailability
      );


      return;
    }


    /*
     * Caso 2:
     * calendar.ts envió initialData.
     */
    if (
      this.initialData
    ) {

      this.activeTab =
        'disabled';

      this.isDisableFormOpen =
        true;


      const dateValue =
        this.initialData.startDate
        ||
        this.initialData.date
        ||
        '';


      this.disableForm = {

        isRange:
          Boolean(
            this.initialData.endDate
            &&
            this.initialData.endDate !==
              dateValue
          ),

        date:
          dateValue,

        startDate:
          dateValue,

        endDate:
          this.initialData.endDate
          ||
          dateValue,

        startTime:
          this.initialData.startTime
          ||
          '',

        endTime:
          this.initialData.endTime
          ||
          '',

        reason:
          this.initialData.reason
          ||
          '',

        observation:
          this.initialData.observation
          ||
          ''
      };
    }
  }


  /* ============================================================
     HU-02B - FORMULARIO DE INHABILITACIÓN
     ============================================================ */


  openDisableForm(
    availability?:
      Availability
  ): void {

    this.activeTab =
      'disabled';

    this.isDisableFormOpen =
      true;


    if (availability) {

      this.disableForm = {

        isRange: false,

        date:
          availability.date,

        startDate:
          availability.date,

        endDate:
          availability.date,

        startTime:
          availability.startTime,

        endTime:
          availability.endTime,

        reason: '',

        observation: ''
      };


      return;
    }


    this.resetDisableForm();

    this.isDisableFormOpen =
      true;
  }


  closeDisableForm(): void {

    this.isDisableFormOpen =
      false;

    this.resetDisableForm();
  }


  resetDisableForm(): void {

    this.disableForm = {

      isRange: false,

      date: '',

      startDate: '',

      endDate: '',

      startTime: '',

      endTime: '',

      reason: '',

      observation: ''
    };
  }


  /*
   * Conservado de HU-02B.
   *
   * El registro definitivo se realizará
   * mediante la lógica del componente
   * disabled-schedules-list / servicio
   * correspondiente.
   *
   * No se simula aquí un guardado en
   * backend que todavía no esté enlazado.
   */
  confirmDisable(): void {

    if (
      !this.disableForm.reason
    ) {

      alert(
        'Debe seleccionar únicamente un motivo.'
      );

      return;
    }


    console.log(
      'Inhabilitación preparada:',
      this.disableForm
    );
  }


  /* ============================================================
     CERRAR MODAL
     ============================================================ */


  close(): void {

    this.closed.emit();
  }


  /* ============================================================
     METADATOS DE DÍAS
     ============================================================ */


  private readonly dayMetadata:
    Record<
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