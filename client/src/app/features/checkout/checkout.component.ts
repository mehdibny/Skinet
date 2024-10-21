import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { OrderSummaryComponent } from "../../shared/components/order-summary/order-summary.component";
import { MatStepper, MatStepperModule} from '@angular/material/stepper';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { StripeService } from '../../core/services/stripe.service';
import { ConfirmationToken, StripeAddressElement, StripeAddressElementChangeEvent, StripePaymentElement, StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MatCheckboxChange, MatCheckboxModule} from '@angular/material/checkbox';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Address } from '../../shared/models/user';
import { count, firstValueFrom } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { CheckoutDeliveryComponent } from "./checkout-delivery/checkout-delivery.component";
import { CheckoutReviewComponent } from "./checkout-review/checkout-review.component";
import { CartService } from '../../core/services/cart.service';
import { CurrencyPipe, JsonPipe } from '@angular/common';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    OrderSummaryComponent,
    MatStepperModule,
    MatButton,
    RouterLink,
    MatCheckboxModule,
    CheckoutDeliveryComponent,
    CheckoutReviewComponent,
    CurrencyPipe,
    JsonPipe,
    MatProgressSpinnerModule
],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private stripeService = inject(StripeService)
  private snackBar = inject(SnackbarService)
  private accountService = inject(AccountService)
  private router = inject(Router)
  cartService = inject(CartService)
  addressElemnt?: StripeAddressElement
  paymentElement?: StripePaymentElement
  saveAddress = false
  completionStatus = signal<{address: boolean, card: boolean, delivery: boolean}>(
    {address: false, card: false, delivery: false}
  );
  confirmationToken?: ConfirmationToken
  loading = false

  async ngOnInit() {
    try {
      this.addressElemnt = await this.stripeService.createAddressElemnt()
      this.addressElemnt.mount('#address-element')
      this.addressElemnt.on('change', this.handelAddressChange)

      this.paymentElement = await this.stripeService.createPaymentElemnt()
      this.paymentElement.mount('#payment-element')
      this.paymentElement.on('change', this.handlePaymentChange)
    } catch (error : any) {
      this.snackBar.error(error.messsage)
    }
  }

  handelAddressChange = (event: StripeAddressElementChangeEvent) => {
    this.completionStatus.update(state => {
      state.address = event.complete
      return state
    })
  }

  handlePaymentChange = (event: StripePaymentElementChangeEvent) => {
    this.completionStatus.update(state => {
      state.card = event.complete
      return state
    })
  }

  handleDeliveryChange(event: boolean) {
    this.completionStatus.update( state => {
      state.delivery = event
      return state
    })
  }

  async getConfirmationToken() {
    try {
      if (Object.values(this.completionStatus()).every(status => status === true)) {
        const result = await this.stripeService.createConfirmationToken()
        if (result.error) throw new Error(result.error.message)
        this.confirmationToken = result.confirmationToken
        console.log(this.confirmationToken)
      }
    } catch (error: any) {
      this.snackBar.error(error.message)
    }
    
  }

  async onStepChange(event: StepperSelectionEvent) {
    if(event.selectedIndex === 1){
      if(this.saveAddress){
        const address = await this.getAddressFromStripeAddress()
        address && firstValueFrom(this.accountService.updateAddress(address))
      }
    }

    if (event.selectedIndex === 2) {
      await firstValueFrom(this.stripeService.createOrUpdatePaymentIntent())
    }

    if (event.selectedIndex === 3) {
      await this.getConfirmationToken()
    }
  }

  async confirmPayment(stepper: MatStepper) {
    this.loading = true
    try {
      if (this.confirmationToken) {
        const result = await this.stripeService.confirmPayment(this.confirmationToken)
        if (result.error) {
          throw new Error(result.error.message)
        } else {
          this.cartService.deleteCart()
          this.cartService.selectedDelivery.set(null)
          this.router.navigateByUrl('/checkout/success')
        }
      }
    } catch (error: any) {
      this.snackBar.error(error.message || 'Something went wrong')
      stepper.previous()
    } finally {
      this.loading = false
    }
  }

  private async getAddressFromStripeAddress() : Promise<Address | null> {
    const result = await this.addressElemnt?.getValue()
    const address = result?.value.address

    if(address) {
      return {
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        country: address.country,
        state: address.state,
        postalCode: address.postal_code
      }
    } else return null
  }

  onSaveAddressCheckboxChange(event: MatCheckboxChange){
    this.saveAddress = event.checked
  }

  ngOnDestroy(): void {
      this.stripeService.disposeElemnts()
  }
}
