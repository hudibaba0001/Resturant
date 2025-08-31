// lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';
import { env } from './env';

export function getStripe() {
  return new Stripe(env.stripeSecretKey(), { apiVersion: '2023-10-16' });
}