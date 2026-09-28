import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegularSchedule } from './regular-schedule';

describe('RegularSchedule', () => {
  let component: RegularSchedule;
  let fixture: ComponentFixture<RegularSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegularSchedule],
    }).compileComponents();

    fixture = TestBed.createComponent(RegularSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
