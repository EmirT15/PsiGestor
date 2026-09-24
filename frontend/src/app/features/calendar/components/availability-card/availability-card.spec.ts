import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailabilityCard } from './availability-card';

describe('AvailabilityCard', () => {
  let component: AvailabilityCard;
  let fixture: ComponentFixture<AvailabilityCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailabilityCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AvailabilityCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
