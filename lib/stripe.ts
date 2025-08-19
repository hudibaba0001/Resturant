// lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from './env';

export function getStripe() {
  return new Stripe(serverEnv.stripeSecretKey(), { apiVersion: '2023-10-16' });
}