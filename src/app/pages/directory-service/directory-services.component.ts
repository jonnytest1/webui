import { CdkAccordionItem } from '@angular/cdk/accordion';
import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import {
  forkJoin, of, Observable,
} from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { DirectoryServiceState } from 'app/enums/directory-service-state.enum';
import { IdmapName } from 'app/enums/idmap.enum';
import helptext from 'app/helptext/directory-service/dashboard';
import idmapHelptext from 'app/helptext/directory-service/idmap';
import { EmptyConfig } from 'app/interfaces/empty-config.interface';
import { Idmap } from 'app/interfaces/idmap.interface';
import { KerberosKeytab } from 'app/interfaces/kerberos-config.interface';
import { KerberosRealm } from 'app/interfaces/kerberos-realm.interface';
import { Option } from 'app/interfaces/option.interface';
import { AppTableConfig } from 'app/modules/entity/table/table.component';
import { AppLoaderService } from 'app/modules/loader/app-loader.service';
import { ActiveDirectoryComponent } from 'app/pages/directory-service/components/active-directory/active-directory.component';
import { IdmapFormComponent } from 'app/pages/directory-service/components/idmap-form/idmap-form.component';
import { KerberosKeytabsFormComponent } from 'app/pages/directory-service/components/kerberos-keytabs/kerberos-keytabs-form/kerberos-keytabs-form.component';
import { KerberosSettingsComponent } from 'app/pages/directory-service/components/kerberos-settings/kerberos-settings.component';
import { requiredIdmapDomains } from 'app/pages/directory-service/utils/required-idmap-domains.utils';
import { DialogService } from 'app/services/dialog.service';
import { IdmapService } from 'app/services/idmap.service';
import { IxSlideInService } from 'app/services/ix-slide-in.service';
import { WebSocketService } from 'app/services/ws.service';
import { KerberosRealmsFormComponent } from './components/kerberos-realms-form/kerberos-realms-form.component';
import { LdapComponent } from './components/ldap/ldap.component';

interface DataCard {
  title: string;
  items: Option[];
  onSettingsPressed: () => void;
}

@UntilDestroy()
@Component({
  templateUrl: './directory-services.component.html',
  styleUrls: ['./directory-services.component.scss'],
})
export class DirectoryServicesComponent implements OnInit {
  isActiveDirectoryEnabled = false;
  isLdapEnabled = false;

  activeDirectoryDataCard: DataCard;
  ldapDataCard: DataCard;
  kerberosSettingsDataCard: DataCard;

  idmapTableConf: AppTableConfig<this> = {
    title: helptext.idmap.title,
    titleHref: '/directoryservice/idmap',
    queryCall: 'idmap.query',
    emptyEntityLarge: false,
    parent: this,
    columns: [
      { name: this.translate.instant('Name'), prop: 'name' },
      { name: this.translate.instant('Backend'), prop: 'idmap_backend' },
      { name: this.translate.instant('DNS Domain Name'), prop: 'dns_domain_name' },
      { name: this.translate.instant('Range Low'), prop: 'range_low' },
      { name: this.translate.instant('Range High'), prop: 'range_high' },
      { name: this.translate.instant('Certificate'), prop: 'cert_name' },

    ],
    add: () => {
      this.ensureActiveDirectoryIsEnabledForIdmap()
        .pipe(untilDestroyed(this))
        .subscribe(() => {
          const slideInRef = this.slideInService.open(IdmapFormComponent);
          slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
        });
    },
    edit: (row: Idmap) => {
      const slideInRef = this.slideInService.open(IdmapFormComponent, { data: row });
      slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
    },
    getActions: () => {
      return [
        {
          id: 'delete',
          label: this.translate.instant('Delete'),
          name: 'delete',
          icon: 'delete',
          onClick: (row: Idmap) => {
            this.dialog.confirm({
              title: this.translate.instant('Delete'),
              message: this.translate.instant('Are you sure you want to delete this idmap?'),
            }).pipe(
              filter(Boolean),
              switchMap(() => {
                return this.ws.call('idmap.delete', [row.id]).pipe(this.loader.withLoader());
              }),
              untilDestroyed(this),
            ).subscribe(() => {
              this.refreshTables();
            });
          },
        },
      ];
    },
    isActionVisible(actionId: string, row: Idmap) {
      if (actionId === 'delete' && requiredIdmapDomains.includes(row.name as IdmapName)) {
        return false;
      }

      return true;
    },

  };

