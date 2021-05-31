import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ProductType } from '../../../enums/product-type.enum';
import { WebSocketService, SystemGeneralService } from '../../../services';
import { Subject, Subscription } from 'rxjs';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { TranslateService } from '@ngx-translate/core';
import { DialogService } from '../../../services/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { LocaleService } from 'app/services/locale.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'system-reboot',
  templateUrl: './reboot.component.html',
  styleUrls: ['./reboot.component.scss'],
})
export class RebootComponent implements OnInit, OnDestroy {
  product_type: ProductType;
  copyrightYear = this.localeService.getCopyrightYearFromBuildTime();
  private getProdType: Subscription;
  onDestroy$ = new Subject();

  readonly ProductType = ProductType;

  constructor(protected ws: WebSocketService, protected router: Router,
    protected loader: AppLoaderService, public translate: TranslateService,
    protected dialogService: DialogService, protected dialog: MatDialog,
    private sysGeneralService: SystemGeneralService, private localeService: LocaleService) {
    this.ws = ws;
    this.getProdType = this.sysGeneralService.getProductType.pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.product_type = res as ProductType;
      this.getProdType.unsubscribe();
    });
  }

  isWSConnected(): void {
    if (this.ws.connected) {
      this.loader.close();
      // ws is connected
      this.router.navigate(['/session/signin']);
    } else {
      setTimeout(() => {
        this.isWSConnected();
      }, 5000);
    }
  }

  ngOnInit(): void {
    this.product_type = window.localStorage.getItem('product_type') as ProductType;

    this.dialog.closeAll();
    this.ws.call('system.reboot', {}).pipe(takeUntil(this.onDestroy$)).subscribe(
      () => {
      },
      (res) => { // error on reboot
        this.dialogService.errorReport(res.error, res.reason, res.trace.formatted).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
          this.router.navigate(['/session/signin']);
        });
      },
      () => { // show reboot screen
        this.ws.prepare_shutdown();
        this.loader.open();
        setTimeout(() => {
          this.isWSConnected();
        }, 1000);
      },
    );
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
