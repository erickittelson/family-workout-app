CREATE TABLE "member_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"current_status" text DEFAULT 'learning' NOT NULL,
	"current_status_date" timestamp DEFAULT now(),
	"all_time_best_status" text DEFAULT 'learning' NOT NULL,
	"all_time_best_date" timestamp,
	"status" text DEFAULT 'learning' NOT NULL,
	"date_achieved" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "record_type" text DEFAULT 'current' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "estimated_date" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_member_id_circle_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."circle_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_skills_member_idx" ON "member_skills" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_skills_current_status_idx" ON "member_skills" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "personal_records_type_idx" ON "personal_records" USING btree ("record_type");