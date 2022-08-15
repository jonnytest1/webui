import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  BaseAlertServiceForm,
} from 'app/pages/system/alert-service/alert-service/alert-services/base-alert-service-form';

@Component({
  templateUrl: './slack-service.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlackServiceComponent extends BaseAlertServiceForm {
  form = this.formBuilder.group({
    url: ['', Validators.required],
  });

  constructor(
    private formBuilder: FormBuilder,
  ) {
    super();
  }
}
