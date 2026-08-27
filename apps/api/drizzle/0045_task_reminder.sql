ALTER TABLE "task" ADD COLUMN "reminder_lead_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "user_notification_preference" DROP COLUMN "due_date_reminder_lead_time_minutes";