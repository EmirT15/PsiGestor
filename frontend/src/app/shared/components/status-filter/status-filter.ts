import { Component, EventEmitter, Input, Output } from '@angular/core';

export type StatusFilter =
  | 'all'
  | 'Disponible'
  | 'Reservado'
  | 'Reprogramacion pendiente'
  | 'Inhabilitado';

@Component({
  selector: 'app-status-filter',
  imports: [],
  templateUrl: './status-filter.html',
  styleUrl: './status-filter.css',
})
export class StatusFilterComponent {

  @Input() selectedStatus: StatusFilter = 'all';

  @Output() statusChange = new EventEmitter<StatusFilter>();

  selectStatus(status: StatusFilter): void {
    this.statusChange.emit(status);
  }
}