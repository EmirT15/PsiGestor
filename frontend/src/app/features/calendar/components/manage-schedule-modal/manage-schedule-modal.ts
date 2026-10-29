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
import { FormsModule } from '@angular/forms';

import { Availability } from '../../models/availability.model';
import {
  RegularScheduleService,
  SaveRegularScheduleRequest
} from '../../services/regular-schedule.service';
import { DisabledSchedulesList } from '../disabled-schedules-list/disabled-schedules-list';
import {
  RegularSchedule,
  RegularScheduleConfig
} from '../regular-schedule/regular-schedule';

type ScheduleTab = 'regular' | 'disabled';

export const REASON_OPTIONS = [
  'Reunión',
  'Comida',
  'Actividad personal',
  'Evento académico',
  'Emergencia',
  'Otro motivo'
] as const;

interface DayOption {
  id: number;
  shortName: string;
}

@Component({
  selector: 'app-manage-schedule-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RegularSchedule,
    DisabledSchedulesList
  ],
  templateUrl: './manage-schedule-modal.html',
  styleUrl: './manage-schedule-modal.css',
})
export class ManageScheduleModal implements OnInit, OnChanges {

  @Input() selectedAvailability: Availability | null = null;
  @Input() initialData: any = null;

  @Output() closed = new EventEmitter<void>();
  @Output() scheduleUpdated = new EventEmitter<RegularScheduleConfig>();

  activeTab: ScheduleTab = 'regular';

  /* HORARIO HABITUAL */
  isSaving = false;
  saveError = '';
  isLoadingRegularSchedule = true;
  loadError = '';
  regularScheduleConfig: RegularScheduleConfig | null = null;

  /* INHABILITAR HORARIO (#48) */
  readonly reasonOptions = REASON_OPTIONS;
  readonly availableDays: DayOption[] = [
    { id: 1, shortName: 'LUN' },
    { id: 2, shortName: 'MAR' },
    { id: 3, shortName: 'MIÉ' },
    { id: 4, shortName: 'JUE' },
    { id: 5, shortName: 'VIE' },
    { id: 6, shortName: 'SÁB' },
    { id: 7, shortName: 'DOM' },
  ];

  selectedDays: number[] = [1, 2, 3, 4, 5];
  showImpactPreview = false;
  formError = '';
  isHistoryOpen = false;

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

  impactSummary = {
    totalSlots: 0,
    conflictsCount: 0
  };

  constructor(
    private regularScheduleService: RegularScheduleService
  ) {}

