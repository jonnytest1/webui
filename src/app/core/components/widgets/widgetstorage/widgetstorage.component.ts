import {
  Component, AfterViewInit, OnDestroy, Input, ChangeDetectorRef, OnChanges, SimpleChanges,
} from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { Pool } from 'app/interfaces/pool.interface';
import { T } from 'app/translate-marker';

@UntilDestroy()
@Component({
  selector: 'widget-storage',
  templateUrl: './widgetstorage.component.html',
  styleUrls: ['./widgetstorage.component.scss'],
})
export class WidgetStorageComponent extends WidgetComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() pools: Pool[];
  @Input() volumeData: any;
  title: string = T('Storage');

  padding = 7;
  cols = 2;
  gap = 7;
  contentHeight = 400 - 56;
  rowHeight = 150;

  constructor(public router: Router, public translate: TranslateService, private cdr: ChangeDetectorRef) {
    super(translate);
    this.configurable = false;
  }

  ngAfterViewInit(): void {
    throw new Error('Method not implemented.');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes) {
      const poolCount = this.pools.length;
      if (poolCount <= 2) {
        this.cols = 1;
        this.padding = 15;
        this.gap = 15;
      } else if (poolCount <= 4) {
        this.cols = 2;
        this.padding = 7;
        this.gap = 7;
      } else {
        this.cols = 2;
        this.padding = 3;
        this.gap = 3;
      }

      const rows = Math.round(poolCount / this.cols);
      this.rowHeight = (this.contentHeight - (rows - 1) * this.gap - 2 * this.padding) / rows;
    }
  }

  ngOnDestroy(): void {
    this.core.unregister({ observerClass: this });
  }
}
