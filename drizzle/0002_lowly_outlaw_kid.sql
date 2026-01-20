CREATE TABLE "context_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"mood" text,
	"energy_level" integer,
	"pain_level" integer,
	"difficulty" text,
	"content" text,
	"tags" jsonb,
	"ai_processed" boolean DEFAULT false,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "context_notes" ADD CONSTRAINT "context_notes_member_id_circle_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."circle_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "context_notes_member_idx" ON "context_notes" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "context_notes_entity_idx" ON "context_notes" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "context_notes_created_idx" ON "context_notes" USING btree ("created_at");