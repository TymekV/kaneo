ALTER TABLE "task_reminder_sent" ADD COLUMN "status" text NOT NULL DEFAULT 'sent';--> statement-breakpoint
ALTER TABLE "task_reminder_sent" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "task_reminder_sent" ADD COLUMN "attempts" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE INDEX "task_reminder_sent_status_idx" ON "task_reminder_sent" USING btree ("status");--> statement-breakpoint
ALTER TABLE "task_reminder_sent" ALTER COLUMN "status" SET DEFAULT 'pending';
