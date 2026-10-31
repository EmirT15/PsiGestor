import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PsychologistHeaderComponent } from '../../../psychologist/components/psychologist-header/psychologist-header.component';

import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  signal
} from '@angular/core';

import { catchError, forkJoin, of } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

import type {
  StatusFilter
} from '../../../../shared/components/status-filter/status-filter';

import {
  Availability
} from '../../models/availability.model';

import { Appointment, CalendarService, Student } from '../../services/calendar.service';

import type {
  RegularScheduleResponse
} from '../../services/regular-schedule.service';

import {
  RegularScheduleService
} from '../../services/regular-schedule.service';

import {
  AppointmentDetails
} from '../appointment-details/appointment-details';

import {
  AvailabilityCard
} from '../availability-card/availability-card';

import {
  CalendarToolbar
} from '../calendar-toolbar/calendar-toolbar';

import {
  CancelModal,
  CancelModalData
} from '../cancel-modal/cancel-modal';

import {
  ManageScheduleModal
} from '../manage-schedule-modal/manage-schedule-modal';

import type {
  RegularScheduleConfig
} from '../regular-schedule/regular-schedule';

import {
  RescheduleDetails
} from '../reschedule-details/reschedule-details';

import {
  RescheduleData,
  RescheduleModal
} from '../reschedule-modal/reschedule-modal';

interface CalendarSlot extends Availability {
  slotStartTime: string;
  slotEndTime: string;
  slotStatus: 'Disponible' | 'Reservado';
}

export interface PatientScheduleSelection {
  availability: Availability;
  slot: string;
}
@Component({
  selector: 'app-calendar',
  standalone: true,

  imports: [
    CommonModule,
    AvailabilityCard,
    AppointmentDetails,
    RescheduleDetails,
    RescheduleModal,
    CancelModal,
    CalendarToolbar,
    ManageScheduleModal,
    PsychologistHeaderComponent
  ],

  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})



export class Calendar implements OnDestroy {

  @Output()
    patientScheduleSelected = 
    new EventEmitter<PatientScheduleSelection>();

  @Input() mode: 'psychologist' | 'patient' = 'psychologist';

  private isBrowser: boolean;
  
  /*
 * Actualización automática de la agenda
 * del paciente.
 */
  private patientRefreshInterval:
    ReturnType<typeof setInterval> | null = null;

  /*
   * Fuerza la actualización visual del calendario
   * cuando llegan datos asíncronos.
   */
  readonly calendarRenderVersion =
    signal(0);


  /*
   * Disponibilidades / citas.
   */
  availabilities: Availability[] = [];
  selectedAvailability: Availability | null = null;
  appointments: Appointment[] = [];

  // buscador de alumnos
  studentSearchText = '';

  selectedStudent: Student | null = null;

  studentSearchResults: Student[] = [];

/*Notificación visual del calendario. */
toastMessage = '';

toastType:
  'success'
  | 'error'
  | 'warning' = 'success';

toastVisible = false;

private toastTimeout:
  ReturnType<typeof setTimeout>
  | null = null;

  /*
   * Horarios inhabilitados de HU-02B.
   */
  disabledSchedules: any[] = [];


  /*
   * Configuración del horario habitual HU-02A.
   */
  regularSchedule:
    RegularScheduleResponse | null = null;


  currentDate = new Date();

  currentView:
    'day'
    | 'week'
    | 'month' = 'week';

  statusFilter:
    StatusFilter = 'all';


  selectedDate = '';
  selectedSlot = '';
  selectedSlotDate = '';
  isPatientDateModalOpen = false;

  selectedAvailabilityId:
    number | null = null;

  selectedAvailabilityStatus = '';


  /*
   * Estados de ventanas y paneles.
   */
  isSidebarOpen = false;

  isRescheduleModalOpen = false;

  isCancelModalOpen = false;

  isManageScheduleOpen = false;


  /*
   * Datos precargados cuando se abre
   * "Inhabilitar horario" desde agenda.
   */
  initialModalData: any = null;


  /*
   * HU-03.
   */
  selectedAppointmentData: any = null;

  selectedRescheduleDetails: any = null;


  rescheduleData:
    RescheduleData = {

      studentName: '',
      studentInfo: '',
      modality: '',
      currentDate: '',
      currentTime: ''
    };


  cancelData:
    CancelModalData = {

      folio: '',
      dateStr: '',
      timeStr: '',
      originalReason: ''
    };