  ngOnInit(): void {
    this.loadRegularSchedule();
    this.processInitialInputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] || changes['selectedAvailability']) {
      this.processInitialInputs();
    }
  }

  private loadRegularSchedule(): void {
    this.isLoadingRegularSchedule = true;
    this.loadError = '';

    this.regularScheduleService.getRegularSchedule().subscribe({
      next: (schedule) => {
        if (!schedule) {
          this.regularScheduleConfig = null;
          this.isLoadingRegularSchedule = false;
          return;
        }

        this.regularScheduleConfig = {
          appointmentDuration: schedule.appointmentDuration,
          appointmentGapMinutes: schedule.appointmentGapMinutes,
          availabilityRangeValue: schedule.availabilityRangeValue,
          availabilityRangeUnit: schedule.availabilityRangeUnit,
          workDays: schedule.workDays.map((day) => {
            const metadata = this.dayMetadata[day.dayOfWeek];
            return {
              id: day.dayOfWeek,
              name: metadata.name,
              shortName: metadata.shortName,
              enabled: true,
              startTime: day.startTime,
              endTime: day.endTime,
            };
          }),
          break: {
            enabled: schedule.break.enabled,
            startTime: schedule.break.startTime ?? '',
            endTime: schedule.break.endTime ?? '',
          },
        };

        this.isLoadingRegularSchedule = false;
      },
      error: (error) => {
        console.error('Error al cargar horario habitual:', error);
        this.loadError = 'No fue posible cargar el horario habitual.';
        this.isLoadingRegularSchedule = false;
      }
    });
  }

  selectTab(tab: ScheduleTab): void {
    this.activeTab = tab;
  }

  setDisableMode(isRange: boolean): void {
    this.disableForm.isRange = isRange;
    this.formError = '';
  }

  isDaySelected(dayId: number): boolean {
    return this.selectedDays.includes(dayId);
  }

  toggleDaySelection(dayId: number): void {
    if (this.isDaySelected(dayId)) {
      this.selectedDays = this.selectedDays.filter(d => d !== dayId);
    } else {
      this.selectedDays = [...this.selectedDays, dayId];
    }
  }

  onHistoryToggle(event: Event): void {
    const details = event.target as HTMLDetailsElement;
    if (details) {
      this.isHistoryOpen = details.open;
    }
  }

  /* VALIDACIONES Y VISTA PREVIA */
  validateAndCalculateImpact(): void {
    this.formError = '';

    const { isRange, date, startDate, endDate, startTime, endTime, reason } = this.disableForm;

    if (!startTime || !endTime || !reason) {
      this.formError = 'Por favor completa las horas y el motivo.';
      return;
    }

    if (!isRange && !date) {
      this.formError = 'Por favor selecciona la fecha a inhabilitar.';
      return;
    }

    if (isRange && (!startDate || !endDate)) {
      this.formError = 'Por favor selecciona el rango de fechas inicio y fin.';
      return;
    }

    if (startTime >= endTime) {
      this.formError = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }

    if (isRange && startDate > endDate) {
      this.formError = 'La fecha de inicio no puede ser posterior a la fecha de fin.';
      return;
    }

    if (isRange && this.selectedDays.length === 0) {
      this.formError = 'Selecciona al menos un día aplicable de la semana.';
      return;
    }

    let daysCount = 1;
    if (isRange) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    const slotsPerDay = Math.max(1, Math.floor(durationMinutes / 45));
    this.impactSummary.totalSlots = slotsPerDay * daysCount;
    this.impactSummary.conflictsCount = 0;

    this.showImpactPreview = true;
  }

  backToForm(): void {
    this.showImpactPreview = false;
  }

  confirmDisable(): void {
    console.log('Inhabilitación registrada exitosamente:', {
      ...this.disableForm,
      applicableDays: this.selectedDays
    });

    this.showImpactPreview = false;
    this.resetDisableForm();
    this.isHistoryOpen = true; // Despliega el historial tras guardar
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
    this.formError = '';
    this.showImpactPreview = false;
  }

  private processInitialInputs(): void {
    if (this.selectedAvailability) {
      this.activeTab = 'disabled';
      this.disableForm = {
        isRange: false,
        date: this.selectedAvailability.date,
        startDate: this.selectedAvailability.date,
        endDate: this.selectedAvailability.date,
        startTime: this.selectedAvailability.startTime,
        endTime: this.selectedAvailability.endTime,
        reason: '',
        observation: ''
      };
      return;
    }

    if (this.initialData) {
      this.activeTab = 'disabled';
      const dateValue = this.initialData.startDate || this.initialData.date || '';

      this.disableForm = {
        isRange: Boolean(this.initialData.endDate && this.initialData.endDate !== dateValue),
        date: dateValue,
        startDate: dateValue,
        endDate: this.initialData.endDate || dateValue,
        startTime: this.initialData.startTime || '',
        endTime: this.initialData.endTime || '',
        reason: this.initialData.reason || '',
        observation: this.initialData.observation || ''
      };
    }
  }

  handleRegularScheduleSaved(config: RegularScheduleConfig): void {
    if (this.isSaving) return;

    this.saveError = '';
    this.isSaving = true;

    const request: SaveRegularScheduleRequest = {
      appointmentDuration: config.appointmentDuration,
      appointmentGapMinutes: config.appointmentGapMinutes,
      availabilityRangeValue: config.availabilityRangeValue,
      availabilityRangeUnit: config.availabilityRangeUnit,
      workDays: config.workDays.map((day) => ({
        dayOfWeek: day.id,
        startTime: day.startTime,
        endTime: day.endTime,
      })),
      break: {
        enabled: config.break.enabled,
        startTime: config.break.startTime,
        endTime: config.break.endTime,
      },
    };

    this.regularScheduleService.saveRegularSchedule(request).subscribe({
      next: () => {
        this.isSaving = false;
        this.scheduleUpdated.emit(config);
        this.close();
      },
      error: (error) => {
        console.error('Error al guardar horario habitual:', error);
        this.saveError = error?.error?.error ?? 'No fue posible guardar el horario habitual.';
        this.isSaving = false;
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  private readonly dayMetadata: Record<number, { name: string; shortName: string }> = {
    1: { name: 'Lunes', shortName: 'LUN' },
    2: { name: 'Martes', shortName: 'MAR' },
    3: { name: 'Miércoles', shortName: 'MIÉ' },
    4: { name: 'Jueves', shortName: 'JUE' },
    5: { name: 'Viernes', shortName: 'VIE' },
    6: { name: 'Sábado', shortName: 'SÁB' },
    7: { name: 'Domingo', shortName: 'DOM' },
  };
}