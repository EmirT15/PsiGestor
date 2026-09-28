import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CancelModalData {
  folio: string;
  dateStr: string;
  timeStr: string;
  originalReason: string;
}

@Component({
  selector: 'app-cancel-modal',
  imports: [CommonModule],
  templateUrl: './cancel-modal.html',
  styleUrl: './cancel-modal.css',
})
export class CancelModal {
  @Input() data!: CancelModalData;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<any>();

  selectedReason: string = 'alumno';
  observation: string = 'Estudiante reporta cita médica impostergable fuera de la institución.';

  closeModal(): void {
    this.close.emit();
  }

  submit(): void {
    this.confirm.emit({
      reason: this.selectedReason,
      observation: this.observation
    });
    this.close.emit();
  }
}
