import { Component, OnInit, OnChanges, Input, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';
import { DisabledSchedule, InvalidationReason } from '../../models/availability.model';

@Component({
  selector: 'app-disabled-schedules-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './disabled-schedules-list.css',
  templateUrl: './disabled-schedules-list.html',
})
export class DisabledSchedulesList implements OnInit {
  @Input() initialData: any = null; // RECIBE LOS DATOS DESDE EL MODAL PADRE

  schedules: DisabledSchedule[] = [];
  filterType: 'Todos' | 'Puntual' | 'Rango de fechas' = 'Todos';
  showForm: boolean = false;
  isEditing: boolean = false;
  selectedId?: number;
  hasConflictWarning = false;
  isSubmitting: boolean = false; // Bandera para evitar múltiples envíos

  reasons: InvalidationReason[] = [
    'Reunión',
    'Comida',
    'Actividad personal',
    'Evento académico',
    'Emergencia',
    'Otro motivo'
  ];

  formData: DisabledSchedule = this.getEmptyForm();
  conflictCount: number = 0;
  forceConfirm: boolean = false;

  // Variables para Modal de Detalle y Modal de Confirmación
  selectedItemForDetail: DisabledSchedule | null = null;
  showConfirmModal: boolean = false;
  itemToRehabilitateId?: number;

  constructor(
    private calendarService: CalendarService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDisabledSchedules();
    this.checkInitialData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.initialData) {
      this.checkInitialData();
    }
  }

  private checkInitialData(): void {
    if (this.initialData) {
      const dateVal = this.initialData.startDate || this.initialData.date || new Date().toISOString().split('T')[0];

      // Asigna dinámicamente las horas de la tarjeta seleccionada
      this.formData = {
        type: this.initialData.type || 'Puntual',
        startDate: dateVal,
        endDate: this.initialData.endDate || dateVal,
        startTime: this.initialData.startTime || '08:00',
        endTime: this.initialData.endTime || '09:30',
        reason: 'Reunión',
        observation: ''
      };

      this.isEditing = false;
      this.showForm = true; // Muestra directamente la tarjeta del formulario (2da imagen)
      this.hasConflictWarning = false;
      this.cdr.detectChanges();
    }
  }

  loadDisabledSchedules(): void {
    this.calendarService.getDisabledSchedules().subscribe({
      next: (data) => {
        this.schedules = data;
        this.cdr.detectChanges(); // Forzar pintado de las tarjetas
      }
    });
  }

  get filteredSchedules(): DisabledSchedule[] {
    if (this.filterType === 'Todos') return this.schedules;
    return this.schedules.filter((s) => s.type === this.filterType);
  }

  getEmptyForm(): DisabledSchedule {
    // Generar fecha de hoy en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    return {
      type: 'Puntual',
      startDate: today,
      endDate: today,
      startTime: '08:00',
      endTime: '09:30',
      reason: 'Reunión',
      observation: ''
    };
  }

  openNewForm(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showForm = true;
    this.hasConflictWarning = false;
  }

  // --- CONSULTAR DETALLE ---
  viewDetails(item: DisabledSchedule): void {
    this.selectedItemForDetail = item;
  }

  closeDetails(): void {
    this.selectedItemForDetail = null;
  }

  // --- MODIFICAR INHABILITACIÓN ---
  editSchedule(item: DisabledSchedule): void {
    this.closeDetails();
    this.formData = { ...item };
    this.selectedId = item.id;
    this.isEditing = true;
    this.showForm = true;
  }

  // --- REHABILITAR HORARIO (MODAL DE CONFIRMACIÓN) ---
  rehabilitate(id?: number): void {
    if (!id) return;
    if (confirm('¿Está seguro de que desea rehabilitar este horario? Volverá a estar disponible.')) {
      this.calendarService.enableSchedule(id).subscribe(() => {
        this.loadDisabledSchedules();
      });
    }
  }

  promptRehabilitate(id?: number): void {
    if (!id) return;
    this.itemToRehabilitateId = id;
    this.showConfirmModal = true;
  }

  cancelRehabilitate(): void {
    this.showConfirmModal = false;
    this.itemToRehabilitateId = undefined;
  }

  confirmRehabilitate(): void {
    if (!this.itemToRehabilitateId) return;

    this.calendarService.enableSchedule(this.itemToRehabilitateId).subscribe({
      next: () => {
        this.showConfirmModal = false;
        this.itemToRehabilitateId = undefined;
        this.closeDetails();
        this.loadDisabledSchedules();
      },
      error: (err) => {
        console.error('Error al rehabilitar:', err);
        alert('Ocurrió un error al intentar rehabilitar el horario.');
      }
    });
  }

  checkConflicts(): void {
    if (this.formData.startDate && this.formData.startTime && this.formData.endTime) {
      this.calendarService.checkConflicts({
        startDate: this.formData.startDate,
        endDate: this.formData.endDate || this.formData.startDate,
        startTime: this.formData.startTime,
        endTime: this.formData.endTime
      }).subscribe({
        next: (res) => {
          this.hasConflictWarning = res.hasConflict;
          this.conflictCount = res.conflictCount;
          this.cdr.detectChanges();
        },
        error: () => {
          this.hasConflictWarning = false;
          this.conflictCount = 0;
        }
      });
    }
  }

  saveSchedule(): void {
    if (!this.formData.startDate || !this.formData.startTime || !this.formData.endTime) {
      alert('Por favor, completa la fecha y franja horaria.');
      return;
    }

    // Si ya se está enviando la petición, ignoramos nuevos clics
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const request$ = (this.isEditing && this.selectedId)
      ? this.calendarService.updateDisabledSchedule(String(this.selectedId), this.formData)
      : this.calendarService.disableSchedule(this.formData);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.closeForm();             // 1. Cerramos la ventana modal de inmediato
        this.loadDisabledSchedules(); // 2. Recargamos los datos para pintar la lista
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error al guardar horario inhabilitado:', err);
        alert('Ocurrió un error al guardar la inhabilitación.');
      }
    });
  }

  closeForm(): void {
  this.showForm = false;
  this.isSubmitting = false;
  this.isEditing = false;
  this.selectedId = undefined;
  this.cdr.detectChanges(); // Forzar ocultar la ventana en la vista
}

  getCount(type: 'Puntual' | 'Rango de fechas'): number {
    return this.schedules.filter(s => s.type === type).length;
  }
}