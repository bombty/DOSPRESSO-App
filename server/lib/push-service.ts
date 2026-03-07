import webPush from 'web-push';
import { db } from '../db';
import { pushSubscriptions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(
    'mailto:info@dospresso.com',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export const PUSH_ENABLED_TYPES = new Set([
  'sla_breach', 'critical_fault', 'security_alert', 'pin_lockout',
  'task_assigned', 'task_reminder', 'gate_passed', 'certificate_earned',
  'training_assigned', 'feedback_received', 'complaint_received',
  'quality_rejected', 'skt_warning', 'agent_suggestion',
  'order_approved', 'shipment_delivered',
]);

const URGENT_TYPES = new Set([
  'sla_breach', 'critical_fault', 'security_alert', 'pin_lockout',
]);

function isQuietHours(): boolean {
  const now = new Date();
  const trHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).getHours();
  return trHour >= 20 || trHour < 7;
}

export interface PushPayload {
  title: string;
  message: string;
  tag?: string;
  link?: string;
  type?: string;
}

export async function sendPushNotification(userId: number, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  if (payload.type && !PUSH_ENABLED_TYPES.has(payload.type)) return;
  if (isQuietHours() && payload.type && !URGENT_TYPES.has(payload.type)) return;

  const subs = await db.select().from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.isActive, true)
    ));

  const pushPayload = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushPayload,
        { TTL: 86400 }
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.update(pushSubscriptions)
          .set({ isActive: false })
          .where(eq(pushSubscriptions.id, sub.id));
      } else {
        console.error(`[Push] Failed to send to user ${userId}:`, error.message);
      }
    }
  }
}

export async function cleanExpiredSubscriptions(): Promise<number> {
  const result = await db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, false))
    .returning();
  return result.length;
}
