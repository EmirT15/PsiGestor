import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarToolbar } from './calendar-toolbar';

describe('CalendarToolbar', () => {
  let component: CalendarToolbar;
  let fixture: ComponentFixture<CalendarToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarToolbar],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