  /*
   * Filas predeterminadas para vista Semana.
   */
  readonly visualTimeRows = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00'
  ];


  /* ============================================================
     VISTA MES
     ============================================================ */


  getDaysInMonth(): Date[] {

    const year =
      this.currentDate.getFullYear();

    const month =
      this.currentDate.getMonth();

    const days: Date[] = [];


    const totalDays =
      new Date(
        year,
        month + 1,
        0
      ).getDate();


    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {

      days.push(
        new Date(
          year,
          month,
          day
        )
      );
    }


    return days;
  }


  getFirstDayOfMonth(): number {

    const year =
      this.currentDate.getFullYear();

    const month =
      this.currentDate.getMonth();


    return new Date(
      year,
      month,
      1
    ).getDay();
  }


  /* ============================================================
     NAVEGACIÓN
     ============================================================ */


  changeMonth(
    offset: number
  ): void {

    const newDate =
      new Date(
        this.getCurrentViewDate()
      );


    if (
      this.currentView === 'day'
    ) {

      newDate.setDate(
        newDate.getDate()
        + offset
      );

    } else if (
      this.currentView === 'week'
    ) {

      newDate.setDate(
        newDate.getDate()
        + (offset * 7)
      );

      const dayOfWeek = newDate.getDay();
      if (dayOfWeek === 0) {
        newDate.setDate(newDate.getDate() + 1);
      } else {
        newDate.setDate(newDate.getDate() - (dayOfWeek - 1));
      }

    } else {

      newDate.setMonth(
        newDate.getMonth()
        + offset
      );

      newDate.setDate(1);
    }


    this.currentDate =
      newDate;

    this.selectedDate =
      this.currentView === 'day'
        ? this.formatDate(newDate)
        : '';

    this.selectedSlot = '';
  }


  changeView(
    view: 'day' | 'week' | 'month'
  ): void {
    if (view === 'day' && this.currentView === 'week') {
      if (this.selectedSlotDate) {
        this.selectedDate = this.selectedSlotDate;
        this.currentDate = new Date(this.selectedSlotDate + 'T00:00:00');
      } else if (!this.selectedDate) {
        const weekDays = this.getWeekDays();
        const firstDayWithData = weekDays.find(
          (day) =>
            this.getMergedAvailabilitiesForDateString(this.formatDate(day)).length > 0
        );
        const targetDay = firstDayWithData ?? weekDays[0];
        this.currentDate = new Date(targetDay);
        this.selectedDate = this.formatDate(targetDay);
      }
    }

    this.currentView = view;
  }


  selectWeekDay(date: Date): void {
    this.currentDate = new Date(date);
    this.selectedDate = this.formatDate(date);
    this.currentView = 'day';
    this.changeDetectorRef.detectChanges();
  }


  goToToday(): void {

    const today =
      new Date();


    this.currentDate =
      today;

    this.selectedDate =
      this.formatDate(today);

    this.selectedSlot = '';
  }


  /* ============================================================
     MODAL GESTIONAR HORARIO
     ============================================================ */


  openManageSchedule(): void {

    /*
     * Apertura general:
     * no precargar inhabilitación.
     */
    this.initialModalData = null;

    this.isManageScheduleOpen =
      true;
  }


  closeManageSchedule(): void {

    this.isManageScheduleOpen =
      false;

    this.initialModalData =
      null;


    /*
     * Actualizar las tres fuentes después
     * de cerrar el modal:
     *
     * - disponibilidades
     * - horario habitual
     * - inhabilitaciones
     */
    this.refreshCalendarData();
  }

    /*
   * Inhabilitación rápida desde
   * una disponibilidad concreta.
   */
  handleDisableFromCard(
    availability: Availability
  ): void {


    const dateStr =
      availability.date ||
      this.formatDate(
        this.getCurrentViewDate()
      );


    this.initialModalData = {

      startDate:
        dateStr,

      endDate:
        dateStr,

      startTime:
        availability.startTime,

      endTime:
        availability.endTime,

      activeTab:
        'disabled'
    };


    this.isManageScheduleOpen =
      true;
  }


  /*
   * Inhabilitación rápida del bloque
   * actualmente seleccionado.
   */
  handleDisableSelectedSlot(): void {

    if (
      !this.selectedSlot ||
      !this.selectedSlotDate
    ) {
      return;
    }


    /*
     * Primero intentar localizar
     * la disponibilidad real.
     */
    const availability =
      this.availabilities.find(
        (item) =>
          item.id ===
          this.selectedAvailabilityId
      );


    if (availability) {

      this.handleDisableFromCard(
        availability
      );

      return;
    }


    /*
     * Si no existe disponibilidad identificable,
     * recuperar el rango mostrado.
     */
    const parts =
      this.selectedSlot.split(
        ' - '
      );


    const normalizeTime = (
      value: string
    ): string => {

      const cleanValue =
        value.trim();


      if (
        cleanValue.includes('AM') ||
        cleanValue.includes('PM')
      ) {

        return this.convert12to24(
          cleanValue
        );
      }


      return (
        `${cleanValue.slice(0, 5)}:00`
      );
    };


    const startTime =
      parts[0]
        ? normalizeTime(
            parts[0]
          )
        : '08:00:00';


    const endTime =
      parts[1]
        ? normalizeTime(
            parts[1]
          )
        : '09:00:00';


    this.initialModalData = {

      startDate:
        this.selectedSlotDate,

      endDate:
        this.selectedSlotDate,

      startTime,

      endTime,

      activeTab:
        'disabled'
    };


    this.isManageScheduleOpen =
      true;
  }


  /*
   * Inhabilitación rápida desde
   * una celda de la vista Semana.
   */
  handleDisableFromWeekCell(
    date: Date,
    timeRow: string
  ): void {

    /*
     * Si existe una disponibilidad concreta
     * en esa hora, utilizar su rango real.
     */
    const availability =
      this.getAvailableSlotsForHour(
        date,
        timeRow
      )[0];


    if (availability) {

      this.handleDisableFromCard(
        availability
      );

      return;
    }


    /*
     * Si no hay disponibilidad concreta,
     * precargar una hora completa.
     */
    const dateStr =
      this.formatDate(date);

    const startMinutes =
      this.timeToMinutes(
        timeRow
      );

    const endMinutes =
      startMinutes + 60;


    this.initialModalData = {

      startDate:
        dateStr,

      endDate:
        dateStr,

      startTime:
        `${this.minutesToTime(
          startMinutes
        )}:00`,

      endTime:
        `${this.minutesToTime(
          endMinutes
        )}:00`,

      activeTab:
        'disabled'
    };


    this.isManageScheduleOpen =
      true;
  }


  /* ============================================================
     INFORMACIÓN GENERAL
     ============================================================ */


  getMonthName(): string {

    return this.currentDate
      .toLocaleDateString(
        'es-MX',
        {
          month: 'long',
          year: 'numeric'
        }
      );
  }


  /* ============================================================
     DISPONIBILIDADES
     ============================================================ */


  private mapAppointmentToAvailability(
    appointment: Appointment
  ): Availability {
    const initials = (appointment.student_name || 'AL')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

    return {
      id: -appointment.id,
      date: appointment.date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      duration: appointment.duration,
      breakTime: 0,
      status: appointment.status === 'Cancelled'
        ? 'Cancelado'
        : (appointment.status === 'Pending Reschedule' || appointment.status === 'Reprogramacion pendiente'
          ? 'Reprogramacion pendiente'
          : 'Reservado'),
      studentName: appointment.student_name,
      studentInitials: initials || 'AL',
      studentAge: 20,
      studentSemester: '',
      studentProgram: '',
      consultationReason: appointment.reason || (appointment as any).reschedule_reason,
      modality:
        appointment.modality === 'In person'
          ? 'Presencial'
          : 'En línea',
      location:
        appointment.location ||
        appointment.meeting_url ||
        'Cubículo',
      folio: `PSI-${appointment.date.slice(0, 4)}-${String(
        appointment.id
      ).padStart(4, '0')}`,
      proposedDate: appointment.proposed_date || undefined,
      proposedStartTime: appointment.proposed_start_time || undefined,
      proposedEndTime: appointment.proposed_end_time || undefined,
      rescheduleRequestedBy: appointment.reschedule_requested_by || 'psicologo'
    };
  }


  private getMergedAvailabilitiesForDateString(
    dateString: string
  ): Availability[] {
    const dateAvailabilities = this.availabilities.filter(
      (availability) => availability.date === dateString
    );

    const dateAppointments = this.appointments.filter(
      (appointment) => appointment.date === dateString
    );

    const fallbackBooked: Availability[] = [];

    for (const appointment of dateAppointments) {
      const appStart = this.timeToMinutes(appointment.start_time);
      const appEnd = this.timeToMinutes(appointment.end_time);

      const matchingAvail = dateAvailabilities.find(
        (avail) =>
          this.timeToMinutes(avail.startTime) === appStart &&
          this.timeToMinutes(avail.endTime) === appEnd
      );

      if (matchingAvail) {
        // Enriquecer el bloque existente para que mantenga su ID real positivo
        if (matchingAvail.status === 'Disponible' || matchingAvail.status === 'Reservado') {
          matchingAvail.status = appointment.status === 'Cancelled'
            ? 'Cancelado'
            : (appointment.status === 'Pending Reschedule' || appointment.status === 'Reprogramacion pendiente'
              ? 'Reprogramacion pendiente'
              : 'Reservado');
          matchingAvail.studentName = appointment.student_name;
          matchingAvail.consultationReason = appointment.reason || (appointment as any).reschedule_reason;
          matchingAvail.modality = appointment.modality === 'In person' ? 'Presencial' : 'En línea';
          matchingAvail.location = appointment.location || appointment.meeting_url || 'Cubículo';
          matchingAvail.proposedDate = appointment.proposed_date || undefined;
          matchingAvail.proposedStartTime = appointment.proposed_start_time || undefined;
          matchingAvail.proposedEndTime = appointment.proposed_end_time || undefined;
          matchingAvail.rescheduleRequestedBy = appointment.reschedule_requested_by || 'psicologo';
        }
      } else {
        fallbackBooked.push(
          this.mapAppointmentToAvailability(appointment)
        );
      }
    }

    return [...dateAvailabilities, ...fallbackBooked].sort(
      (first, second) =>
        this.timeToMinutes(first.startTime) -
        this.timeToMinutes(second.startTime)
    );
  }


  getAvailabilitiesForDate(
    date: Date
  ): Availability[] {

    const dateString =
      this.formatDate(date);


    return this.getMergedAvailabilitiesForDateString(dateString)
      .filter(
        (availability) => {

          if (
            availability.status === 'Disponible' &&
            this.generateSlots(availability).length === 0
          ) {
            return false;
          }

          const sameStatus =
            this.statusFilter ===
              'all'
            ||
            availability.status ===
              this.statusFilter;


          return sameStatus;
        }
      );
  }


  selectDate( date: Date ): void {

    this.currentDate =

      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

    this.selectedDate =
      this.formatDate(
        this.currentDate
      );


    this.selectedSlot = '';

    this.selectedSlotDate = '';

    this.selectedAvailabilityId =
      null;


    this.changeDetectorRef
      .detectChanges();

    if (this.mode === 'patient' && this.currentView === 'month') {
      this.isPatientDateModalOpen = true;
    }
  }

  closePatientDateModal(): void {
    this.isPatientDateModalOpen = false;
  }

  hasPatientAvailableSchedules(): boolean {
    if (!this.selectedDate) {
      return false;
    }

    return this.getAvailabilitiesForDate(
      this.getSelectedDate()
    ).some(
      (availability) => availability.status === 'Disponible'
    );
  }


  /*
   * Selección proveniente de
   * AvailabilityCard.
   */
  selectSlot(
    slot: string,
    availability: Availability
  ): void {

    if (this.mode === 'patient') {
      return;
      }

    this.selectedSlot =
      slot;

    this.selectedSlotDate =
      availability.date;

    this.selectedDate =
      availability.date;

    this.currentDate =
      new Date(availability.date + 'T00:00:00');

    this.selectedAvailabilityId =
      availability.id;

    this.selectedAvailabilityStatus =
      availability.status;


    /*
     * Datos del modal Cancelar.
     */
    this.cancelData = {

      folio:
        availability.folio ||
        'PSI-2026-0000',

      dateStr:
        availability.date,

      timeStr:
        `${availability.startTime} - ` +
        `${availability.endTime} ` +
        `(${availability.duration} min)`,

      originalReason:
        availability.consultationReason ||
        'Consulta general'
    };


    /*
     * Datos del modal Reprogramar.
     */
    this.rescheduleData = {

      studentName:
        availability.studentName ||
        'Alumno',

      studentInfo:
        `${availability.studentAge || 0} años • ` +
        `${availability.studentSemester || ''} - ` +
        `${availability.studentProgram || ''}`,

      modality:
        `${availability.modality || 'Presencial'} ` +
        `(${availability.location || ''})`,

      currentDate:
        availability.date,

      currentTime:
        `${availability.startTime} - ` +
        `${availability.endTime}`
    };


    /*
     * Datos del sidebar de cita.
     */
    this.selectedAppointmentData = {

      id:
        availability.id,

      status:
        availability.status,

      studentName:
        availability.studentName ||
        'Alumno',

      studentAge:
        availability.studentAge ||
        0,

      studentSemester:
        availability.studentSemester ||
        '',

      studentProgram:
        availability.studentProgram ||
        '',

      dateStr:
        availability.date +
        ', ' +
        availability.startTime +
        ' - ' +
        availability.endTime,

      sessionType:
        'Sesión individual',

      duration:
        availability.duration ||
        45,

      modality:
        availability.modality ||
        'Presencial',

      location:
        availability.location ||
        'Cubículo',

      locationDetail:
        'Consultorio psicopedagógico',

      reason:
        availability.consultationReason ||
        '',

      derivedBy:
        'Asignación directa',

      sessionCount:
        '1ra Sesión'
    };


    /*
     * Datos para detalle de
     * reprogramación.
     */
    this.selectedRescheduleDetails = {

      id:
        availability.id,

      studentName:
        availability.studentName ||
        'Alumno',

      studentInitials:
        availability.studentInitials ||
        'AL',

      studentAge:
        availability.studentAge ||
        0,

      studentSemester:
        availability.studentSemester ||
        '',

      studentProgram:
        availability.studentProgram ||
        '',

      originalDateStr:
        availability.date +
        ', ' +
        availability.startTime +
        ' - ' +
        availability.endTime,

      originalDetails:
        `${availability.modality || 'Presencial'} • ` +
        `${availability.location || ''} • ` +
        `${availability.duration} min`,

      proposedDateStr:
        availability.proposedDate
          ? `${availability.proposedDate}, ` +
            `${availability.proposedStartTime} - ` +
            `${availability.proposedEndTime}`
          : 'Propuesta pendiente',

      proposedDetails:
        `${availability.modality || 'Presencial'} • ` +
        `${availability.location || ''} • ` +
        `${availability.duration} min`,

      sentAtStr:
        'Recientemente',

      reason:
        availability.consultationReason ||
        '',

      rescheduleRequestedBy:
        availability.rescheduleRequestedBy ||
        (availability as any).reschedule_requested_by ||
        'psicologo'
    };


    this.isSidebarOpen =
      true;
  }


  /*Selección visual de un bloque Disponible en Día/Semana.*/


  selectAvailableSlot(
    availability: Availability,
    slot?: string
  ): void {

    /*
    * En la vista del paciente solamente
    * se permite seleccionar Disponible.
    */
    if (
      this.mode === 'patient' &&
      availability.status !== 'Disponible'
    ) {
      return;
    }


    this.selectedAvailability =
      availability;

    this.selectedAvailabilityId =
      availability.id;

    this.selectedAvailabilityStatus =
      availability.status;

    this.selectedSlotDate =
      availability.date;

    this.selectedDate =
      availability.date;

    this.currentDate =
      new Date(
        availability.date + 'T00:00:00'
      );


    const slots =
      this.generateSlots(
        availability
      );


    if (slots.length === 0) {

      this.showToast(
        'No hay horarios disponibles en este bloque.',
        'warning'
      );

      return;
    }


    this.selectedSlot =
      slot ?? slots[0];


    /*
    * PACIENTE:
    * no abre el sidebar administrativo.
    * Envía la selección a su propia página.
    */
    if (this.mode === 'patient') {

      this.isSidebarOpen = false;
      this.isPatientDateModalOpen = false;

      this.patientScheduleSelected.emit({
        availability,
        slot: this.selectedSlot
      });

      return;
    }


    /*
    * PSICÓLOGA:
    * conserva el comportamiento actual.
    */
    this.isSidebarOpen =
      true;
  }

  showToast(
  message: string,
  type:
    'success'
    | 'error'
    | 'warning' = 'success'
): void {

  if (this.toastTimeout) {
    clearTimeout(
      this.toastTimeout
    );
  }

  this.toastMessage =
    message;

  this.toastType =
    type;

  this.toastVisible =
    true;

  this.toastTimeout =
    setTimeout(
      () => {

        this.toastVisible =
          false;

        this.toastTimeout =
          null;

        this.changeDetectorRef
          .detectChanges();

      },
      3500
    );
}

  onAppointmentSubmit(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const studentName = String(
      formData.get('studentName') ?? ''
    ).trim();

    const selectedStudent = this.selectedStudent;

    if (!selectedStudent) {

      this.showToast(
          'Busca y selecciona un alumno de la lista.',
          'warning'
  );      return;
    }

    const modality = String(
      formData.get('modality') ?? ''
    );

    const location = String(
      formData.get('location') ?? ''
    ).trim();

    const reason = String(
      formData.get('reason') ?? ''
    ).trim();

    const availability = this.selectedAvailability;

    if (!reason) {
      this.showToast(
        'Completa el motivo de la cita.',
        'warning'
      );
    }

    if (
      !availability ||
      !this.selectedSlotDate ||
      !this.selectedAvailabilityId ||
      this.selectedAvailabilityStatus !== 'Disponible'
    ) {
      this.showToast(
        'Selecciona primero un horario disponible.',
        'warning'
      );
      return;
    }

    if (
      modality !== 'In person' &&
      modality !== 'Online'
    ) {
      this.showToast(
        'Selecciona una modalidad válida.',
        'warning'
      );
      return;
    }

    if (modality === 'In person' && !location) {
      this.showToast(
        'Escribe la ubicación de la atención.',
        'warning'
      );
      return;
    }

    const selectedRange = this.selectedSlot.split(' - ');

    if (selectedRange.length !== 2) {
      this.showToast(
        'No se pudo interpretar el horario seleccionado.',
        'warning'
      );
      return;
    }

    const startTime = this.formatTime24Hour(
      selectedRange[0].trim()
    );

    const endTime = this.formatTime24Hour(
      selectedRange[1].trim()
    );

    const duration = availability.duration;

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      this.showToast(
        'La duración del horario no es válida.',
        'warning'
      );
      return;
    }

    const selectedStudentId = selectedStudent.id;
    const selectedStudentName = selectedStudent.name;

    this.calendarService.createAppointment({
      student_id: selectedStudentId,
      student_name: selectedStudentName,
      date: this.selectedSlotDate,
      start_time: startTime,
      end_time: endTime,
      duration,
      modality: modality as 'In person' | 'Online',
      location: modality === 'In person' ? location : undefined,
      reason
    }).subscribe({
     next: (response) => {
        console.log(
          'Cita registrada:',
          response
        );

        this.closeSidebar();
        this.showToast(
          'La cita se agendó correctamente.',
          'success'
        );

        this.refreshCalendarData();
      },
      error: (error) => {
        console.error('Error al guardar la cita:', error);

        const message =
          error?.error?.error ??
          'No fue posible guardar la cita. Inténtalo nuevamente.';

        this.showToast(message, 'error');
      }
    });
  }


  onStudentSearchChange(value: string): void {
    this.studentSearchText = value;
    this.selectedStudent = null;

    const search = value.trim();

    if (!search) {
      this.studentSearchResults = [];
      return;
    }

    this.calendarService.searchStudents(search).subscribe({
      next: (students) => {
        if (this.studentSearchText.trim() !== search) {
          return;
        }
        console.log('Respuesta de búsqueda:', students);
        console.log('¿Es un arreglo?', Array.isArray(students));
        this.studentSearchResults = students;
      },
      error: (error) => {
        console.error('Error al buscar alumnos:', error);
        this.studentSearchResults = [];
      }
    });
  }

  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.studentSearchText = student.name;
    this.studentSearchResults = [];
  }


  /* ============================================================
     SIDEBAR HU-03
     ============================================================ */


  closeSidebar(): void {

    this.isSidebarOpen =
      false;
  }


  openRescheduleModal(): void {

    this.isRescheduleModalOpen =
      true;
  }


  closeRescheduleModal(): void {

    this.isRescheduleModalOpen =
      false;
  }


  onRescheduleConfirm(
    data: any
  ): void {

    if (
      this.selectedAvailabilityId ===
      null
    ) {
      return;
    }

    let targetId = this.selectedAvailabilityId;
    if (targetId < 0 && this.selectedSlotDate) {
      const matched = this.availabilities.find(a =>
        a.date === this.selectedSlotDate &&
        a.id > 0 &&
        (this.selectedSlot ? this.getFormattedRange12h(a) === this.selectedSlot : true)
      );
      if (matched) {
        targetId = matched.id;
      }
    }

    this.calendarService
      .rescheduleAppointment(
        targetId,
        data.date,
        data.startTime,
        data.endTime
      )
      .subscribe({
        next: () => {
          this.closeRescheduleModal();
          this.closeSidebar();
          this.loadAvailabilities();
          this.showToast('Propuesta de reprogramación enviada correctamente.', 'success');
        },
        error: (error) => {
          console.error(
            'Error al reprogramar:',
            error
          );
          alert(error.error?.error || 'Error al enviar propuesta de reprogramación.');
        }
      });
  }


  openCancelModal(): void {

    this.isCancelModalOpen =
      true;
  }


  closeCancelModal(): void {

    this.isCancelModalOpen =
      false;
  }


  onCancelConfirm(
    data: any
  ): void {

    if (
      this.selectedAvailabilityId ===
      null
    ) {
      return;
    }


    this.calendarService
      .cancelAppointment(

        this.selectedAvailabilityId,

        data.reason,

        data.observation
      )
      .subscribe({

        next: () => {

          this.closeCancelModal();

          this.closeSidebar();

          this.loadAvailabilities();
        },

        error: (error) => {

          console.error(
            'Error al cancelar:',
            error
          );
        }

      });
  }

  onApproveReschedule(): void {
    if (this.selectedAvailabilityId === null) return;

    const req$ = this.selectedAvailabilityId < 0
      ? this.calendarService.approveReschedule(-this.selectedAvailabilityId)
      : this.calendarService.approveAvailabilityReschedule(this.selectedAvailabilityId);

    req$.subscribe({
      next: () => {
        this.closeSidebar();
        this.loadAvailabilities();
        this.showToast('Reprogramación aceptada con éxito', 'success');
      },
      error: (error) => {
        console.error('Error al aprobar reprogramación:', error);
        alert(error.error?.error || 'No se pudo aprobar la reprogramación.');
      }
    });
  }

  onRejectReschedule(): void {
    if (this.selectedAvailabilityId === null) return;

    const isAlumno =
      this.selectedRescheduleDetails?.rescheduleRequestedBy === 'alumno' ||
      this.selectedRescheduleDetails?.reschedule_requested_by === 'alumno';

    const confirmMsg = isAlumno
      ? '¿Rechazar la solicitud de cambio del alumno? La cita se mantendrá en su horario original.'
      : '¿Deseas cancelar esta propuesta de reprogramación?';

    if (!confirm(confirmMsg)) return;

    const req$ = this.selectedAvailabilityId < 0
      ? this.calendarService.rejectReschedule(-this.selectedAvailabilityId)
      : this.calendarService.rejectAvailabilityReschedule(this.selectedAvailabilityId);

    req$.subscribe({
      next: (res) => {
        this.closeSidebar();
        this.loadAvailabilities();
        if (res?.action === 'cancelled') {
          this.showToast('Propuesta cancelada. La cita ha sido cancelada.', 'warning');
        } else {
          this.showToast('Solicitud rechazada. La cita se mantiene en su horario original.', 'success');
        }
      },
      error: (error) => {
        console.error('Error al rechazar reprogramación:', error);
        alert(error.error?.error || 'No se pudo rechazar la reprogramación.');
      }
    });
  }


  /* ============================================================
     FECHA ACTUAL / SELECCIONADA
     ============================================================ */


  getSelectedDate(): Date {

    return new Date(
      this.selectedDate +
      'T00:00:00'
    );
  }


  getCurrentViewDate(): Date {

    if (this.selectedDate) {

      return this.getSelectedDate();
    }


    return this.currentDate;
  }


  /* ============================================================
     VISTA SEMANA
     ============================================================ */


  /*
   * Lógica interna lunes-domingo.
   */
  getWeekDays(): Date[] {

    const date =
      this.getCurrentViewDate();

    const dayOfWeek =
      date.getDay();

    const startOfWeek =
      new Date(date);


    if (dayOfWeek === 0) {

      startOfWeek.setDate(
        date.getDate() + 1
      );

    } else {

      const daysFromMonday =
        dayOfWeek - 1;

      startOfWeek.setDate(
        date.getDate() -
        daysFromMonday
      );
    }


    const days: Date[] = [];


    for (
      let index = 0;
      index < 7;
      index++
    ) {

      const day =
        new Date(startOfWeek);

      day.setDate(
        startOfWeek.getDate() +
        index
      );

      days.push(day);
    }


    return days;
  }


  /*
   * Mostrar visualmente la semana
   * completa de domingo a sábado.
   */
  getDisplayedWeekDays(): Date[] {

    const weekDays =
      this.getWeekDays();

    const sunday =
      new Date(
        weekDays[0]
      );

    sunday.setDate(
      sunday.getDate() - 1
    );


    return [
      sunday,
      ...weekDays.slice(0, 6)
    ];
  }


  /*
   * La cuadrícula semanal permanece
   * visible aunque no existan disponibilidades.
   */
  getWeekTimeRows(): string[] {
    const displayedDays = this.getDisplayedWeekDays();

    /*
     * Mantener siempre visible el rango base definido
     * en visualTimeRows, pero ampliar la cuadrícula
     * cuando existan citas, disponibilidades o
     * inhabilitaciones fuera de dicho rango.
     */
    const startHours: number[] =
      this.visualTimeRows.map(
        (time) =>
          Math.floor(
            this.timeToMinutes(time) / 60
          )
      );


    for (const day of displayedDays) {

      const dateString =
        this.formatDate(day);


      const merged =
        this.getMergedAvailabilitiesForDateString(
          dateString
        );


      for (
        const availability of merged
      ) {

        startHours.push(
          Math.floor(
            this.timeToMinutes(
              availability.startTime
            ) / 60
          )
        );
      }


      for (
        const disabled of
          this.getDisabledSchedulesForDate(
            day
          )
      ) {

        if (
          disabled.startTime
        ) {

          startHours.push(
            Math.floor(
              this.timeToMinutes(
                disabled.startTime
              ) / 60
            )
          );
        }
      }
    }


    const firstHour =
      Math.min(...startHours);

    const lastHour =
      Math.max(...startHours);


    const rows: string[] = [];


    for (
      let hour = firstHour;
      hour <= lastHour;
      hour++
    ) {

      rows.push(
        `${hour
          .toString()
          .padStart(2, '0')}:00`
      );
    }


    return rows;
  }


  /*
   * Posición vertical de un bloque dentro
   * de su fila horaria.
   *
   * Ejemplo:
   * 10:30 -> 50 % de la fila 10:00.
   */
  getWeekBlockTopPercent(
    startTime: string
  ): number {

    const startMinutes =
      this.timeToMinutes(
        startTime
      );

    const minutesInsideHour =
      startMinutes % 60;


    return (
      minutesInsideHour / 60
    ) * 100;
  }


  /*
   * Altura proporcional según la duración
   * real del bloque.
   */
  getWeekBlockHeightPercent(
    startTime: string,
    endTime: string
  ): number {

    const startMinutes =
      this.timeToMinutes(
        startTime
      );

    const endMinutes =
      this.timeToMinutes(
        endTime
      );


    const duration =
      Math.max(
        1,
        endMinutes -
        startMinutes
      );


    return (
      duration / 60
    ) * 100;
  }
  
  /*
   * Posición vertical de un slot generado
   * dentro de su fila horaria.
   */
  getWeekSlotTopPercent(
    slot: string
  ): number {

    const [
      startLabel
    ] = slot.split(' - ');


    if (!startLabel) {
      return 0;
    }


    return this.getWeekBlockTopPercent(
      this.formatTime24Hour(
        startLabel.trim()
      )
    );
  }


  /*
   * Altura proporcional de un slot
   * generado.
   */
  getWeekSlotHeightPercent(
    slot: string
  ): number {

    const [
      startLabel,
      endLabel
    ] = slot.split(' - ');


    if (
      !startLabel ||
      !endLabel
    ) {
      return 0;
    }


    return this.getWeekBlockHeightPercent(

      this.formatTime24Hour(
        startLabel.trim()
      ),

      this.formatTime24Hour(
        endLabel.trim()
      )
    );
  }


  /*
   * Para la vista Semana, devuelve únicamente
   * las inhabilitaciones que COMIENZAN en
   * esta fila.
   *
   * getDisabledForTimeCell() conserva la lógica
   * de traslape real para otras comprobaciones.
   */
  getDisabledStartingInTimeCell(
    date: Date,
    timeRow: string
  ): any[] {

    const rowStart =
      this.timeToMinutes(
        timeRow
      );

    const rowEnd =
      rowStart + 60;


    return this
      .getDisabledSchedulesForDate(
        date
      )
      .filter(
        (disabledSchedule) => {

          if (
            !disabledSchedule.startTime ||
            !disabledSchedule.endTime
          ) {
            return false;
          }


          const disabledStart =
            this.timeToMinutes(
              disabledSchedule.startTime
            );

          return (
            disabledStart >= rowStart &&
            disabledStart < rowEnd
          );
        }
      );
  }
  getSlotsForHour(
    availability: Availability,
    hour: string
  ): string[] {
    const hourStart = this.timeToMinutes(hour);
    const hourEnd = hourStart + 60;

    return this.generateSlots(availability).filter((slot) => {
      const [startLabel] = slot.split(' - ');
      if (!startLabel) {
        return false;
      }

      const slotStart = this.timeToMinutes(
        this.formatTime24Hour(startLabel.trim())
      );

      return slotStart >= hourStart && slotStart < hourEnd;
    });
  }


  getAvailableSlotsForHour(
    date: Date,
    hour: string
  ): Availability[] {
    if (

    this.statusFilter !== 'all' &&
    this.statusFilter !== 'Disponible'

    ) {
      return [];
    }

    const dateString = this.formatDate(date);

    return this.availabilities
      .filter((availability) => {
        if (
          availability.date !== dateString ||
          availability.status !== 'Disponible'
        ) {
          return false;
        }

        return this.getSlotsForHour(availability, hour).length > 0;
      })
      .sort(
        (first, second) =>

          this.timeToMinutes(
            first.startTime
          ) -
          this.timeToMinutes(
            second.startTime
          )
      );
  }


