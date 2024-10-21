import { inject, Injectable } from '@angular/core';
import {ConfirmationToken, loadStripe, Stripe, StripeAddressElement, StripeAddressElementOptions, StripeElements, StripePaymentElement} from '@stripe/stripe-js'
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { Cart } from '../../shared/models/cart';
import { firstValueFrom, map } from 'rxjs';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  baseUrl = environment.apiUrl
  private stripePromise: Promise<Stripe | null>
  private http = inject(HttpClient)
  private cartService = inject(CartService)
  private elements?: StripeElements
  private addressElement?: StripeAddressElement
  private accountService = inject(AccountService)
  private paymentElemnt?: StripePaymentElement

  constructor() {
    this.stripePromise = loadStripe(environment.stripePublicKey)
  }

  getStripeInstance() {
    return this.stripePromise;
  }

  async initialzeElements() {
    if(!this.elements){
      const stripe = await this.getStripeInstance()
      if(stripe){
        const cart = await firstValueFrom(this.createOrUpdatePaymentIntent())
        this.elements = stripe.elements({clientSecret: cart.clientSecret, appearance: {labels: 'floating'}})
      } else {
        throw new Error('Stripe has not been loading')
      }
    }

    return this.elements
  }

  async createPaymentElemnt() {
    if (!this.paymentElemnt){
      const elements = await this.initialzeElements()
      if(elements) {
        this.paymentElemnt = elements.create('payment')
      } else {
        throw new Error('Elements instance has not been initialzed')
      }
    }

    return this.paymentElemnt
  }

  async createAddressElemnt() {
    if(!this.addressElement) {
      const elements = await this.initialzeElements()
      if(elements){
        const user = this.accountService.currentUser()
        let defaultValues: StripeAddressElementOptions['defaultValues'] = {}
        if(user){
          defaultValues.name = user.firstName + ' ' + user.lastName
        }

        if(user?.address){
          defaultValues.address = {
            line1: user.address.line1,
            line2: user.address.line2,
            city: user.address.city,
            state: user.address.state,
            country: user.address.country,
            postal_code: user.address.postalCode
          }
        }

        const options: StripeAddressElementOptions = {
          mode: 'shipping',
          defaultValues
        };
        this.addressElement = elements.create('address', options)
      } else {
        throw new Error('Elements instance has not been loaded')
      }
    }
    return this.addressElement
  }

  async createConfirmationToken() {
    const stripe = await this.getStripeInstance()
    const elements = await this.initialzeElements()
    const result = await elements.submit()
    if (result.error) throw new Error(result.error.message)
    if (stripe) {
      return await stripe.createConfirmationToken({elements})
    } else {
      throw new Error('Stripe not available')
    }
  }

  async confirmPayment(confirmationToken: ConfirmationToken) {
    const stripe = await this.getStripeInstance()
    const elements = await this.initialzeElements()
    const result = await elements.submit()
    if (result.error) throw new Error(result.error.message)

    const clientSecret = this.cartService.cart()?.clientSecret

    if(stripe && clientSecret){
      return await stripe.confirmPayment({
        clientSecret: clientSecret,
        confirmParams: {
          confirmation_token: confirmationToken.id
        },
        redirect: 'if_required'
      })
    } else {
      throw new Error('Unable to load stripe')
    }
  }

  createOrUpdatePaymentIntent(){
    const cart = this.cartService.cart()
    if(!cart) throw new Error('Problem with the cart')
    return this.http.post<Cart>(this.baseUrl + 'payments/' + cart.id, {}).pipe(
      map(cart => {
        this.cartService.setCart(cart)
        return cart
      })
    )
  }

  disposeElemnts() {
    this.elements = undefined
    this.addressElement = undefined
    this.paymentElemnt = undefined
  }
}
