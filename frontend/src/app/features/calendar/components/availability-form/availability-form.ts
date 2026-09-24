import { Component, EventEmitter, Output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-availability-form',
  styleUrl: './availability-form.css',
  templateUrl: './availability-form.html',
})
export class AvailabilityForm {

  availabilityForm;
  errorMessage = '';
  @Output() availabilityCreated = new EventEmitter<void>();

  constructor(
    private formBuilder: FormBuilder,
    private calendarService: CalendarService
  ) {
    this.availabilityForm = this.formBuilder.group({
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      duration: [50, [Validators.required, Validators.min(1)]],
      breakTime: [10, [Validators.required, Validators.min(0)]],
    });
  }

  submit(): void {
  if (this.availabilityForm.invalid) {
    return;
  }

  const startTime = this.availabilityForm.value.startTime ?? '';
const endTime = this.availabilityForm.value.endTime ?? '';

  if (startTime >= endTime) {
    this.errorMessage = 'La hora de inicio debe ser anterior a la hora de fin.';
    return;
  }

  this.calendarService.createAvailability(
    this.availabilityForm.value as {
      date: string;
      startTime: string;
      endTime: string;
      duration: number;
      breakTime: number;
    }
  ).subscribe({
    next: (data) => {
      console.log('Disponibilidad creada:', data);
      this.availabilityCreated.emit();
    },
    error: (error) => {
      console.error('Error al crear disponibilidad:', error);
    }
  });
}
}