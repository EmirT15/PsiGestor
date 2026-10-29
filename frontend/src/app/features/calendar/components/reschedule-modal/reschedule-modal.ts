import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RescheduleData {
  studentName: string;
  studentInfo: string;
  modality: string;
  currentDate: string;
  currentTime: string;
}

@Component({
  selector: 'app-reschedule-modal',
  imports: [CommonModule],
  templateUrl: './reschedule-modal.html',
  styleUrl: './reschedule-modal.css',
})
export class RescheduleModal {
  @Input() data!: RescheduleData;
  @Input() availableSlots: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<any>();

  selectedSlotId: number | null = null;

  closeModal(): void {
    this.close.emit();
  }

  submit(): void {
    if (!this.selectedSlotId) return;
    
    const slot = this.availableSlots.find(s => s.id === Number(this.selectedSlotId));
    if (slot) {
      this.confirm.emit({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime
      });
    }
  }
}
