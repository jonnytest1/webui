import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs/operators';
import { helptextSystemAdvanced } from 'app/helptext/system/advanced';
import { SystemGeneralConfig } from 'app/interfaces/system-config.interface';
import { WebsocketError } from 'app/interfaces/websocket-error.interface';
import { AppTableAction, AppTableConfig } from 'app/modules/entity/table/table.component';
import { AdvancedSettingsService } from 'app/pages/system/advanced/advanced-settings.service';
import {
  AllowedAddressesFormComponent,
} from 'app/pages/system/advanced/allowed-addresses/allowed-addresses-form/allowed-addresses-form.component';
import { DialogService } from 'app/services/dialog.service';
import { ErrorHandlerService } from 'app/services/error-handler.service';
import { IxSlideInService } from 'app/services/ix-slide-in.service';
import { WebSocketService } from 'app/services/ws.service';
import { AppState } from 'app/store';
import { generalConfigUpdated } from 'app/store/system-config/system-config.actions';

interface AllowedAddressRow {
  address: string;
}

@UntilDestroy()
@Component({
  selector: 'ix-allowed-addresses-card',
  styleUrls: ['../../common-card.scss'],
  templateUrl: './allowed-addresses-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowedAddressesCardComponent {
  readonly tableConfig: AppTableConfig = {
    title: helptextSystemAdvanced.fieldset_addresses,
    queryCall: 'system.general.config',
    emptyEntityLarge: false,
    columns: [
      { name: this.translate.instant('Address'), prop: 'address' },
    ],
    dataSourceHelper: this.addressesSourceHelper.bind(this),
    getActions: (): AppTableAction<AllowedAddressRow>[] => {
      return [
        {
          name: 'delete_allowed_address',
          icon: 'delete',
          matTooltip: this.translate.instant('Delete Allowed Address'),
          onClick: (row: AllowedAddressRow): void => {
            this.dialog
              .confirm({
                title: this.translate.instant('Delete Allowed Address'),
                message: this.translate.instant('Are you sure you want to delete address {ip}?', { ip: row.address }),
              })
              .pipe(
                filter(Boolean),
                untilDestroyed(this),
              ).subscribe({
                next: () => this.deleteAllowedAddress(row),
                error: (err: WebsocketError) => this.dialog.error(this.errorHandler.parseWsError(err)),
              });
          },
        },
      ];
    },
    tableActions: [
      {
        label: this.translate.instant('Configure'),
        onClick: async () => {
          await this.advancedSettings.showFirstTimeWarningIfNeeded();
          const slideInRef = this.slideInService.open(AllowedAddressesFormComponent);
          slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => {
            this.tableConfig.tableComponent?.getData();
          });
        },
      },
    ],
  };

  constructor(
    private ws: WebSocketService,
    private store$: Store<AppState>,
    private dialog: DialogService,
    private slideInService: IxSlideInService,
    private errorHandler: ErrorHandlerService,
    private translate: TranslateService,
    private advancedSettings: AdvancedSettingsService,
  ) {}

  private addressesSourceHelper(data: SystemGeneralConfig): AllowedAddressRow[] {
    return data.ui_allowlist.map((ip) => ({ address: ip }));
  }

  private deleteAllowedAddress(row: AllowedAddressRow): void {
    this.ws.call('system.general.config').pipe(
      switchMap((config) => {
        const addresses = config.ui_allowlist.filter((ip) => ip !== row.address);
        return this.ws.call('system.general.update', [{ ui_allowlist: addresses }]);
      }),
      untilDestroyed(this),
    ).subscribe({
      next: () => {
        this.store$.dispatch(generalConfigUpdated());
        this.tableConfig.tableComponent?.getData();
      },
      error: (err: WebsocketError) => this.dialog.error(this.errorHandler.parseWsError(err)),
    });
  }
}
