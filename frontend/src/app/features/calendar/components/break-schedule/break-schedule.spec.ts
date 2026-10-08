import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakSchedule } from './break-schedule';

describe('BreakSchedule', () => {
  let component: BreakSchedule;
  let fixture: ComponentFixture<BreakSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreakSchedule],
    }).compileComponents();

    fixture = TestBed.createComponent(BreakSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
