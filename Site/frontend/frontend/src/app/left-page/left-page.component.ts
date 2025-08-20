import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-left-page',
  standalone: true,
  templateUrl: './left-page.component.html',
  styleUrls: ['./left-page.component.css'],
})
export class LeftPageComponent implements OnInit {
  constructor(private router: Router, private title: Title) {}

  ngOnInit(): void {
    this.title.setTitle('esquerda');
  }

  goToRight() {
    this.router.navigate(['/direita']);
  }
}