getBookedAvailabilitiesForHour(
  date: Date,
  hour: string
): Availability[] {

  /*
   * Los filtros administrativos solamente
   * aplican a la vista de la psicóloga.
   */
  if (
    this.mode === 'psychologist' &&
    this.statusFilter !== 'all' &&
    this.statusFilter !== 'Reservado' &&
    this.statusFilter !== 'Reprogramacion pendiente' &&
    this.statusFilter !== 'Cancelado'
  ) {
    return [];
  }


  const dateString =
    this.formatDate(date);

  const hourStart =
    this.timeToMinutes(hour);

  const hourEnd =
    hourStart + 60;


  return this
    .getMergedAvailabilitiesForDateString(
      dateString
    )
    .filter((availability) => {

      /*
       * Para paciente:
       * Reservado y Reprogramación pendiente
       * se consideran simplemente Ocupado.
       *
       * Cancelado no se muestra.
       */
      if (this.mode === 'patient') {

        const isOccupied =
          availability.status === 'Reservado' ||
          availability.status ===
            'Reprogramacion pendiente';

        if (!isOccupied) {
          return false;
        }

      } else {

        const isAdministrativeStatus =
          availability.status === 'Reservado' ||
          availability.status ===
            'Reprogramacion pendiente' ||
          availability.status === 'Cancelado';

        if (!isAdministrativeStatus) {
          return false;
        }


        if (
          this.statusFilter !== 'all' &&
          availability.status !==
            this.statusFilter
        ) {
          return false;
        }

      }


      const startMinutes =
        this.timeToMinutes(
          availability.startTime
        );

      return (
        startMinutes >= hourStart &&
        startMinutes < hourEnd
      );
    })
    .sort(
      (first, second) =>
        this.timeToMinutes(
          first.startTime
        ) -
        this.timeToMinutes(
          second.startTime
        )
    );
}

  getFormattedRange12h(
    availability: Availability
  ): string {
    return (
      `${this.formatTimeString(availability.startTime)} - ` +
      `${this.formatTimeString(availability.endTime)}`
    );
  }


  formatAvailabilityTime(
    time: string
  ): string {

    return time.substring(
      0,
      5
    );
  }



  getAvailabilityTimeRange(
    availability: Availability
  ): string {

    return (
      this.formatAvailabilityTime(
        availability.startTime
      )
      +
      ' - '
      +
      this.formatAvailabilityTime(
        availability.endTime
      )
    );
  }


  isToday(
    date: Date
  ): boolean {

    const today =
      new Date();


    return (

      date.getDate() ===
        today.getDate()

      &&

      date.getMonth() ===
        today.getMonth()

      &&

      date.getFullYear() ===
        today.getFullYear()
    );
  }


  getWeekdayLabel(
    date: Date
  ): string {

    const weekdays = [
      'DOM',
      'LUN',
      'MAR',
      'MIÉ',
      'JUE',
      'VIE',
      'SÁB'
    ];


    return weekdays[
      date.getDay()
    ];
  }


  /* ============================================================
     INFORMACIÓN DE DISPONIBILIDAD
     ============================================================ */


  hasAvailability(
    date: Date
  ): boolean {

    return (
      this.getAvailabilitiesForDate(
        date
      ).length > 0
    );
  }


  getAvailableCountForDate(
    date: Date
  ): number {

    if (
      this.statusFilter !==
        'all'
      &&
      this.statusFilter !==
        'Disponible'
    ) {

      return 0;
    }


    const dateString =
      this.formatDate(date);


    return this.availabilities
      .filter(
        (availability) =>

          availability.date ===
            dateString

          &&

          availability.status ===
            'Disponible'

          &&

          this.generateSlots(availability).length > 0
      )
      .length;
  }


  getReservedCountForDate(
    date: Date
  ): number {
    if (
      this.statusFilter !== 'all' &&
      this.statusFilter !== 'Reservado'
    ) {
      return 0;
    }

    const dateString = this.formatDate(date);

    return this.getMergedAvailabilitiesForDateString(dateString)
      .filter((availability) => availability.status === 'Reservado')
      .length;
  }


  getRescheduleCountForDate(
    date: Date
  ): number {
    if (
      this.statusFilter !== 'all' &&
      this.statusFilter !== 'Reprogramacion pendiente'
    ) {
      return 0;
    }

    const dateString = this.formatDate(date);

    return this.getMergedAvailabilitiesForDateString(dateString)
      .filter(
        (availability) =>
          availability.status === 'Reprogramacion pendiente'
      )
      .length;
  }


  getCancelledCountForDate(
    date: Date
  ): number {
    if (
      this.statusFilter !== 'all' &&
      this.statusFilter !== 'Cancelado'
    ) {
      return 0;
    }

    const dateString = this.formatDate(date);

    return this.getMergedAvailabilitiesForDateString(dateString)
      .filter(
        (availability) =>
          availability.status === 'Cancelado'
      )
      .length;
  }

  getPatientOccupiedCountForDate(
  date: Date
): number {

  const dateString =
    this.formatDate(date);

  return this
    .getMergedAvailabilitiesForDateString(
      dateString
    )
    .filter(
      (availability) =>
        availability.status === 'Reservado' ||
        availability.status ===
          'Reprogramacion pendiente'
    )
    .length;
}

  getAvailableSlots():
    Availability[] {

    return this.availabilities
      .filter(
        (availability) =>
          availability.status ===
            'Disponible' &&
          this.generateSlots(availability).length > 0
      );
  }


  isSelected(
    date: Date
  ): boolean {

    return (
      this.selectedDate ===
      this.formatDate(date)
    );
  }


  /* ============================================================
     GENERACIÓN LEGACY DE SLOTS
     ============================================================ */


  isSlotAvailable(
    availability: Availability,
    slot: string
  ): boolean {
    const [startLabel, endLabel] = slot.split(' - ');

    if (!startLabel || !endLabel) {
      return false;
    }

    const slotStart = this.timeToMinutes(
      this.formatTime24Hour(startLabel.trim())
    );

    const slotEnd = this.timeToMinutes(
      this.formatTime24Hour(endLabel.trim())
    );

    return !this.appointments.some((appointment) => {
      if (
        appointment.date !== availability.date ||
        appointment.status === 'Cancelled'
      ) {
        return false;
      }

      const appointmentStart = this.timeToMinutes(
        appointment.start_time
      );

      const appointmentEnd = this.timeToMinutes(
        appointment.end_time
      );

      return (
        slotStart < appointmentEnd &&
        slotEnd > appointmentStart
      );
    });
  }


  generateSlots( availability: Availability ): string[] {
    const slots: string[] = [];

    const dateAppointments =
      availability.status === 'Disponible'
        ? this.appointments.filter(
            (appointment) =>
              appointment.date === availability.date &&
              appointment.status !== 'Cancelled'
          )
        : [];

    const dateBookedAvailabilities =
      availability.status === 'Disponible'
        ? this.availabilities.filter(
            (item) =>
              item.date === availability.date &&
              item.id !== availability.id &&
              (item.status === 'Reservado' ||
                item.status === 'Reprogramacion pendiente')
          )
        : [];

    const dateDisabledSchedules =
      availability.status === 'Disponible'
        ? this.disabledSchedules.filter((disabledSchedule) => {
            const startDate =
              disabledSchedule.startDate || disabledSchedule.date;
            const rawEndDate =
              disabledSchedule.endDate || disabledSchedule.date || startDate;
            const endDate =
              disabledSchedule.type === 'Puntual' || rawEndDate < startDate
                ? startDate
                : rawEndDate;
            return (
              Boolean(startDate && endDate) &&
              availability.date >= startDate &&
              availability.date <= endDate
            );
          })
        : [];

    let currentMinutes = this.timeToMinutes(
      availability.startTime
    );

    const endMinutes = this.timeToMinutes(
      availability.endTime
    );

    while (
      currentMinutes + availability.duration <= endMinutes
    ) {
      const slotEndMinutes =
        currentMinutes + availability.duration;

      const overlapsAppointment = dateAppointments.some(
        (appointment) => {
          const appointmentStart = this.timeToMinutes(
            appointment.start_time
          );

          const appointmentEnd = this.timeToMinutes(
            appointment.end_time
          );

          return (
            currentMinutes < appointmentEnd &&
            slotEndMinutes > appointmentStart
          );
        }
      );

      const overlapsBookedAvailability =
        dateBookedAvailabilities.some((booked) => {
          const bookedStart = this.timeToMinutes(
            booked.startTime
          );
          const bookedEnd = this.timeToMinutes(booked.endTime);

          return (
            currentMinutes < bookedEnd &&
            slotEndMinutes > bookedStart
          );
        });

      const overlapsDisabledSchedule =
        dateDisabledSchedules.some((disabled) => {
          if (!disabled.startTime || !disabled.endTime) {
            return false;
          }
          const disabledStart = this.timeToMinutes(
            disabled.startTime
          );
          const disabledEnd = this.timeToMinutes(
            disabled.endTime
          );
          return (
            currentMinutes < disabledEnd &&
            slotEndMinutes > disabledStart
          );
        });

      if (
        !overlapsAppointment &&
        !overlapsBookedAvailability &&
        !overlapsDisabledSchedule
      ) {
        const slotStart = this.formatTime12Hour(
          currentMinutes
        );

        const slotEnd = this.formatTime12Hour(
          slotEndMinutes
        );

        slots.push(`${slotStart} - ${slotEnd}`);
      }

      currentMinutes +=
        availability.duration + availability.breakTime;
    }

    return slots;
  }



  private timeToMinutes(
    time: string
  ): number {

    const [
      hours,
      minutes
    ] =
      time
        .split(':')
        .map(Number);


    return (
      hours * 60 +
      minutes
    );
  }


  private minutesToTime(
    minutes: number
  ): string {

    const hours =
      Math.floor(
        minutes / 60
      );

    const remainingMinutes =
      minutes % 60;


    return (
      `${hours
        .toString()
        .padStart(2, '0')}:`
      +
      `${remainingMinutes
        .toString()
        .padStart(2, '0')}`
    );
  }


  formatTime12Hour(
    minutes: number
  ): string {

    const hours24 =
      Math.floor(
        minutes / 60
      );

    const minutesPart =
      minutes % 60;


    const period =
      hours24 >= 12
        ? 'PM'
        : 'AM';


    let hours12 =
      hours24 % 12;


    if (
      hours12 === 0
    ) {

      hours12 = 12;
    }


    return (
      `${String(hours12)
        .padStart(2, '0')}:`
      +
      `${String(minutesPart)
        .padStart(2, '0')} `
      +
      period
    );
  }


  formatTime24Hour(time: string): string {
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    }

    if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }



  private convert12to24(
    time12h: string
  ): string {

    const [
      time,
      modifier
    ] =
      time12h
        .trim()
        .split(' ');


    let [
      hours,
      minutes
    ] =
      time.split(':');


    let hour =
      parseInt(
        hours,
        10
      );


    if (
      hour === 12
    ) {

      hour = 0;
    }


    if (
      modifier === 'PM'
    ) {

      hour += 12;
    }


    return (
      `${String(hour)
        .padStart(2, '0')}:`
      +
      `${minutes}:00`
    );
  }


  formatTimeString(
    time: string
  ): string {

    const [
      hours,
      minutes
    ] =
      time
        .split(':')
        .map(Number);


    const totalMinutes =
      hours * 60 +
      minutes;


    return this.formatTime12Hour(
      totalMinutes
    );
  }


  /* ============================================================
     VISTA DÍA / DESCANSO HABITUAL
     ============================================================ */


  shouldShowHabitualBreakForCurrentDay():
    boolean {

    return this
      .doesHabitualBreakApplyToDay(
        this.getCurrentViewDate()
      );
  }


  getDayTimelineItems(
    date: Date
  ): Array<
    | {
        type: 'availability';
        startTime: string;
        availability: Availability;
      }
    | {
        type: 'habitualBreak';
        startTime: string;
      }
  > {

    const items: Array<
      | {
          type: 'availability';
          startTime: string;
          availability: Availability;
        }
      | {
          type: 'habitualBreak';
          startTime: string;
        }
    > = [];


    /*
     * Agregar disponibilidades
     * correspondientes al día.
     */
    for (
      const availability of
        this.getAvailabilitiesForDate(
          date
        )
    ) {

      if (this.mode === 'patient') {

        const visibleForPatient =
          availability.status === 'Disponible' ||
          availability.status === 'Reservado' ||
          availability.status === 'Reprogramacion pendiente';

          if (!visibleForPatient) {
            continue;
          }

        }

      items.push({

        type:
          'availability',

        startTime:
          availability.startTime,

        availability
      });
    }


    /*
     * Agregar descanso habitual únicamente
     * cuando corresponde a esa jornada y
     * el filtro no es exclusivo de reservados/reprogramación/inhabilitados.
     */
    if (
      (this.statusFilter === 'all' ||
        this.statusFilter === 'Disponible') &&
      this.doesHabitualBreakApplyToDay(
        date
      )
    ) {

      items.push({

        type:
          'habitualBreak',

        startTime:
          this.getHabitualBreakStartTime()
      });
    }


    /*
     * Orden cronológico.
     */
    items.sort(
      (
        first,
        second
      ) => {

        const timeDifference =

          this.timeToMinutes(
            first.startTime
          )

          -

          this.timeToMinutes(
            second.startTime
          );


        if (
          timeDifference !== 0
        ) {

          return timeDifference;
        }


        /*
         * Si comienzan a la misma hora,
         * colocar primero el descanso.
         */
        if (
          first.type ===
            'habitualBreak'
          &&
          second.type !==
            'habitualBreak'
        ) {

          return -1;
        }


        if (
          second.type ===
            'habitualBreak'
          &&
          first.type !==
            'habitualBreak'
        ) {

          return 1;
        }


        return 0;
      }
    );


    return items;
  }


  /* ============================================================
     HU-02B - HORARIOS INHABILITADOS
     ============================================================ */
