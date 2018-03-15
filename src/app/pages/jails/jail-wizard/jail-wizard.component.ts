import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RestService, WebSocketService } from '../../../services';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Wizard } from '../../common/entity/entity-form/models/wizard.interface';
import { EntityWizardComponent } from '../../common/entity/entity-wizard/entity-wizard.component';
import * as _ from 'lodash';
import { JailService } from '../../../services/';
import { EntityUtils } from '../../common/entity/utils';
import { T } from '../../../translate-marker'

@Component({
  selector: 'jail-wizard',
  template: '<entity-wizard [conf]="this"></entity-wizard>',
  providers: [JailService]
})
export class JailWizardComponent {

  protected addWsCall = 'jail.create';
  public route_success: string[] = ['jails'];

  isLinear = true;
  firstFormGroup: FormGroup;

  protected wizardConfig: Wizard[] = [{
      label: 'Name the jail and choose a FreeBSD release.',
      fieldConfig: [{
          type: 'input',
          name: 'uuid',
          required: true,
          placeholder: T('Jails Name'),
          tooltip: T('Mandatory. Can only contain alphanumeric characters,\
 dashes (-), or underscores (_).'),
        },
        {
          type: 'select',
          name: 'release',
          required: true,
          placeholder: T('Release'),
          tooltip: T('Select the FreeBSD release to use as the jail\
 operating system.'),
          options: [],
        },
      ]
    },
    {
      label: 'Configure jail networking',
      fieldConfig: [{
          type: 'checkbox',
          name: 'dhcp',
          placeholder: T('IPv4 DHCP'),
          tooltip: T('Check this to automatically configure IPv4 settings\
 for the jail.'),
        },
        {
          type: 'input',
          name: 'ip4_addr',
          placeholder: T('IPv4 Address'),
          tooltip: T('This and the other IPv4 settings are grayed out if\
 <b>IPv4 DHCP</b> is checked. Enter a unique IP address that is in the\
 local network and not already used by any other computer.'),
          relation: [{
            action: 'DISABLE',
            when: [{
              name: 'dhcp',
              value: true,
            }]
          }]
        },
        {
          type: 'input',
          name: 'defaultrouter',
          placeholder: T('Default Router For IPv4'),
          tooltip: T('Enter the IPv4 route for the jail to use.'),
          relation: [{
            action: 'DISABLE',
            when: [{
              name: 'dhcp',
              value: true,
            }]
          }]
        },
        {
          type: 'input',
          name: 'ip6_addr',
          placeholder: T('IPv6 Address'),
          tooltip: T('This and other IPv6 settings are grayed out if\
 <b>IPv6 Autoconfigure</b> is checked; enter a unique IPv6 address that\
 is in the local network and not already used by any other computer'),
        },
        {
          type: 'input',
          name: 'defaultrouter6',
          placeholder: T('Default Router For IPv6'),
          tooltip: T('Enter the IPv6 route for the jail to use.'),
        },
        {
          type: 'checkbox',
          name: 'vnet',
          placeholder: T('Vnet'),
          tooltip: T('Check to have this jail use virtual networking.\
 <b>Warning:</b> Jails with virtual networking enabled can experience\
 instability. See the <a\
 href="http://iocage.readthedocs.io/en/latest/known-issues.html#vnet-vimage-issues"\
 target=_blank>iocage documentation</a> for more details.'),
          required: false,
          hasErrors: false,
          errors: '',
        }
      ]
    },
  ]

  protected releaseField: any;
  protected currentServerVersion: any;

  constructor(protected rest: RestService, protected ws: WebSocketService, protected jailService: JailService, ) {

  }

  preInit() {
    this.releaseField = _.find(this.wizardConfig[0].fieldConfig, { 'name': 'release' });
    this.ws.call('system.info').subscribe((res) => {
        this.currentServerVersion = Number(_.split(res.version, '-')[1]);
        this.jailService.getLocalReleaseChoices().subscribe((res_local) => {
          for (let j in res_local) {
            let rlVersion = Number(_.split(res_local[j], '-')[0]);
            if (this.currentServerVersion >= Math.floor(rlVersion)) {
              this.releaseField.options.push({ label: res_local[j] + '(fetched)', value: res_local[j] });
            }
          }
          this.jailService.getRemoteReleaseChoices().subscribe((res_remote) => {
            for (let i in res_remote) {
              if (_.indexOf(res_local, res_remote[i]) < 0) {
                let rmVersion = Number(_.split(res_remote[i], '-')[0]);
                if (this.currentServerVersion >= Math.floor(rmVersion)) {
                  this.releaseField.options.push({ label: res_remote[i], value: res_remote[i] });
                }
              }
            }
          });
        });
      },
      (res) => {
        new EntityUtils().handleError(this, res);
      });
  }

  afterInit(entityWizard: EntityWizardComponent) {
    ( < FormGroup > entityWizard.formArray.get([1]).get('dhcp')).valueChanges.subscribe((res) => {
      if (res) {
        ( < FormGroup > entityWizard.formArray.get([1])).controls['vnet'].setValue(true);
        _.find(this.wizardConfig[1].fieldConfig, { 'name': 'vnet' }).required = true;
      } else {
        _.find(this.wizardConfig[1].fieldConfig, { 'name': 'vnet' }).required = false;
      }
    });
    ( < FormGroup > entityWizard.formArray.get([1]).get('vnet')).valueChanges.subscribe((res) => {
      if (( < FormGroup > entityWizard.formArray.get([1])).controls['dhcp'].value && !res) {
        _.find(this.wizardConfig[1].fieldConfig, { 'name': 'vnet' }).hasErrors = true;
        _.find(this.wizardConfig[1].fieldConfig, { 'name': 'vnet' }).errors = 'Vnet is required';
      } else {
        _.find(this.wizardConfig[1].fieldConfig, { 'name': 'vnet' }).hasErrors = false;
        _.find(this.wizardConfig[1].fieldConfig, { 'name': 'vnet' }).errors = '';
      }
    });
  }

  beforeSubmit(value) {
    let property: any = [];

    for (let i in value) {
      if (value.hasOwnProperty(i)) {
        if (value[i] == undefined) {
          delete value[i];
        } else {
          if (i == 'dhcp' || i == 'vnet') {
            if (i == 'dhcp') {
              property.push('bpf=yes');
            }

            if (value[i]) {
              property.push(i + '=on');
            } else {
              property.push(i + '=off');
            }
            delete value[i];
          } else {
            if (i != 'uuid' && i != 'release') {
              property.push(i + '=' + value[i]);
              delete value[i];
            }
          }
        }
      }
    }
    value['props'] = property;

    return value;
  }
}