  kerberosRealmsTableConf: AppTableConfig<this> = {
    title: helptext.kerberosRealms.title,
    titleHref: '/directoryservice/kerberosrealms',
    queryCall: 'kerberos.realm.query',
    deleteCall: 'kerberos.realm.delete',
    deleteMsg: {
      title: helptext.kerberosRealms.title,
      key_props: ['realm'],
    },
    emptyEntityLarge: false,
    parent: this,
    columns: [
      { name: this.translate.instant('Realm'), prop: 'realm' },
      { name: this.translate.instant('KDC'), prop: 'kdc' },
      { name: this.translate.instant('Admin Server'), prop: 'admin_server' },
      { name: this.translate.instant('Password Server'), prop: 'kpasswd_server' },
    ],
    add: () => {
      const slideInRef = this.slideInService.open(KerberosRealmsFormComponent);
      slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
    },
    edit: (realm: KerberosRealm) => {
      const slideInRef = this.slideInService.open(KerberosRealmsFormComponent, { data: realm });
      slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
    },
  };

  kerberosKeytabTableConf: AppTableConfig<this> = {
    title: helptext.kerberosKeytab.title,
    titleHref: '/directoryservice/kerberoskeytabs',
    queryCall: 'kerberos.keytab.query',
    deleteCall: 'kerberos.keytab.delete',
    deleteMsg: {
      title: helptext.kerberosKeytab.title,
      key_props: ['name'],
    },
    emptyEntityLarge: false,
    parent: this,
    columns: [
      { name: 'Name', prop: 'name' },
    ],
    add: () => {
      const slideInRef = this.slideInService.open(KerberosKeytabsFormComponent);
      slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
    },
    edit: (row: KerberosKeytab) => {
      const slideInRef = this.slideInService.open(KerberosKeytabsFormComponent, { data: row });
      slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
    },
  };

  readonly noDirectoryServicesConfig: EmptyConfig = {
    title: this.translate.instant('Active Directory and LDAP are disabled.'),
    message: this.translate.instant('Only one can be active at a time.'),
    large: true,
    icon: 'account-box',
  };

  constructor(
    private ws: WebSocketService,
    private idmapService: IdmapService,
    private slideInService: IxSlideInService,
    private dialog: DialogService,
    private loader: AppLoaderService,
    private translate: TranslateService,
  ) {
  }

  ngOnInit(): void {
    this.refreshCards();
  }

