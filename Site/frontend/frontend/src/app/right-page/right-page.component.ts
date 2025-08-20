import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-right-page',
  standalone: true,
  templateUrl: './right-page.component.html',
  styleUrls: ['./right-page.component.css'],
})
export class RightPageComponent implements OnInit {
  constructor(private router: Router, private title: Title) {}

  ngOnInit(): void {
    this.title.setTitle('direita');
  }

  goToLeft() {
    this.router.navigate(['/esquerda']);
  }
}
