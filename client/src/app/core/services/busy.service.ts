import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BusyService {
  loading = false;
  bussyRequestCount = 0;

  busy(){
    this.bussyRequestCount++;
    this.loading = true;
  }
  idle(){
    this.bussyRequestCount--;
    if(this.bussyRequestCount <=0){
      this.bussyRequestCount = 0;
      this.loading = false;
    }
  }
}