  refreshCards(): void {
    forkJoin([
      this.ws.call('directoryservices.get_state'),
      this.ws.call('activedirectory.config'),
      this.ws.call('ldap.config'),
      this.ws.call('kerberos.config'),
    ])
      .pipe(this.loader.withLoader(), untilDestroyed(this))
      .subscribe(([servicesState, activeDirectoryConfig, ldapConfig, kerberosSettings]) => {
        this.isActiveDirectoryEnabled = servicesState.activedirectory !== DirectoryServiceState.Disabled;
        this.isLdapEnabled = servicesState.ldap !== DirectoryServiceState.Disabled;

        this.activeDirectoryDataCard = {
          title: helptext.activeDirectory.title,
          items: [
            {
              label: helptext.activeDirectory.status,
              value: servicesState.activedirectory,
            },
            {
              label: helptext.activeDirectory.domainName,
              value: activeDirectoryConfig?.domainname || null,
            },
            {
              label: helptext.activeDirectory.domainAccountName,
              value: activeDirectoryConfig?.bindname || null,
            },
          ],
          onSettingsPressed: () => this.openActiveDirectoryForm(),
        };
        this.ldapDataCard = {
          title: helptext.ldap.title,
          items: [
            {
              label: helptext.ldap.status,
              value: servicesState.ldap,
            },
            {
              label: helptext.ldap.hostname,
              value: ldapConfig ? ldapConfig.hostname.join(',') : null,
            },
            {
              label: helptext.ldap.baseDN,
              value: ldapConfig?.basedn || null,
            },
            {
              label: helptext.ldap.bindDN,
              value: ldapConfig?.binddn || null,
            },
          ],
          onSettingsPressed: () => this.openLdapForm(),
        };
        this.kerberosSettingsDataCard = {
          title: helptext.kerberosSettings.title,
          items: [
            {
              label: helptext.kerberosSettings.appdefaults,
              value: kerberosSettings?.appdefaults_aux || null,
            },
            {
              label: helptext.kerberosSettings.libdefaults,
              value: kerberosSettings?.libdefaults_aux || null,
            },
          ],
          onSettingsPressed: () => this.openKerberosSettingsForm(),
        };

        if (this.isLdapEnabled) {
          this.idmapTableConf.queryCallOption = [[['name', '=', IdmapName.DsTypeLdap]]];
        } else if (this.isActiveDirectoryEnabled) {
          this.idmapTableConf.queryCallOption = [[['name', '!=', IdmapName.DsTypeLdap]]];
        } else {
          this.idmapTableConf.queryCallOption = undefined;
        }

        this.refreshTables();
      });
  }

  onAdvancedSettingsOpened(expansionPanel: CdkAccordionItem): void {
    // Immediately show additional setting, so that user knows what they are.
    expansionPanel.open();
    this.dialog.confirm({
      title: helptext.advancedEdit.title,
      hideCheckbox: true,
      message: helptext.advancedEdit.message,
    })
      .pipe(filter((confirmed) => !confirmed), untilDestroyed(this))
      .subscribe(() => {
        // Hide settings back, if user cancels.
        expansionPanel.close();
      });
  }

  openActiveDirectoryForm(): void {
    const slideInRef = this.slideInService.open(ActiveDirectoryComponent, { wide: true });
    slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
  }

  openLdapForm(): void {
    const slideInRef = this.slideInService.open(LdapComponent, { wide: true });
    slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
  }

  openKerberosSettingsForm(): void {
    const slideInRef = this.slideInService.open(KerberosSettingsComponent);
    slideInRef.slideInClosed$.pipe(untilDestroyed(this)).subscribe(() => this.refreshCards());
  }

  refreshTables(): void {
    [this.kerberosRealmsTableConf, this.idmapTableConf, this.kerberosKeytabTableConf].forEach((config) => {
      if (config.tableComponent) {
        config.tableComponent.getData();
      }
    });
  }

  /**
   * All this does is provide correct typing in ng-template
   */
  typeCard(card: DataCard): DataCard {
    return card;
  }

  private ensureActiveDirectoryIsEnabledForIdmap(): Observable<boolean> {
    return this.idmapService.getActiveDirectoryStatus().pipe(
      switchMap((adConfig) => {
        if (adConfig.enable) {
          return of(true);
        }

        return this.dialog.confirm({
          title: idmapHelptext.idmap.enable_ad_dialog.title,
          message: idmapHelptext.idmap.enable_ad_dialog.message,
          hideCheckbox: true,
          buttonText: idmapHelptext.idmap.enable_ad_dialog.button,
        })
          .pipe(
            filter((confirmed) => confirmed),
            switchMap(() => {
              this.openActiveDirectoryForm();
              return of(false);
            }),
          );
      }),
      filter((canContinue) => canContinue),
    );
  }
}
