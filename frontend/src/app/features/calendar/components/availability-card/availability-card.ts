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

}