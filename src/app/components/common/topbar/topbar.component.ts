import { Component, OnInit, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import * as domHelper from '../../../helpers/dom.helper';
import { RestService } from '../../../services';
import { ThemeService } from '../../../services/theme/theme.service';
import { WebSocketService } from '../../../services/ws.service';
import { DialogService } from '../../../services/dialog.service';
import { TourService } from '../../../services/tour.service';
import { MdSnackBar } from '@angular/material';
import * as hopscotch from 'hopscotch';

@Component({
  selector: 'topbar',
  templateUrl: './topbar.template.html'
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() sidenav;
  @Input() notificPanel;
  @Output() onLangChange = new EventEmitter < any > ();

  notificationCount = 0;
  interval: any;
  useUpateTimerInterval = true; // Change to false to shut this off.... The thought is.. It updates while
  // the user is logged in.

  currentLang = 'en';
  availableLangs = [{
    name: 'English',
    code: 'en',
  }, {
    name: 'Spanish',
    code: 'es',
  }, {
    name: '中文',
    code: 'zh',
  }]
  freenasThemes;

  constructor(
    private themeService: ThemeService, 
    private router: Router,
    private activeRoute: ActivatedRoute,
    private rs: RestService, 
    private ws: WebSocketService, 
    private dialogService: DialogService,
    private tour: TourService,
    public snackBar: MdSnackBar,) {}
  ngOnInit() {
    this.freenasThemes = this.themeService.freenasThemes;

    this.rs.get("system/alert", {}).subscribe((res) => {
      this.notificationCount = res.data.length;
    });

    if (this.useUpateTimerInterval === true) {
      this.interval = setInterval(() => {
        this.rs.get("system/alert", {}).subscribe((res) => {
          this.notificationCount = res.data.length;
        });
      }, 10000);
    }

    let showTour = localStorage.getItem(this.router.url) || 'false';
    if (showTour != "true") {
      hopscotch.startTour(this.tour.startTour(this.router.url));
      localStorage.setItem(this.router.url, 'false');
    }

  }

  ngOnDestroy() {
    if (typeof(this.interval) !== 'undefined') {
      clearInterval(this.interval);
    }
  }

  startTour() {
    hopscotch.startTour(this.tour.startTour(this.router.url));
    localStorage.setItem(this.router.url, 'false');
  }

  setLang() {
    this.onLangChange.emit(this.currentLang);
  }
  changeTheme(theme) {
    this.themeService.changeTheme(theme);
  }
  toggleNotific() {
    this.notificPanel.toggle();
  }
  toggleSidenav() {
    this.sidenav.toggle();
  }
  toggleCollapse() {
    let appBody = document.body;
    domHelper.toggleClass(appBody, 'collapsed-menu');
    domHelper.removeClass(document.getElementsByClassName('has-submenu'), 'open');
  }
  signOut() {
    this.dialogService.confirm("Logout", "You are about to LOGOUT of the FreeNAS WebUI. If unsure, hit 'Cancel', otherwise, press 'OK' to logout.").subscribe((res) => {
      if (res) {
        this.ws.logout();
      }
    });
  }
  onShutdown() {
    this.dialogService.confirm("Shutdown", "You are about to SHUTDOWN the FreeNAS system. If unsure, hit 'Cancel', otherwise, press 'OK' to shutdown the system.").subscribe((res) => {
      if (res) {
        this.ws.call('system.shutdown', {});
      }
    });
  }
  onReboot() {
    this.dialogService.confirm("Reboot", "You are about to REBOOT the FreeNAS system. If unsure, hit 'Cancel', otherwise, press 'OK' to reboot the system.").subscribe((res) => {
      if (res) {
        this.ws.call('system.reboot', {});
      }
    });
  }

}
