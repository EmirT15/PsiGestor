import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.html',
  styleUrl: './button.css'
})
export class Button {
  @Input() texto: string = 'Botón';

  @Output() presionado = new EventEmitter<void>();
}