getDisabledSchedulesForDate(
  date: Date
): any[] {

 /*
 * Los filtros administrativos solamente
 * afectan la agenda de la psicóloga.
 *
 * En la vista paciente los horarios
 * inhabilitados siempre deben poder
 * representarse.
 */
if (
  this.mode === 'psychologist' &&
  this.statusFilter !== 'all' &&
  this.statusFilter !== 'Inhabilitado'
) {
  return [];
}

  const dateString =
    this.formatDate(date);

  return this.disabledSchedules
    .filter(
      (disabledSchedule) => {

        const startDate =
          disabledSchedule.startDate ||
          disabledSchedule.date;

        const rawEndDate =
          disabledSchedule.endDate ||
          disabledSchedule.date ||
          startDate;

        const endDate =
          disabledSchedule.type === 'Puntual' ||
          rawEndDate < startDate
            ? startDate
            : rawEndDate;

        if (
          !startDate ||
          !endDate
        ) {
          return false;
        }

        return (
          dateString >= startDate &&
          dateString <= endDate
        );
      }
    );
}


  hasDisabledSchedule(
    date: Date
  ): boolean {

    return (
      this.getDisabledSchedulesForDate(
        date
      ).length > 0
    );
  }


  /*
   * Comprueba traslape real entre
   * inhabilitación y fila horaria.
   */
  getDisabledForTimeCell(
    date: Date,
    timeRow: string
  ): any[] {

    const rowStart =
      this.timeToMinutes(
        timeRow
      );

    const rowEnd =
      rowStart + 60;


    return this
      .getDisabledSchedulesForDate(
        date
      )
      .filter(
        (disabledSchedule) => {

          if (
            !disabledSchedule.startTime ||
            !disabledSchedule.endTime
          ) {

            return false;
          }


          const disabledStart =
            this.timeToMinutes(
              disabledSchedule.startTime
            );

          const disabledEnd =
            this.timeToMinutes(
              disabledSchedule.endTime
            );


          return (
            disabledStart < rowEnd
            &&
            disabledEnd > rowStart
          );
        }
      );
  }


  /*
   * Se conserva para compatibilidad
   * con HU-02B.
   */
  getAvailabilitiesForTimeCell(
    date: Date,
    timeRow: string
  ): Availability[] {

    const rowStart =
      this.timeToMinutes(
        timeRow
      );

    const rowEnd =
      rowStart + 60;


    return this
      .getAvailabilitiesForDate(
        date
      )
      .filter(
        (availability) => {

          const availabilityStart =
            this.timeToMinutes(
              availability.startTime
            );

          const availabilityEnd =
            this.timeToMinutes(
              availability.endTime
            );


          return (
            availabilityStart <
              rowEnd
            &&
            availabilityEnd >
              rowStart
          );
        }
      );
  }


  /* ============================================================
     HORARIO HABITUAL HU-02A
     ============================================================ */


  hasHabitualBreak(): boolean {

    const breakConfig =
      this.regularSchedule?.break;


    return Boolean(

      breakConfig?.enabled

      &&

      breakConfig.startTime

      &&

      breakConfig.endTime
    );
  }


   isRegularWorkDay(
    date: Date
  ): boolean {

    if (
      !this.regularSchedule
    ) {

      return false;
    }


    const javascriptDay =
      date.getDay();


    const dayOfWeek =
      javascriptDay === 0
        ? 7
        : javascriptDay;


    return this
      .regularSchedule
      .workDays
      .some(
        (day) =>
          day.dayOfWeek ===
          dayOfWeek
      );
  }


  doesHabitualBreakApplyToDay(
    date: Date
  ): boolean {

    if (
      !this.hasHabitualBreak()
      ||
      !this.regularSchedule
      ||
      !this.isInsideAvailabilityRange(
        date
      )
    ) {

      return false;
    }


    const javascriptDay =
      date.getDay();


    const dayOfWeek =
      javascriptDay === 0
        ? 7
        : javascriptDay;


    const workDay =
      this.regularSchedule
        .workDays
        .find(
          (day) =>
            day.dayOfWeek ===
            dayOfWeek
        );


    if (
      !workDay
    ) {

      return false;
    }


    const breakStart =
      this.getHabitualBreakStartTime();

    const breakEnd =
      this.getHabitualBreakEndTime();


    const workStart =
      workDay.startTime
        .slice(0, 5);

    const workEnd =
      workDay.endTime
        .slice(0, 5);


    return (
      breakStart >=
        workStart
      &&
      breakEnd <=
        workEnd
    );
  }


  private getAvailabilityRangeStartDate():
    Date | null {

    if (
      !this.regularSchedule?.updatedAt
    ) {

      return null;
    }


    const updatedAt =
      new Date(
        this.regularSchedule.updatedAt
      );


    if (
      Number.isNaN(
        updatedAt.getTime()
      )
    ) {

      return null;
    }


    /*
     * El backend genera el horario
     * usando America/Merida.
     */
    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone: 'America/Merida',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      )
        .formatToParts(
          updatedAt
        );


    const year =
      Number(
        parts.find(
          (part) =>
            part.type === 'year'
        )?.value
      );

    const month =
      Number(
        parts.find(
          (part) =>
            part.type === 'month'
        )?.value
      );

    const day =
      Number(
        parts.find(
          (part) =>
            part.type === 'day'
        )?.value
      );


    if (
      !year ||
      !month ||
      !day
    ) {

      return null;
    }


    return new Date(
      year,
      month - 1,
      day
    );
  }


  private getAvailabilityRangeEndDate():
    Date | null {

    if (
      !this.regularSchedule
    ) {

      return null;
    }


    const startDate =
      this.getAvailabilityRangeStartDate();


    if (
      !startDate
    ) {

      return null;
    }


    const value =
      this.regularSchedule
        .availabilityRangeValue;

    const unit =
      this.regularSchedule
        .availabilityRangeUnit;


    if (
      !Number.isInteger(value)
      ||
      value <= 0
    ) {

      return null;
    }


    if (
      unit === 'days'
    ) {

      const endDate =
        new Date(startDate);

      endDate.setDate(
        endDate.getDate() +
        value - 1
      );

      return endDate;
    }


    if (
      unit === 'weeks'
    ) {

      const endDate =
        new Date(startDate);

      endDate.setDate(
        endDate.getDate() +
        (value * 7) - 1
      );

      return endDate;
    }


    if (
      unit === 'months'
    ) {

      const sourceDay =
        startDate.getDate();

      const endDate =
        new Date(
          startDate.getFullYear(),
          startDate.getMonth() +
            value,
          1
        );

      const lastDay =
        new Date(
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          0
        ).getDate();

      endDate.setDate(
        Math.min(
          sourceDay,
          lastDay
        )
      );

      return endDate;
    }


    return null;
  }


  private isInsideAvailabilityRange(
    date: Date
  ): boolean {

    const startDate =
      this.getAvailabilityRangeStartDate();

    const endDate =
      this.getAvailabilityRangeEndDate();


    if (
      !startDate ||
      !endDate
    ) {

      return false;
    }


    const targetDate =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );


    return (
      targetDate >=
        startDate
      &&
      targetDate <=
        endDate
    );
  }
  isHabitualBreakSegmentStart(
    date: Date
  ): boolean {

    if (
      !this.doesHabitualBreakApplyToDay(
        date
      )
    ) {

      return false;
    }


    const days =
      this.getDisplayedWeekDays();


    const index =
      days.findIndex(
        (day) =>

          this.formatDate(day) ===
          this.formatDate(date)
      );


    if (
      index <= 0
    ) {

      return true;
    }


    return (
      !this.doesHabitualBreakApplyToDay(
        days[index - 1]
      )
    );
  }


  isHabitualBreakSegmentEnd(
    date: Date
  ): boolean {

    if (
      !this.doesHabitualBreakApplyToDay(
        date
      )
    ) {

      return false;
    }


    const days =
      this.getDisplayedWeekDays();


    const index =
      days.findIndex(
        (day) =>

          this.formatDate(day) ===
          this.formatDate(date)
      );


    if (
      index === -1
      ||
      index ===
        days.length - 1
    ) {

      return true;
    }


    return (
      !this.doesHabitualBreakApplyToDay(
        days[index + 1]
      )
    );
  }


  getHabitualBreakStartTime():
    string {

    return (
      this.regularSchedule
        ?.break
        .startTime
        ?.slice(0, 5)
      ??
      ''
    );
  }


  getHabitualBreakEndTime():
    string {

    return (
      this.regularSchedule
        ?.break
        .endTime
        ?.slice(0, 5)
      ??
      ''
    );
  }


  getHabitualBreakRange():
    string {

    if (
      !this.hasHabitualBreak()
    ) {

      return '';
    }


    return (
      `${this.getHabitualBreakStartTime()} - `
      +
      `${this.getHabitualBreakEndTime()}`
    );
  }


  getHabitualBreakDuration():
    number {

    if (
      !this.hasHabitualBreak()
    ) {

      return 0;
    }


    const start =
      this.timeToMinutes(
        this.getHabitualBreakStartTime()
      );

    const end =
      this.timeToMinutes(
        this.getHabitualBreakEndTime()
      );


    return Math.max(
      0,
      end - start
    );
  }


  isHabitualBreakRow(
    time: string
  ): boolean {

    if (
      !this.hasHabitualBreak() ||
      (this.statusFilter !== 'all' &&
        this.statusFilter !== 'Disponible')
    ) {

      return false;
    }


    const breakStart =
      this.timeToMinutes(
        this.getHabitualBreakStartTime()
      );


    const rowStart =
      this.timeToMinutes(
        time
      );

    const rowEnd =
      rowStart + 60;


    return (
      breakStart >=
        rowStart
      &&
      breakStart <
        rowEnd
    );
  }


  /* ============================================================
     SINCRONIZACIÓN / CARGA DE DATOS
     ============================================================ */


  private notifyCalendarDataChanged():
    void {

    this.calendarRenderVersion
      .update(
        (version) =>
          version + 1
      );

    this.changeDetectorRef.detectChanges();
  }



  loadAvailabilities(): void {
    this.calendarService.getAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data;

        this.calendarService.getAppointments().subscribe({
          next: (response) => {
            this.appointments = response.appointments;
            console.log('Citas recibidas:', this.appointments);
            this.notifyCalendarDataChanged();
          },
          error: (error) => {
            console.error('Error loading appointments:', error);
            this.appointments = [];
            this.notifyCalendarDataChanged();
          }
        });
      },
      error: (error) => {
        console.error('Error loading availabilities:', error);
      }
    });
  }



  loadDisabledSchedules(): void {

    this.calendarService
      .getDisabledSchedules()
      .subscribe({

        next: (data) => {

          this.disabledSchedules =
            data;

          this.notifyCalendarDataChanged();
        },

        error: (error) => {

          console.error(
            'Error loading disabled schedules:',
            error
          );
        }

      });
  }


  loadRegularSchedule(): void {

    this.regularScheduleService
      .getRegularSchedule()
      .subscribe({

        next: (schedule) => {

          this.regularSchedule =
            schedule;

          this.notifyCalendarDataChanged();
        },

        error: (error) => {

          console.error(
            'Error loading regular schedule:',
            error
          );
        }

      });
  }


  /*
   * Refresca de forma conjunta:
   *
   * HU-01/HU-03 -> availabilities
   * HU-02A -> regular schedule
   * HU-02B -> disabled schedules
   */

  refreshCalendarData(): void {
      forkJoin({
        availabilities:
          this.calendarService.getAvailabilities().pipe(
            catchError((err) => {
              console.error('Error loading availabilities:', err);
              return of([]);
            })
          ),

        schedule:
          this.regularScheduleService.getRegularSchedule().pipe(
            catchError((err) => {
              console.error('Error loading regular schedule:', err);
              return of(null);
            })
          ),

        disabledSchedules:
          this.calendarService.getDisabledSchedules().pipe(
            catchError((err) => {
              console.error('Error loading disabled schedules:', err);
              return of([]);
            })
          ),

        appointments:
          this.calendarService.getAppointments().pipe(
            catchError((err) => {
              console.error('Error loading appointments:', err);
              return of({ appointments: [] });
            })
          )
      })
      .subscribe({
        next: ({
          availabilities,
          schedule,
          disabledSchedules,
          appointments
        }) => {
          this.availabilities = availabilities;
          this.regularSchedule = schedule;
          this.disabledSchedules = disabledSchedules;
          this.appointments = appointments.appointments;

          this.notifyCalendarDataChanged();
        },

      error: (error) => {
          console.error(
            'Error al actualizar los datos del calendario:',
            error
          );
        }
    });
  }



  handleScheduleUpdated(
    _config: RegularScheduleConfig
  ): void {

    this.refreshCalendarData();
  }


  /* ============================================================
     CONSTRUCTOR / HIDRATACIÓN
     ============================================================ */


  constructor(

    private calendarService:
      CalendarService,

    private regularScheduleService:
      RegularScheduleService,

    private changeDetectorRef:
      ChangeDetectorRef,

    private authService:
      AuthService,

    private router:
      Router,

    @Inject(PLATFORM_ID)
    platformId: object

  ) {

    this.isBrowser =
      isPlatformBrowser(
        platformId
      );

      afterNextRender(
        
        () => {

    if (!this.isBrowser) {
      return;
    }


    /*
     * Primera carga del calendario.
     */
    this.refreshCalendarData();


    /*
     * Actualización cuando los cambios
     * ocurren dentro de la misma instancia
     * de Angular.
     */
    this.calendarService
      .scheduleChanged$
      .subscribe(
        () => {

          this.refreshCalendarData();

        }
      );


    /*
     * PACIENTE:
     *
     * Como la vista de la psicóloga y la
     * del paciente pueden estar abiertas
     * en pestañas, puertos o sesiones
     * diferentes, scheduleChanged$ no es
     * suficiente.
     *
     * Consultamos el backend cada 3 segundos.
     */
    if (
      this.mode === 'patient' &&
      this.patientRefreshInterval === null
    ) {

      this.patientRefreshInterval =
        setInterval(
          () => {

            this.refreshCalendarData();

          },
          3000
        );
    }

  }
);

  }

  ngOnDestroy(): void {

  /*
   * Detener la actualización automática
   * cuando se abandona la vista.
   */
  if (
    this.patientRefreshInterval !== null
  ) {

    clearInterval(
      this.patientRefreshInterval
    );

    this.patientRefreshInterval =
      null;
  }


  /*
   * Limpiar también el timeout
   * de las notificaciones.
   */
  if (
    this.toastTimeout !== null
  ) {

    clearTimeout(
      this.toastTimeout
    );

    this.toastTimeout =
      null;
  }
}


  /* ============================================================
     UTILIDADES
     ============================================================ */


  formatDate(
    date: Date
  ): string {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        date.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return (
      `${year}-${month}-${day}`
    );
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

}