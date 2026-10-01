import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegularSchedule } from '../regular-schedule/regular-schedule';
import { DisabledSchedulesList } from '../disabled-schedules-list/disabled-schedules-list';
import { Availability } from '../../models/availability.model';

type ScheduleTab = 'regular' | 'disabled';

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
  templateUrl: './manage-schedule-modal.html',
  styleUrl: './manage-schedule-modal.css',
})

export class ManageScheduleModal {
  
  @Input() selectedAvailability: Availability | null = null;
  @Input() initialData: any = null;
  @Output() closed = new EventEmitter<void>();

  activeTab: ScheduleTab = 'regular';
  isDisableFormOpen = false;

  // Lista estricta de motivos de la HU-02B
  readonly reasonOptions = REASON_OPTIONS;

  // Modelo para el formulario de inhabilitación
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

  ngOnInit(): void {
    if (this.initialData) {
      this.activeTab = 'disabled';
    }
  }

  ngOnChanges(): void {
    if (this.initialData) {
      this.activeTab = 'disabled';
    }
  }

  private processInitialInputs(): void {
    // Caso 1: Viene disponibilidad preseleccionada
    if (this.selectedAvailability) {
      this.activeTab = 'disabled';
      this.openDisableForm(this.selectedAvailability);
      return;
    }

    // Caso 2: Viene initialData desde la agenda/tarjeta
    if (this.initialData) {
      this.activeTab = 'disabled';
      this.isDisableFormOpen = true;

      const dateVal = this.initialData.startDate || this.initialData.date || '';

      this.disableForm = {
        isRange: false,
        date: dateVal,
        startDate: dateVal,
        endDate: this.initialData.endDate || dateVal,
        startTime: this.initialData.startTime || '', // Asigna la hora de inicio recibida de la tarjeta
        endTime: this.initialData.endTime || '',     // Asigna la hora de fin recibida de la tarjeta
        reason: '',
        observation: ''
      };
    }
  }

  selectTab(tab: ScheduleTab): void {
    this.activeTab = tab;
  }

  openDisableForm(availability?: Availability): void {
    this.activeTab = 'disabled';
    this.isDisableFormOpen = true;

    if (availability) {
      this.disableForm = {
        isRange: false,
        date: availability.date,
        startDate: availability.date,
        endDate: availability.date,
        startTime: availability.startTime,
        endTime: availability.endTime,
        reason: '',
        observation: ''
      };
    } else {
      this.resetDisableForm();
    }
  }
  

  closeDisableForm(): void {
    this.isDisableFormOpen = false;
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

  confirmDisable(): void {
    if (!this.disableForm.reason) {
      alert('Debe seleccionar únicamente un motivo.');
      return;
    }

    // Aquí ejecutas la llamada al servicio para guardar la inhabilitación
    console.log('Inhabilitación confirmada:', this.disableForm);

    this.closeDisableForm();
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

}