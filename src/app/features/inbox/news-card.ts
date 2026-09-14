import { Component, input, output } from '@angular/core';
import { PlatformNews } from '../../core/inbox-store';

@Component({
  selector: 'app-news-card',
  standalone: true,
  templateUrl: './news-card.html',
})
export class NewsCard {
  readonly news = input.required<PlatformNews>();
  readonly read = output<string>();

  protected open() {
    if (this.news().unread) {
      this.read.emit(this.news().id);
    }
  }
}
