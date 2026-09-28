import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Availability } from '../../models/availability.model';

@Component({
  selector: 'app-availability-card',
  imports: [],
  templateUrl: './availability-card.html',
  styleUrl: './availability-card.css',
})
export class AvailabilityCard {

  @Input() availability!: Availability;
  @Input() slots: string[] = [];
  @Input() selectedSlot = '';
  @Output() slotSelected = new EventEmitter<string>();
  @Input() selectedAvailabilityId: number | null = null;

  formatTimeString(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);

    const totalMinutes = hours * 60 + minutes;

    const period = hours >= 12 ? 'PM' : 'AM';

    let hours12 = hours % 12;

    if (hours12 === 0) {
      hours12 = 12;
    }

    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }

}