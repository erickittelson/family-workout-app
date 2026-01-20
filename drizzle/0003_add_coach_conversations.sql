CREATE TABLE "coach_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"mode" text DEFAULT 'general' NOT NULL,
	"title" text,
	"context" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"insights" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_conversations" ADD CONSTRAINT "coach_conversations_member_id_circle_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."circle_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_conversation_id_coach_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."coach_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_conversations_member_idx" ON "coach_conversations" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "coach_conversations_mode_idx" ON "coach_conversations" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "coach_conversations_status_idx" ON "coach_conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coach_conversations_last_msg_idx" ON "coach_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "coach_messages_conversation_idx" ON "coach_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "coach_messages_created_idx" ON "coach_messages" USING btree ("created_at");