import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  StatusFilter,
  StatusFilterComponent
} from '../../../../shared/components/status-filter/status-filter';

@Component({
  selector: 'app-calendar-toolbar',
  imports: [StatusFilterComponent],
  templateUrl: './calendar-toolbar.html',
  styleUrl: './calendar-toolbar.css',
})
export class CalendarToolbar {

  @Input() currentDate = new Date();

  @Input() currentView: 'day' | 'week' | 'month' = 'week';

  @Input() selectedStatus: StatusFilter = 'all';


  @Output() previous = new EventEmitter<void>();

  @Output() next = new EventEmitter<void>();

  @Output() today = new EventEmitter<void>();

  @Output() viewChange =
    new EventEmitter<'day' | 'week' | 'month'>();

  @Output() statusChange =
    new EventEmitter<StatusFilter>();


  changeView(view: 'day' | 'week' | 'month'): void {
    this.viewChange.emit(view);
  }


  getPeriodLabel(): string {

    if (this.currentView === 'day') {

      return this.currentDate.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

    }


    if (this.currentView === 'week') {

      const date = new Date(this.currentDate);

      const dayOfWeek = date.getDay();

      const daysFromMonday =
        dayOfWeek === 0 ? 6 : dayOfWeek - 1;


      const startOfWeek = new Date(date);

      startOfWeek.setDate(
        date.getDate() - daysFromMonday
      );


      const endOfWeek = new Date(startOfWeek);

      endOfWeek.setDate(
        startOfWeek.getDate() + 4
      );


      const startLabel =
        startOfWeek.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short'
        });


      const endLabel =
        endOfWeek.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });


      return `${startLabel} – ${endLabel}`;
    }


    return this.currentDate.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric'
    });

  }

}