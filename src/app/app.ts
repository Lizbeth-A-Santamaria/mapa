import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { MapComponent } from './components/map/map';

@Component({
  selector: 'app-root',
  imports: [HttpClientModule, MapComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
