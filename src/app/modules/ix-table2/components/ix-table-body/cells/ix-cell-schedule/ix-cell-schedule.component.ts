import { Component } from '@angular/core';
import { Column, ColumnComponent } from 'app/modules/ix-table2/interfaces/table-column.interface';

@Component({
  templateUrl: './ix-cell-schedule.component.html',
})
export class IxCellScheduleComponent<T> extends ColumnComponent<T> {
  get value(): T[keyof T] {
    return this.row[this.propertyName];
  }
}

export function scheduleColumn<T>(options: Partial<IxCellScheduleComponent<T>>): Column<T, IxCellScheduleComponent<T>> {
  return { type: IxCellScheduleComponent, ...options };
}
