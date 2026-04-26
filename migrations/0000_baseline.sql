CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"phone_number" varchar(20),
	"manager_name" varchar(255),
	"opening_hours" time(0) DEFAULT '08:00'::time,
	"closing_hours" time(0) DEFAULT '22:00'::time,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"shift_corner_photo_url" text,
	"shift_corner_latitude" numeric(10, 7),
	"shift_corner_longitude" numeric(10, 7),
	"qr_code_token" varchar(64),
	"geo_radius" integer DEFAULT 50,
	"wifi_ssid" varchar(100),
	"check_in_method" varchar(20) DEFAULT 'both',
	"feedback_qr_token" varchar(64),
	"google_maps_url" text,
	"instagram_handle" varchar(100),
	"kiosk_username" varchar(50),
	"kiosk_password" varchar(100),
	"ownership_type" varchar(20) DEFAULT 'franchise',
	"setup_complete" boolean DEFAULT false,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "checklist_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"scope" varchar(20) NOT NULL,
	"assigned_user_id" varchar,
	"branch_id" integer,
	"role" varchar(50),
	"shift_id" integer,
	"effective_from" date,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"checklist_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"shift_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scheduled_date" date NOT NULL,
	"time_window_start" time(0),
	"time_window_end" time(0),
	"started_at" timestamp,
	"completed_at" timestamp,
	"submitted_at" timestamp,
	"is_late" boolean DEFAULT false,
	"late_minutes" integer DEFAULT 0,
	"total_tasks" integer DEFAULT 0 NOT NULL,
	"completed_tasks" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0,
	"reviewed_by_id" varchar,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_instance_id" integer NOT NULL,
	"checklist_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"completion_rate" real NOT NULL,
	"is_on_time" boolean DEFAULT true,
	"raw_score" integer NOT NULL,
	"final_score" integer NOT NULL,
	"penalty_applied" integer DEFAULT 0,
	"total_tasks" integer NOT NULL,
	"completed_tasks" integer NOT NULL,
	"checklist_date" date NOT NULL,
	"scored_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"completion_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"photo_url" text,
	"notes" text,
	"is_late" boolean DEFAULT false,
	"task_order" integer NOT NULL,
	"ai_verification_result" varchar(20) DEFAULT 'skipped',
	"ai_similarity_score" integer,
	"ai_verification_note" text,
	"photo_expires_at" timestamp,
	"photo_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"task_description" text NOT NULL,
	"requires_photo" boolean DEFAULT false,
	"reference_photo_url" text,
	"tolerance_percent" integer DEFAULT 80,
	"ai_verification_type" varchar(50) DEFAULT 'none',
	"task_time_start" time(0),
	"task_time_end" time(0),
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"frequency" varchar(50) NOT NULL,
	"category" varchar(100),
	"scope" varchar(20) DEFAULT 'branch' NOT NULL,
	"is_editable" boolean DEFAULT true,
	"editable_fields" text[],
	"time_window_start" time(0),
	"time_window_end" time(0),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employee_satisfaction_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"task_rating_count" integer DEFAULT 0,
	"task_rating_sum" real DEFAULT 0,
	"task_satisfaction_avg" real DEFAULT 0,
	"task_on_time_count" integer DEFAULT 0,
	"task_late_count" integer DEFAULT 0,
	"checklist_rating_count" integer DEFAULT 0,
	"checklist_rating_sum" real DEFAULT 0,
	"checklist_score_avg" real DEFAULT 0,
	"checklist_on_time_count" integer DEFAULT 0,
	"checklist_late_count" integer DEFAULT 0,
	"on_time_rate" real DEFAULT 0,
	"composite_score" real DEFAULT 0,
	"last_calculated_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"warning_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"issued_by" varchar NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"catalog_id" integer,
	"equipment_type" varchar(50) NOT NULL,
	"model_no" varchar(255),
	"serial_number" varchar(255),
	"image_url" text,
	"purchase_date" date,
	"warranty_end_date" date,
	"maintenance_responsible" varchar(20) DEFAULT 'branch' NOT NULL,
	"fault_protocol" varchar(20) DEFAULT 'branch' NOT NULL,
	"service_contact_name" varchar(255),
	"service_contact_phone" varchar(50),
	"service_contact_email" varchar(255),
	"service_contact_address" text,
	"service_handled_by" varchar(20) DEFAULT 'hq',
	"last_maintenance_date" date,
	"next_maintenance_date" date,
	"maintenance_interval_days" integer DEFAULT 30,
	"qr_code_url" text,
	"notes" text,
	"servicing_scope" varchar(20) DEFAULT 'branch' NOT NULL,
	"max_service_time_hours" integer DEFAULT 48,
	"alert_threshold_hours" integer DEFAULT 36,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "equipment_faults" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"equipment_id" integer,
	"reported_by_id" varchar NOT NULL,
	"equipment_name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"photo_url" text,
	"ai_analysis" text,
	"ai_severity" varchar(50),
	"ai_recommendations" text[],
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"priority" varchar(50) DEFAULT 'medium',
	"priority_level" varchar(20) DEFAULT 'yellow' NOT NULL,
	"current_stage" varchar(50) DEFAULT 'bekliyor' NOT NULL,
	"assigned_to" varchar,
	"stage_history" jsonb DEFAULT '[]'::jsonb,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"troubleshooting_completed" boolean DEFAULT false NOT NULL,
	"completed_troubleshooting_steps" jsonb DEFAULT '[]'::jsonb,
	"fault_report_details" jsonb,
	"service_requested_at" timestamp,
	"service_alarm_sent" boolean DEFAULT false,
	"service_notification_date" timestamp,
	"service_notification_method" varchar(50),
	"responsible_party" varchar(20) DEFAULT 'branch',
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_troubleshooting_completion" (
	"id" serial PRIMARY KEY NOT NULL,
	"fault_id" integer NOT NULL,
	"step_id" integer NOT NULL,
	"completed_by_id" varchar NOT NULL,
	"photo_url" text,
	"notes" text,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_fault_step" UNIQUE("fault_id","step_id")
);
--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"acceptance_status" varchar(20) DEFAULT 'pending',
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"extension_requested_at" timestamp,
	"extension_days" integer,
	"extension_approved" boolean,
	"completion_rate" integer DEFAULT 0,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" text,
	"message" text NOT NULL,
	"comment_type" varchar(20) DEFAULT 'message',
	"attachment_url" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_escalation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"escalation_level" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"target_user_id" varchar,
	"branch_id" integer
);
--> statement-breakpoint
CREATE TABLE "task_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by_id" text,
	"source_type" text DEFAULT 'hq_manual',
	"target_branch_ids" text,
	"target_roles" text,
	"total_tasks" integer DEFAULT 0,
	"completed_tasks" integer DEFAULT 0,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"rated_by_id" varchar NOT NULL,
	"rated_user_id" varchar NOT NULL,
	"raw_rating" integer NOT NULL,
	"final_rating" integer NOT NULL,
	"penalty_applied" integer DEFAULT 0,
	"is_late" boolean DEFAULT false,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "task_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"changed_by_id" varchar NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer,
	"checklist_task_id" integer,
	"branch_id" integer,
	"assigned_to_id" varchar,
	"assigned_by_id" varchar,
	"description" text NOT NULL,
	"status" varchar(50) DEFAULT 'beklemede' NOT NULL,
	"priority" varchar(20) DEFAULT 'orta',
	"requires_photo" boolean DEFAULT false,
	"photo_url" text,
	"ai_analysis" text,
	"ai_score" integer,
	"completed_at" timestamp,
	"due_date" timestamp,
	"is_recurring" boolean DEFAULT false,
	"source_type" text DEFAULT 'hq_manual',
	"task_group_id" integer,
	"total_assigned" integer DEFAULT 1,
	"completed_count" integer DEFAULT 0,
	"notify_assigner" boolean DEFAULT true,
	"target_role" text,
	"target_branch_ids" text,
	"is_internal" boolean DEFAULT false,
	"recurrence_type" varchar(20),
	"recurrence_interval" integer DEFAULT 1,
	"last_recurred_at" timestamp,
	"next_run_at" timestamp,
	"acknowledged_at" timestamp,
	"acknowledged_by_id" varchar,
	"failure_note" text,
	"status_updated_at" timestamp,
	"status_updated_by_id" varchar,
	"started_at" timestamp,
	"is_onboarding" boolean DEFAULT false,
	"checker_id" varchar,
	"checked_at" timestamp,
	"checker_note" text,
	"scheduled_delivery_at" timestamp,
	"is_delivered" boolean DEFAULT true,
	"question_text" text,
	"question_answer_text" text,
	"extension_reason" text,
	"requested_due_date" timestamp,
	"approved_by_assigner_id" varchar,
	"approved_at" timestamp,
	"approver_note" text,
	"trigger_id" integer,
	"occurrence_key" varchar(100),
	"auto_generated" boolean DEFAULT false,
	"evidence_type" varchar(20) DEFAULT 'none',
	"evidence_data" text,
	"task_scope" varchar(20) DEFAULT 'branch',
	"target_department" varchar(50),
	"is_group_task" boolean DEFAULT false,
	"acceptance_required" boolean DEFAULT false,
	"allow_extension" boolean DEFAULT true,
	"parent_task_id" integer,
	"source" varchar(30) DEFAULT 'manual',
	"source_id" varchar(50),
	"announcement_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100),
	"hashed_password" varchar(255),
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'barista' NOT NULL,
	"branch_id" integer,
	"hire_date" date,
	"probation_end_date" date,
	"birth_date" date,
	"phone_number" varchar(20),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(20),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"daily_photo_count" integer DEFAULT 0 NOT NULL,
	"last_photo_date" date,
	"account_status" varchar(20) DEFAULT 'approved' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"employment_type" varchar(20) DEFAULT 'fulltime',
	"weekly_hours" integer DEFAULT 45,
	"skill_score" integer DEFAULT 50,
	"tckn" varchar(11),
	"gender" varchar(20),
	"marital_status" varchar(30),
	"department" varchar(100),
	"address" text,
	"city" varchar(100),
	"military_status" varchar(30),
	"education_level" varchar(100),
	"education_status" varchar(50),
	"education_institution" varchar(255),
	"contract_type" varchar(50),
	"home_phone" varchar(20),
	"num_children" integer DEFAULT 0,
	"disability_level" varchar(50),
	"leave_start_date" date,
	"leave_reason" text,
	"net_salary" integer DEFAULT 0,
	"meal_allowance" integer DEFAULT 0,
	"transport_allowance" integer DEFAULT 0,
	"bonus_base" integer DEFAULT 0,
	"bonus_type" varchar(30) DEFAULT 'normal',
	"bonus_percentage" numeric DEFAULT '0',
	"language" varchar(5) DEFAULT 'tr',
	"notification_preferences" jsonb,
	"dashboard_preferences" jsonb DEFAULT '{"mode":"classic"}'::jsonb,
	"must_change_password" boolean DEFAULT false,
	"onboarding_complete" boolean DEFAULT false,
	"title_id" integer,
	"employee_type_id" integer,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "announcement_dismissals" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"dismissed_at" timestamp DEFAULT now(),
	"show_again_after" timestamp,
	CONSTRAINT "unique_announcement_dismissal" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "announcement_quiz_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"answers" text,
	"attempt_number" integer DEFAULT 1,
	"attempted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcement_read_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcementId" integer NOT NULL,
	"userId" varchar NOT NULL,
	"readAt" timestamp DEFAULT now(),
	"acknowledgedAt" timestamp,
	CONSTRAINT "unique_announcement_read" UNIQUE("announcementId","userId")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by_id" varchar NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"summary" text,
	"category" varchar(30) DEFAULT 'general' NOT NULL,
	"target_roles" text[],
	"target_branches" integer[],
	"priority" text DEFAULT 'normal' NOT NULL,
	"attachments" text[] DEFAULT ARRAY[]::text[],
	"banner_image_url" text,
	"banner_title" varchar(100),
	"banner_subtitle" varchar(200),
	"show_on_dashboard" boolean DEFAULT false,
	"banner_priority" integer DEFAULT 0,
	"is_pinned" boolean DEFAULT false,
	"detailed_content" text,
	"cta_link" text,
	"cta_text" varchar(50),
	"media_urls" text[] DEFAULT ARRAY[]::text[],
	"published_at" timestamp DEFAULT now(),
	"valid_from" timestamp,
	"expires_at" timestamp,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"requires_acknowledgment" boolean DEFAULT false,
	"quiz_questions" text,
	"quiz_pass_score" integer DEFAULT 80,
	"quiz_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cowork_channel_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer,
	"user_id" text,
	"role" text DEFAULT 'member',
	"joined_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cowork_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_id" text,
	"is_private" boolean DEFAULT false,
	"allowed_branch_ids" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "cowork_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer,
	"sender_id" text,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"metadata" text,
	"is_edited" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cowork_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer,
	"title" text NOT NULL,
	"description" text,
	"assigned_to_id" text,
	"created_by_id" text,
	"status" text DEFAULT 'todo',
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_cash_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"reported_by_id" varchar NOT NULL,
	"report_date" date NOT NULL,
	"opening_cash" numeric(10, 2) NOT NULL,
	"closing_cash" numeric(10, 2) NOT NULL,
	"total_sales" numeric(10, 2) NOT NULL,
	"cash_sales" numeric(10, 2),
	"card_sales" numeric(10, 2),
	"expenses" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_branch_date" UNIQUE("branch_id","report_date")
);
--> statement-breakpoint
CREATE TABLE "equipment_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_maintenance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"performed_by" varchar NOT NULL,
	"maintenance_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"cost" numeric(10, 2),
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"next_scheduled_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"fault_id" integer,
	"service_decision" varchar(20) NOT NULL,
	"service_provider" text,
	"contact_info" text,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"notes" text,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb,
	"photo1_url" text,
	"photo2_url" text,
	"created_by_id" varchar NOT NULL,
	"updated_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fault_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"fault_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fault_stage_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"fault_id" integer NOT NULL,
	"from_stage" varchar(50),
	"to_stage" varchar(50) NOT NULL,
	"changed_by" varchar NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"category" varchar(100),
	"difficulty" varchar(50) DEFAULT 'medium',
	"is_ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hq_support_category_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) NOT NULL,
	"user_id" varchar NOT NULL,
	"can_assign" boolean DEFAULT false,
	"can_close" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by_id" varchar,
	CONSTRAINT "hq_support_cat_assign_unique" UNIQUE("category","user_id")
);
--> statement-breakpoint
CREATE TABLE "hq_support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hq_support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"created_by_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(20) DEFAULT 'aktif' NOT NULL,
	"closed_at" timestamp,
	"closed_by" varchar,
	"rating" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"tags" text[],
	"attachment_urls" text[],
	"equipment_type_id" varchar(100),
	"is_published" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"leave_type" varchar(20) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" varchar NOT NULL,
	"parent_message_id" integer,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar,
	"recipient_role" varchar(50),
	"subject" text,
	"body" text NOT NULL,
	"type" varchar(50) DEFAULT 'direct',
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"order_index" integer DEFAULT 0,
	"estimated_duration" integer DEFAULT 5,
	"lesson_type" varchar(50) DEFAULT 'reading',
	"video_url" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "module_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"title" varchar(255),
	"media_type" varchar(50) NOT NULL,
	"object_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(100),
	"file_size" integer,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "module_quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"passing_score" integer DEFAULT 70,
	"time_limit" integer,
	"is_exam" boolean DEFAULT false,
	"randomize_questions" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "module_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"video_url" text NOT NULL,
	"duration" integer DEFAULT 0,
	"order_index" integer DEFAULT 0,
	"transcript" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"branch_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"user_id" varchar,
	"date" timestamp NOT NULL,
	"tasks_completed" integer DEFAULT 0,
	"tasks_total" integer DEFAULT 0,
	"completion_rate" integer DEFAULT 0,
	"average_ai_score" integer DEFAULT 0,
	"task_score" integer DEFAULT 0,
	"photo_score" integer DEFAULT 0,
	"time_score" integer DEFAULT 0,
	"supervisor_score" integer DEFAULT 0,
	"total_score" integer DEFAULT 0,
	"faults_reported" integer DEFAULT 0,
	"faults_resolved" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ownership_check" CHECK (branch_id IS NOT NULL OR user_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer,
	"career_quiz_id" integer,
	"question" text NOT NULL,
	"question_type" varchar(50) DEFAULT 'multiple_choice',
	"options" text[],
	"correct_answer" text NOT NULL,
	"correct_answer_index" integer DEFAULT 0,
	"explanation" text,
	"points" integer DEFAULT 1,
	"review_status" varchar(20) DEFAULT 'manual',
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"reminder_count" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"next_reminder_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"scheduled_start_time" timestamp,
	"scheduled_end_time" timestamp,
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"break_start_time" timestamp,
	"break_end_time" timestamp,
	"break_planned_minutes" integer DEFAULT 60,
	"break_taken_minutes" integer DEFAULT 0,
	"total_break_minutes" integer DEFAULT 0,
	"total_worked_minutes" integer DEFAULT 0,
	"effective_work_minutes" integer DEFAULT 0,
	"penalty_minutes" integer DEFAULT 0,
	"lateness_minutes" integer DEFAULT 0,
	"early_leave_minutes" integer DEFAULT 0,
	"break_overage_minutes" integer DEFAULT 0,
	"compliance_score" integer DEFAULT 100,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"check_in_method" varchar(20) DEFAULT 'manual',
	"location_confidence_score" integer,
	"check_in_photo_url" text,
	"check_in_latitude" numeric(10, 7),
	"check_in_longitude" numeric(10, 7),
	"check_out_photo_url" text,
	"check_out_latitude" numeric(10, 7),
	"check_out_longitude" numeric(10, 7),
	"break_start_photo_url" text,
	"break_start_latitude" numeric(10, 7),
	"break_start_longitude" numeric(10, 7),
	"break_end_photo_url" text,
	"break_end_latitude" numeric(10, 7),
	"break_end_longitude" numeric(10, 7),
	"ai_background_check_in_status" varchar(20) DEFAULT 'pending',
	"ai_background_check_in_score" integer,
	"ai_background_check_in_details" jsonb,
	"ai_background_check_out_status" varchar(20) DEFAULT 'pending',
	"ai_background_check_out_score" integer,
	"ai_background_check_out_details" jsonb,
	"ai_background_break_start_status" varchar(20) DEFAULT 'pending',
	"ai_background_break_start_score" integer,
	"ai_background_break_end_status" varchar(20) DEFAULT 'pending',
	"ai_background_break_end_score" integer,
	"ai_dress_code_score" integer,
	"ai_dress_code_analysis" jsonb,
	"ai_dress_code_status" varchar(20) DEFAULT 'pending',
	"ai_dress_code_warnings" text[],
	"ai_dress_code_timestamp" timestamp,
	"photo_url" text,
	"analysis_status" varchar(20) DEFAULT 'pending',
	"analysis_details" jsonb,
	"analysis_timestamp" timestamp,
	"ai_warnings" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_shift_user_attendance" UNIQUE("shift_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "shift_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"checklist_id" integer NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_shift_checklist" UNIQUE("shift_id","checklist_id")
);
--> statement-breakpoint
CREATE TABLE "shift_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_shift_task" UNIQUE("shift_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "shift_trade_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" varchar NOT NULL,
	"responder_id" varchar NOT NULL,
	"requester_shift_id" integer NOT NULL,
	"responder_shift_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'taslak' NOT NULL,
	"notes" text,
	"responder_confirmed_at" timestamp,
	"supervisor_approved_at" timestamp,
	"supervisor_id" varchar,
	"supervisor_notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_open_shift_trade" UNIQUE("requester_shift_id","responder_shift_id","status")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"assigned_to_id" varchar,
	"created_by_id" varchar NOT NULL,
	"checklist_id" integer,
	"checklist2_id" integer,
	"checklist3_id" integer,
	"shift_date" date NOT NULL,
	"start_time" time(0) NOT NULL,
	"end_time" time(0) NOT NULL,
	"shift_type" varchar(20) NOT NULL,
	"break_start_time" time(0),
	"break_end_time" time(0),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"workload_score" numeric(5, 2),
	"ai_plan_id" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "thread_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"last_read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"code" varchar(50),
	"slug" varchar(100),
	"category" varchar(100),
	"module_type" varchar(50) DEFAULT 'skill',
	"scope" varchar(20) DEFAULT 'branch',
	"recipe_category_id" integer,
	"level" varchar(50) DEFAULT 'beginner',
	"estimated_duration" integer DEFAULT 30,
	"is_published" boolean DEFAULT false,
	"is_required" boolean DEFAULT false,
	"required_for_role" varchar(100)[],
	"prerequisite_module_ids" integer[],
	"hero_image_url" text,
	"gallery_images" jsonb DEFAULT '[]'::jsonb,
	"learning_objectives" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"scenario_tasks" jsonb DEFAULT '[]'::jsonb,
	"supervisor_checklist" jsonb DEFAULT '[]'::jsonb,
	"quiz" jsonb DEFAULT '[]'::jsonb,
	"tags" varchar(100)[],
	"generated_by_ai" boolean DEFAULT false,
	"xp_reward" integer DEFAULT 50,
	"main_video_url" text,
	"mindmap_data" jsonb,
	"ai_summary" text,
	"exam_passing_score" integer DEFAULT 70,
	"max_retries" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"sales_tips" jsonb DEFAULT '[]'::jsonb,
	"presentation_guide" jsonb,
	"marketing_content" jsonb,
	"ai_roleplay_scenarios" jsonb DEFAULT '[]'::jsonb,
	"target_roles" text[] DEFAULT '{}'::text[],
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"deadline_days" integer,
	"status" varchar(20) DEFAULT 'approved',
	"rejection_reason" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"quiz_id" integer NOT NULL,
	"score" integer DEFAULT 0,
	"answers" text,
	"is_passed" boolean DEFAULT false,
	"time_spent" integer,
	"attempt_number" integer DEFAULT 1,
	"is_exam_attempt" boolean DEFAULT false,
	"approved_by" varchar,
	"approval_status" varchar(50) DEFAULT 'pending',
	"feedback" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_training_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"module_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'not_started',
	"progress_percentage" integer DEFAULT 0,
	"videos_watched" integer[] DEFAULT '{}',
	"last_accessed_at" timestamp,
	"completed_at" timestamp,
	"certificate_issued" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"feature" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"operation" varchar(100) NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"request_latency_ms" integer DEFAULT 0 NOT NULL,
	"user_id" varchar,
	"branch_id" integer,
	"cached_hit" boolean DEFAULT false NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "audit_instance_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"template_item_id" integer NOT NULL,
	"response" text,
	"score" integer,
	"notes" text,
	"photo_url" text,
	"ai_analysis_status" varchar(20),
	"ai_score" integer,
	"ai_insights" text,
	"ai_confidence" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"audit_type" varchar(20) NOT NULL,
	"branch_id" integer,
	"user_id" varchar,
	"auditor_id" varchar NOT NULL,
	"audit_date" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"total_score" integer,
	"max_score" integer,
	"notes" text,
	"action_items" text,
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"follow_up_date" date,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_item_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"template_item_id" integer NOT NULL,
	"score_given" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "audit_personnel_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_instance_id" integer NOT NULL,
	"personnel_id" varchar NOT NULL,
	"auditor_id" varchar NOT NULL,
	"feedback" text NOT NULL,
	"category" varchar(30),
	"severity" varchar(10) DEFAULT 'info',
	"is_read_by_personnel" boolean DEFAULT false,
	"read_at" timestamp,
	"personnel_response" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"item_text" text NOT NULL,
	"max_points" integer DEFAULT 10 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"item_type" varchar(20),
	"weight" numeric(5, 2),
	"section" varchar(30),
	"requires_photo" boolean,
	"ai_check_enabled" boolean,
	"ai_prompt" text,
	"options" text[],
	"correct_answer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"audit_type" varchar(20),
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_photo" boolean DEFAULT false NOT NULL,
	"ai_analysis_enabled" boolean DEFAULT false NOT NULL,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "branch_audit_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"audit_count" integer DEFAULT 0 NOT NULL,
	"gida_guvenligi_avg" integer,
	"urun_standardi_avg" integer,
	"servis_avg" integer,
	"operasyon_avg" integer,
	"marka_avg" integer,
	"ekipman_avg" integer,
	"overall_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branding" (
	"id" serial PRIMARY KEY NOT NULL,
	"logo_url" text,
	"updated_by_id" varchar,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	CONSTRAINT "unique_campaign_branch" UNIQUE("campaign_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"sales_increase" numeric(10, 2),
	"customer_count" integer,
	"revenue" numeric(12, 2),
	"notes" text,
	"reported_by_id" varchar NOT NULL,
	"report_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"campaign_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"target_roles" text[],
	"image_urls" text[],
	"pdf_url" text,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "corrective_action_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"corrective_action_id" integer NOT NULL,
	"old_status" varchar(20),
	"new_status" varchar(20) NOT NULL,
	"notes" text,
	"evidence" jsonb,
	"updated_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "corrective_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_instance_id" integer NOT NULL,
	"audit_item_id" integer NOT NULL,
	"priority" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"action_type" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"action_sla_hours" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"closed_date" timestamp,
	"assigned_to_id" varchar,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"source" varchar(30) DEFAULT 'qr_code' NOT NULL,
	"external_review_id" varchar(255),
	"external_review_url" text,
	"rating" integer NOT NULL,
	"service_rating" integer,
	"cleanliness_rating" integer,
	"product_rating" integer,
	"staff_rating" integer,
	"sla_deadline_hours" integer DEFAULT 24,
	"branch_response_at" timestamp with time zone,
	"branch_response_text" text,
	"branch_responder_id" text,
	"hq_note" text,
	"hq_note_by_id" text,
	"hq_note_at" timestamp with time zone,
	"hq_intervention_required" boolean DEFAULT false,
	"hq_intervention_at" timestamp with time zone,
	"feedback_status" text DEFAULT 'open',
	"staff_id" varchar,
	"comment" text,
	"feedback_date" timestamp DEFAULT now(),
	"customer_name" varchar(100),
	"customer_email" varchar(200),
	"customer_phone" varchar(20),
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"response_deadline" timestamp,
	"sla_breached" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"reviewed_by_id" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"resolved_at" timestamp,
	"resolution_satisfaction" integer,
	"photo_urls" text[],
	"device_fingerprint" varchar(50),
	"user_ip" varchar(50),
	"user_latitude" real,
	"user_longitude" real,
	"distance_from_branch" real,
	"is_suspicious" boolean DEFAULT false NOT NULL,
	"suspicious_reasons" text[],
	"feedback_language" varchar(5) DEFAULT 'tr',
	"feedback_type" varchar(20) DEFAULT 'feedback' NOT NULL,
	"requires_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" varchar(50) NOT NULL,
	"notes" text,
	"is_all_day" boolean DEFAULT true NOT NULL,
	"start_time" time(0),
	"end_time" time(0),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_calibrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"calibration_date" timestamp NOT NULL,
	"calibration_type" varchar(50) NOT NULL,
	"result" varchar(20) NOT NULL,
	"next_calibration_due" date NOT NULL,
	"certificate_number" varchar(100),
	"calibrated_by_id" varchar,
	"external_provider" varchar(200),
	"measurements" text,
	"deviations" text,
	"corrective_actions" text,
	"photo_urls" text[],
	"notes" text,
	"audit_instance_id" integer,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_custom_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"question_tr" text NOT NULL,
	"question_en" text,
	"question_de" text,
	"question_ar" text,
	"question_zh" text,
	"question_ko" text,
	"question_fr" text,
	"question_type" varchar(20) DEFAULT 'rating' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_form_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"banner_url" text,
	"logo_url" text,
	"primary_color" varchar(20) DEFAULT '#7c3aed',
	"background_color" varchar(20) DEFAULT '#1e1b4b',
	"welcome_message_tr" text DEFAULT 'Geri bildiriminiz bizim için çok değerli',
	"welcome_message_en" text DEFAULT 'Your feedback is very valuable to us',
	"welcome_message_zh" text DEFAULT '您的意见对我们非常宝贵',
	"welcome_message_ar" text DEFAULT 'رأيك مهم جداً بالنسبة لنا',
	"welcome_message_de" text DEFAULT 'Ihre Meinung ist uns sehr wichtig',
	"welcome_message_ko" text DEFAULT '귀하의 의견은 저희에게 매우 소중합니다',
	"welcome_message_fr" text DEFAULT 'Votre avis nous est très précieux',
	"show_service_rating" boolean DEFAULT true NOT NULL,
	"show_cleanliness_rating" boolean DEFAULT true NOT NULL,
	"show_product_rating" boolean DEFAULT true NOT NULL,
	"show_staff_rating" boolean DEFAULT true NOT NULL,
	"show_staff_selection" boolean DEFAULT true NOT NULL,
	"show_photo_upload" boolean DEFAULT true NOT NULL,
	"show_feedback_type_selection" boolean DEFAULT true NOT NULL,
	"show_contact_preference" boolean DEFAULT true NOT NULL,
	"show_comment_field" boolean DEFAULT true NOT NULL,
	"require_comment" boolean DEFAULT false NOT NULL,
	"allow_anonymous" boolean DEFAULT true NOT NULL,
	"default_anonymous" boolean DEFAULT true NOT NULL,
	"require_location_verification" boolean DEFAULT false NOT NULL,
	"max_distance_from_branch" integer DEFAULT 500,
	"available_languages" text[] DEFAULT '{"tr","en"}',
	"default_language" varchar(5) DEFAULT 'tr',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by_id" varchar
);
--> statement-breakpoint
CREATE TABLE "feedback_ip_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"branch_id" integer,
	"reason" text,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"responder_id" varchar NOT NULL,
	"response_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"is_visible_to_customer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'planning' NOT NULL,
	"expected_opening_date" date,
	"actual_opening_date" date,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"assigned_coach_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "license_renewals" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"license_type" varchar(100) NOT NULL,
	"license_number" varchar(100),
	"issue_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"renewal_status" varchar(20) DEFAULT 'active' NOT NULL,
	"reminder_days_before" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"document_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer,
	"equipment_id" integer NOT NULL,
	"performed_by_id" varchar NOT NULL,
	"performed_date" timestamp NOT NULL,
	"maintenance_type" varchar(50) NOT NULL,
	"work_description" text NOT NULL,
	"parts_replaced" text[],
	"cost" numeric(10, 2),
	"next_maintenance_due" date,
	"photo_urls" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"maintenance_type" varchar(50) NOT NULL,
	"frequency_days" integer NOT NULL,
	"last_maintenance_date" date,
	"next_maintenance_date" date NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"title_tr" varchar(200) NOT NULL,
	"path" varchar(200) NOT NULL,
	"icon" varchar(50),
	"module_key" varchar(100),
	"scope" varchar(20) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title_tr" varchar(200) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_sections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "menu_visibility_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"rule_type" varchar(20) NOT NULL,
	"role" varchar(50),
	"user_id" varchar,
	"branch_id" integer,
	"allow" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"onboarding_id" integer NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"document_name" varchar(200) NOT NULL,
	"file_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"uploaded_by_id" varchar,
	"uploaded_at" timestamp,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"expiry_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp,
	"created_by_id" varchar NOT NULL,
	"updated_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "page_content_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"module" varchar(50) NOT NULL,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "personnel_audit_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"period_type" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"audit_count" integer DEFAULT 0 NOT NULL,
	"guler_yuz_avg" integer,
	"urun_bilgisi_avg" integer,
	"dress_code_avg" integer,
	"hijyen_avg" integer,
	"takim_ruhu_avg" integer,
	"gelisim_avg" integer,
	"overall_score" integer,
	"previous_score" integer,
	"trend" varchar(10),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personnel_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"overall_performance_score" integer,
	"attendance_score" integer,
	"knowledge_score" integer,
	"behavior_score" integer,
	"last_audit_date" timestamp,
	"total_audits_completed" integer DEFAULT 0 NOT NULL,
	"average_audit_score" integer,
	"strengths_notes" text,
	"improvement_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "personnel_files_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "quality_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"auditor_id" varchar NOT NULL,
	"audit_date" timestamp NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"max_possible_score" integer DEFAULT 0 NOT NULL,
	"percentage_score" integer DEFAULT 0 NOT NULL,
	"gida_guvenligi_score" integer,
	"urun_standardi_score" integer,
	"servis_score" integer,
	"operasyon_score" integer,
	"marka_score" integer,
	"ekipman_score" integer,
	"weighted_total_score" integer,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"notes" text,
	"photo_urls" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "role_permission_unique" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"shift_type" varchar(20) NOT NULL,
	"start_time" time(0) NOT NULL,
	"end_time" time(0) NOT NULL,
	"days_of_week" integer[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_penalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_attendance_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"minutes" integer NOT NULL,
	"reason" text NOT NULL,
	"auto_generated" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"user_id" varchar,
	"actor_role" varchar(50),
	"scope_branch_id" integer,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" varchar(100),
	"target_resource" varchar(100),
	"target_resource_id" varchar(100),
	"before" jsonb,
	"after" jsonb,
	"details" jsonb,
	"request_id" varchar(64),
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "backup_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"backup_id" varchar(100) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"tables_backed_up" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"record_counts" jsonb DEFAULT '{}' NOT NULL,
	"error_message" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"backup_type" varchar(20) DEFAULT 'daily' NOT NULL,
	CONSTRAINT "backup_records_backup_id_unique" UNIQUE("backup_id")
);
--> statement-breakpoint
CREATE TABLE "branch_quality_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"audit_date" date NOT NULL,
	"auditor_id" varchar NOT NULL,
	"cleanliness_score" integer NOT NULL,
	"service_quality_score" integer NOT NULL,
	"product_quality_score" integer NOT NULL,
	"staff_behavior_score" integer NOT NULL,
	"safety_compliance_score" integer NOT NULL,
	"equipment_maintenance_score" integer NOT NULL,
	"exterior_score" integer DEFAULT 0,
	"building_appearance_score" integer DEFAULT 0,
	"bar_layout_score" integer DEFAULT 0,
	"storage_score" integer DEFAULT 0,
	"product_presentation_score" integer DEFAULT 0,
	"dress_code_score" integer DEFAULT 0,
	"overall_score" integer NOT NULL,
	"notes" text,
	"action_items" text,
	"category_notes" text,
	"photo_urls" text,
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"follow_up_date" date,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "career_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" varchar(50) NOT NULL,
	"level_number" integer NOT NULL,
	"title_tr" varchar(100) NOT NULL,
	"description_tr" text,
	"required_module_ids" integer[] DEFAULT ARRAY[]::integer[],
	"prerequisite_roles" text[],
	"success_rate_threshold" integer DEFAULT 80,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "career_levels_role_id_unique" UNIQUE("role_id")
);
--> statement-breakpoint
CREATE TABLE "certificate_design_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"transition_from" varchar(50) NOT NULL,
	"transition_to" varchar(50) NOT NULL,
	"certificate_title" varchar(255) DEFAULT 'Başarı Sertifikası' NOT NULL,
	"subtitle" varchar(255),
	"primary_color" varchar(20) DEFAULT '#1e3a5f',
	"secondary_color" varchar(20) DEFAULT '#c9a96e',
	"logo_url" text,
	"signature_label" varchar(200) DEFAULT 'DOSPRESSO Eğitim Müdürü',
	"signature_image_url" text,
	"template_layout" varchar(50) DEFAULT 'classic',
	"footer_text" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "certificate_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(50) NOT NULL,
	"setting_value" text NOT NULL,
	"updated_by" varchar,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "certificate_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "disciplinary_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'low' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"incident_date" date NOT NULL,
	"incident_time" varchar(5),
	"location" varchar(255),
	"witness_ids" text[],
	"attachment_urls" text[],
	"created_by_id" varchar NOT NULL,
	"employee_response" text,
	"employee_response_date" timestamp,
	"employee_response_attachments" text[],
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by_id" varchar,
	"resolved_at" timestamp,
	"action_taken" varchar(100),
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"follow_up_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"description" text,
	"expiry_date" date,
	"uploaded_by_id" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by_id" varchar,
	"verified_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"start_date" date NOT NULL,
	"expected_completion_date" date,
	"actual_completion_date" date,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"assigned_mentor_id" varchar,
	"supervisor_notes" text,
	"employee_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employee_onboarding_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "employee_onboarding_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"mentor_id" varchar,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"expected_end_date" timestamp,
	"actual_end_date" timestamp,
	"status" varchar(30) DEFAULT 'in_progress' NOT NULL,
	"overall_progress" integer DEFAULT 0 NOT NULL,
	"manager_notified" boolean DEFAULT false NOT NULL,
	"evaluation_status" varchar(30),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_onboarding_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"step_id" integer NOT NULL,
	"mentor_id" varchar,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"approval_status" varchar(30) DEFAULT 'not_required',
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"mentor_notes" text,
	"rating" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_onboarding_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"onboarding_id" integer NOT NULL,
	"task_type" varchar(100) NOT NULL,
	"task_name" varchar(255) NOT NULL,
	"description" text,
	"due_date" date,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"completed_by_id" varchar,
	"completed_at" timestamp,
	"verified_by_id" varchar,
	"verified_at" timestamp,
	"attachment_urls" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_performance_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"date" date NOT NULL,
	"week" varchar(10) NOT NULL,
	"attendance_score" integer DEFAULT 100 NOT NULL,
	"lateness_score" integer DEFAULT 100 NOT NULL,
	"early_leave_score" integer DEFAULT 100 NOT NULL,
	"break_compliance_score" integer DEFAULT 100 NOT NULL,
	"shift_compliance_score" integer DEFAULT 100 NOT NULL,
	"overtime_compliance_score" integer DEFAULT 100 NOT NULL,
	"checklist_score" integer DEFAULT 100 NOT NULL,
	"checklists_completed" integer DEFAULT 0 NOT NULL,
	"daily_total_score" integer DEFAULT 100 NOT NULL,
	"weekly_total_score" integer DEFAULT 100 NOT NULL,
	"total_penalty_minutes" integer DEFAULT 0 NOT NULL,
	"lateness_minutes" integer DEFAULT 0 NOT NULL,
	"early_leave_minutes" integer DEFAULT 0 NOT NULL,
	"break_overage_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_date_performance" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "equipment_troubleshooting_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_type" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"description" text NOT NULL,
	"requires_photo" boolean DEFAULT false NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"target_role_id" varchar(50) NOT NULL,
	"supervisor_id" varchar NOT NULL,
	"supervisor_notes" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"exam_started_at" timestamp,
	"exam_completed_at" timestamp,
	"exam_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guest_complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"complaint_source" varchar(50) NOT NULL,
	"complaint_category" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"photo_url" text,
	"complaint_date" timestamp DEFAULT now() NOT NULL,
	"complaint_time" varchar(5),
	"customer_name" varchar(100),
	"customer_email" varchar(200),
	"customer_phone" varchar(20),
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"assigned_to_type" varchar(50),
	"assigned_to_id" varchar,
	"assigned_at" timestamp,
	"response_deadline" timestamp,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"sla_breached" boolean DEFAULT false NOT NULL,
	"resolved_by_id" varchar,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"customer_satisfaction" integer,
	"source_feedback_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issued_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(30) NOT NULL,
	"template_key" varchar(50) NOT NULL,
	"certificate_no" varchar(30) NOT NULL,
	"recipient_user_id" varchar,
	"recipient_name" varchar(200) NOT NULL,
	"title" varchar(255),
	"description" text,
	"branch_name" varchar(200),
	"module_name" varchar(200),
	"quiz_score" integer,
	"signer1_name" varchar(100) NOT NULL,
	"signer1_title" varchar(100) NOT NULL,
	"signer2_name" varchar(100) NOT NULL,
	"signer2_title" varchar(100) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issued_certificates_certificate_no_unique" UNIQUE("certificate_no")
);
--> statement-breakpoint
CREATE TABLE "mega_module_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" varchar(100) NOT NULL,
	"mega_module_id" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "mega_module_mappings_unique" UNIQUE("module_id")
);
--> statement-breakpoint
CREATE TABLE "monthly_attendance_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"period_month" varchar(7) NOT NULL,
	"total_scheduled_minutes" integer DEFAULT 0 NOT NULL,
	"total_worked_minutes" integer DEFAULT 0 NOT NULL,
	"total_penalty_minutes" integer DEFAULT 0 NOT NULL,
	"total_overtime_minutes" integer DEFAULT 0 NOT NULL,
	"lateness_count" integer DEFAULT 0 NOT NULL,
	"early_leave_count" integer DEFAULT 0 NOT NULL,
	"compliance_score_avg" integer DEFAULT 100 NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_period" UNIQUE("user_id","period_month")
);
--> statement-breakpoint
CREATE TABLE "onboarding_template_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"step_order" integer DEFAULT 1 NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"start_day" integer DEFAULT 1 NOT NULL,
	"end_day" integer DEFAULT 3 NOT NULL,
	"content_type" varchar(30) DEFAULT 'module' NOT NULL,
	"content_id" integer,
	"estimated_minutes" integer DEFAULT 15,
	"approver_type" varchar(30) DEFAULT 'auto' NOT NULL,
	"mentor_role_type" varchar(50) DEFAULT 'barista' NOT NULL,
	"training_module_id" integer,
	"required_completion" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"target_role" varchar(50) DEFAULT 'barista' NOT NULL,
	"scope" varchar(20) DEFAULT 'branch' NOT NULL,
	"duration_days" integer DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "overtime_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"shift_attendance_id" integer,
	"overtime_date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"requested_minutes" integer NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approver_id" varchar,
	"approved_minutes" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"applied_to_period" varchar(7),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "permission_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"action_key" varchar(50) NOT NULL,
	"label_tr" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permission_actions_module_action_unique" UNIQUE("module_key","action_key")
);
--> statement-breakpoint
CREATE TABLE "permission_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"module_name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "permission_modules_module_key_unique" UNIQUE("module_key")
);
--> statement-breakpoint
CREATE TABLE "product_complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"reported_by_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"product_name" varchar(255) NOT NULL,
	"batch_number" varchar(100),
	"complaint_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"photo_urls" text,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"resolution" text,
	"resolved_by_id" varchar,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_module_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"module" varchar(50) NOT NULL,
	"actions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "role_module_permissions_role_module_unique" UNIQUE("role","module")
);
--> statement-breakpoint
CREATE TABLE "role_permission_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"action_id" integer NOT NULL,
	"scope" varchar(20) DEFAULT 'self' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "role_permission_grants_role_action_unique" UNIQUE("role","action_id")
);
--> statement-breakpoint
CREATE TABLE "shift_swap_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" varchar NOT NULL,
	"target_user_id" varchar NOT NULL,
	"requester_shift_id" integer NOT NULL,
	"target_shift_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"swap_date" date NOT NULL,
	"reason" text,
	"target_approved" boolean,
	"target_approved_at" timestamp,
	"target_rejection_reason" text,
	"supervisor_approved" boolean,
	"supervisor_id" varchar,
	"supervisor_approved_at" timestamp,
	"supervisor_rejection_reason" text,
	"status" varchar(20) DEFAULT 'pending_target' NOT NULL,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"type" varchar(20) DEFAULT 'string' NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "staff_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar NOT NULL,
	"evaluator_id" varchar NOT NULL,
	"evaluator_role" varchar(50) NOT NULL,
	"branch_id" integer,
	"inspection_id" integer,
	"customer_behavior" integer DEFAULT 3 NOT NULL,
	"friendliness" integer DEFAULT 3 NOT NULL,
	"knowledge_experience" integer DEFAULT 3 NOT NULL,
	"dress_code" integer DEFAULT 3 NOT NULL,
	"cleanliness" integer DEFAULT 3 NOT NULL,
	"teamwork" integer DEFAULT 3 NOT NULL,
	"punctuality" integer DEFAULT 3 NOT NULL,
	"initiative" integer DEFAULT 3 NOT NULL,
	"overall_score" real DEFAULT 0 NOT NULL,
	"notes" text,
	"evaluation_type" varchar(30) DEFAULT 'standard' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_critical_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"source_location" varchar(200),
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"acknowledged_by_id" varchar,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"user_id" varchar,
	"target_role" varchar(50),
	"branch_id" integer,
	"assigned_by_id" varchar NOT NULL,
	"due_date" date,
	"is_required" boolean DEFAULT true,
	"status" varchar(20) DEFAULT 'assigned' NOT NULL,
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"material_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"score" integer,
	"time_spent_seconds" integer DEFAULT 0,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"material_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"target_roles" text[],
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "academy_hub_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"title_tr" varchar(100) NOT NULL,
	"title_en" varchar(100),
	"description" text,
	"icon_name" varchar(50),
	"color_hex" varchar(7),
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "academy_hub_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge_key" varchar(50) NOT NULL,
	"title_tr" varchar(100) NOT NULL,
	"description_tr" text,
	"icon_name" varchar(50),
	"category" varchar(20) NOT NULL,
	"condition" jsonb,
	"points" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "badges_badge_key_unique" UNIQUE("badge_key")
);
--> statement-breakpoint
CREATE TABLE "branch_feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"submitted_by_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'yeni',
	"response" text,
	"responded_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "career_score_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"score_month" varchar(7) NOT NULL,
	"training_score" real DEFAULT 0,
	"practical_score" real DEFAULT 0,
	"attendance_score" real DEFAULT 0,
	"manager_score" real DEFAULT 0,
	"composite_score" real DEFAULT 0,
	"career_level_id" integer,
	"danger_zone" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_key" varchar(50) NOT NULL,
	"title_tr" varchar(150) NOT NULL,
	"description_tr" text,
	"xp_reward" integer DEFAULT 10,
	"target_count" integer DEFAULT 1,
	"mission_type" varchar(30) NOT NULL,
	"condition" jsonb,
	"icon_name" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "external_user_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"role" varchar(30) DEFAULT 'viewer',
	"can_view_budget" boolean DEFAULT false,
	"can_view_tasks" boolean DEFAULT true,
	"can_comment" boolean DEFAULT true,
	"can_upload_files" boolean DEFAULT false,
	"granted_by_id" varchar,
	"granted_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "external_user_projects_unique" UNIQUE("external_user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "external_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"company_name" varchar(200),
	"phone_number" varchar(20),
	"specialty" varchar(100),
	"access_token" varchar(255),
	"token_expires_at" timestamp,
	"last_login_at" timestamp,
	"is_active" boolean DEFAULT true,
	"invited_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "external_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_key" varchar(20) NOT NULL,
	"total_xp" integer DEFAULT 0,
	"quiz_count" integer DEFAULT 0,
	"perfect_quiz_count" integer DEFAULT 0,
	"streak_days" integer DEFAULT 0,
	"rank" integer,
	"branch_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leaderboard_snapshots_unique" UNIQUE("user_id","period_type","period_key")
);
--> statement-breakpoint
CREATE TABLE "learning_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"total_active_days" integer DEFAULT 0 NOT NULL,
	"weekly_goal_target" integer DEFAULT 5 NOT NULL,
	"weekly_goal_progress" integer DEFAULT 0 NOT NULL,
	"monthly_xp" integer DEFAULT 0 NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "learning_streaks_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "lost_found_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"found_by_id" varchar NOT NULL,
	"found_date" date NOT NULL,
	"found_time" time NOT NULL,
	"found_area" varchar(100) NOT NULL,
	"item_description" text NOT NULL,
	"photo_url" text,
	"notes" text,
	"status" varchar(20) DEFAULT 'bulunan' NOT NULL,
	"owner_name" varchar(100),
	"owner_phone" varchar(20),
	"handover_date" timestamp,
	"handovered_by_id" varchar,
	"handover_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manager_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar NOT NULL,
	"evaluator_id" varchar NOT NULL,
	"branch_id" integer,
	"evaluation_month" varchar(7) NOT NULL,
	"customer_service_score" integer DEFAULT 3,
	"teamwork_score" integer DEFAULT 3,
	"punctuality_score" integer DEFAULT 3,
	"communication_score" integer DEFAULT 3,
	"initiative_score" integer DEFAULT 3,
	"cleanliness_score" integer DEFAULT 3,
	"technical_skill_score" integer DEFAULT 3,
	"attitude_score" integer DEFAULT 3,
	"overall_score" real DEFAULT 0,
	"notes" text,
	"promotion_recommendation" varchar(20) DEFAULT 'hold',
	"warning_issued" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "phase_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer NOT NULL,
	"user_id" varchar,
	"external_user_id" integer,
	"raci_role" varchar(20) NOT NULL,
	"can_edit_phase" boolean DEFAULT false,
	"can_manage_tasks" boolean DEFAULT false,
	"assigned_by_id" varchar,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "phase_sub_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer NOT NULL,
	"parent_id" integer,
	"is_category" boolean DEFAULT false,
	"title" varchar(300) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'not_started',
	"sort_order" integer DEFAULT 0,
	"due_date" date,
	"assignee_user_id" varchar,
	"assignee_external_id" integer,
	"requires_bidding" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "procurement_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sub_task_id" integer NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"specifications" text,
	"quantity" integer DEFAULT 1,
	"unit" varchar(50),
	"estimated_budget" integer,
	"status" varchar(30) DEFAULT 'draft',
	"bidding_deadline" timestamp,
	"selected_proposal_id" integer,
	"awarded_at" timestamp,
	"awarded_by_id" varchar,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "procurement_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"procurement_item_id" integer NOT NULL,
	"vendor_id" integer,
	"vendor_name" varchar(200),
	"vendor_phone" varchar(30),
	"vendor_email" varchar(255),
	"vendor_company" varchar(200),
	"proposed_price" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"delivery_days" integer,
	"warranty_months" integer,
	"specifications" text,
	"notes" text,
	"attachment_urls" text[],
	"status" varchar(30) DEFAULT 'submitted',
	"submitted_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by_id" varchar,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_budget_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"phase_id" integer,
	"category" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"planned_amount" integer DEFAULT 0,
	"actual_amount" integer DEFAULT 0,
	"paid_amount" integer DEFAULT 0,
	"payment_status" varchar(30) DEFAULT 'pending',
	"due_date" date,
	"paid_at" timestamp,
	"vendor_id" integer,
	"invoice_no" varchar(100),
	"notes" text,
	"is_contingency" boolean DEFAULT false,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_id" integer,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"attachment_url" text,
	"is_system_message" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(30) DEFAULT 'contributor',
	"can_manage_team" boolean DEFAULT false,
	"can_delete_tasks" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now(),
	"removed_at" timestamp,
	CONSTRAINT "project_members_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"due_date" date,
	"status" varchar(30) DEFAULT 'pending',
	"completed_at" timestamp,
	"color_hex" varchar(7) DEFAULT '#6366f1',
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"phase_type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'not_started',
	"progress" integer DEFAULT 0,
	"order_index" integer DEFAULT 0,
	"start_date" date,
	"target_date" date,
	"completed_at" timestamp,
	"color_hex" varchar(7) DEFAULT '#6366f1',
	"is_custom" boolean DEFAULT false,
	"icon_name" varchar(50),
	"responsible_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_risks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"phase_id" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"probability" integer DEFAULT 3,
	"impact" integer DEFAULT 3,
	"severity" varchar(20) DEFAULT 'medium',
	"status" varchar(30) DEFAULT 'identified',
	"mitigation_plan" text,
	"contingency_plan" text,
	"responsible_user_id" varchar,
	"identified_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_task_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"depends_on_task_id" integer NOT NULL,
	"dependency_type" varchar(30) DEFAULT 'finish_to_start',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "task_dependencies_unique" UNIQUE("task_id","depends_on_task_id")
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"parent_task_id" integer,
	"milestone_id" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'todo',
	"priority" varchar(20) DEFAULT 'medium',
	"assigned_to_id" varchar,
	"created_by_id" varchar NOT NULL,
	"due_date" date,
	"start_date" date,
	"estimated_hours" integer,
	"actual_hours" integer,
	"completed_at" timestamp,
	"order_index" integer DEFAULT 0,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"vendor_type" varchar(50) NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(200),
	"contact_phone" varchar(20),
	"contact_email" varchar(255),
	"address" text,
	"tax_number" varchar(50),
	"contract_status" varchar(30) DEFAULT 'pending',
	"contract_amount" integer,
	"contract_start_date" date,
	"contract_end_date" date,
	"responsibility_area" text,
	"notes" text,
	"rating" integer,
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"project_type" varchar(30) DEFAULT 'standard',
	"status" varchar(30) DEFAULT 'planning',
	"priority" varchar(20) DEFAULT 'medium',
	"owner_id" varchar NOT NULL,
	"branch_id" integer,
	"start_date" date,
	"target_date" date,
	"completed_at" timestamp,
	"tags" text[],
	"city_name" varchar(100),
	"location_address" text,
	"estimated_budget" integer,
	"actual_budget" integer,
	"franchisee_name" varchar(200),
	"franchisee_phone" varchar(20),
	"franchisee_email" varchar(255),
	"contract_signed_at" timestamp,
	"target_opening_date" date,
	"actual_opening_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"quiz_id" varchar(100) NOT NULL,
	"score" integer NOT NULL,
	"answers" jsonb,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" varchar(100) NOT NULL,
	"title_tr" varchar(200) NOT NULL,
	"description_tr" text,
	"career_level_id" integer NOT NULL,
	"difficulty" varchar(20) DEFAULT 'medium',
	"estimated_minutes" integer DEFAULT 30,
	"passing_score" integer DEFAULT 70,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "quizzes_quiz_id_unique" UNIQUE("quiz_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"title_tr" varchar(100) NOT NULL,
	"title_en" varchar(100),
	"description" text,
	"icon_name" varchar(50),
	"color_hex" varchar(7),
	"display_order" integer DEFAULT 0,
	"banner_image_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "recipe_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recipe_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "recipe_notifications_unique" UNIQUE("recipe_id","version_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"effective_from" timestamp DEFAULT now(),
	"updated_by_id" varchar,
	"change_log" text,
	"changed_fields" jsonb DEFAULT '[]'::jsonb,
	"sizes" jsonb,
	"ingredients" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"cooking_steps" jsonb DEFAULT '[]'::jsonb,
	"preparation_notes" text,
	"serving_instructions" text,
	"storage_info" text,
	"season_info" varchar(100),
	"is_approved" boolean DEFAULT false,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "recipe_versions_unique" UNIQUE("recipe_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name_tr" varchar(150) NOT NULL,
	"name_en" varchar(150),
	"description" text,
	"coffee_type" varchar(50),
	"has_coffee" boolean DEFAULT true,
	"has_milk" boolean DEFAULT false,
	"difficulty" varchar(20) DEFAULT 'easy',
	"estimated_minutes" integer DEFAULT 3,
	"required_role" varchar(50),
	"photo_url" text,
	"infographic_url" text,
	"marketing_text" text,
	"sales_tips" text,
	"presentation_notes" text,
	"storage_conditions" text,
	"upselling_notes" text,
	"important_notes" text,
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"tags" varchar(50)[],
	"sub_category" varchar(20),
	"current_version_id" integer,
	"ai_embedding" vector(1536),
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "recipes_category_code_unique" UNIQUE("category_id","code")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"badge_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now(),
	"progress" integer DEFAULT 0,
	CONSTRAINT "user_badges_unique" UNIQUE("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_career_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"current_career_level_id" integer NOT NULL,
	"completed_module_ids" integer[] DEFAULT ARRAY[]::integer[],
	"average_quiz_score" real DEFAULT 0,
	"total_quizzes_attempted" integer DEFAULT 0,
	"last_exam_request_id" integer,
	"promotion_eligible_at" timestamp,
	"training_score" real DEFAULT 0,
	"practical_score" real DEFAULT 0,
	"attendance_score" real DEFAULT 0,
	"manager_score" real DEFAULT 0,
	"composite_score" real DEFAULT 0,
	"danger_zone_months" integer DEFAULT 0,
	"last_warning_date" timestamp,
	"status_demoted_at" timestamp,
	"status_demoted_from" integer,
	"last_updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_career_progress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_mission_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"mission_id" integer NOT NULL,
	"current_count" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"xp_earned" integer DEFAULT 0,
	"mission_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_mission_progress_unique" UNIQUE("user_id","mission_id","mission_date")
);
--> statement-breakpoint
CREATE TABLE "user_practice_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_date" date NOT NULL,
	"quizzes_completed" integer DEFAULT 0,
	"recipes_viewed" integer DEFAULT 0,
	"modules_completed" integer DEFAULT 0,
	"xp_earned" integer DEFAULT 0,
	"time_spent_minutes" integer DEFAULT 0,
	"streak_day" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_practice_sessions_unique" UNIQUE("user_id","session_date")
);
--> statement-breakpoint
CREATE TABLE "ai_report_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"summary" text NOT NULL,
	"key_findings" jsonb,
	"recommendations" jsonb,
	"visual_insights" jsonb,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) DEFAULT 'openai' NOT NULL,
	"is_active" boolean DEFAULT true,
	"openai_api_key" text,
	"openai_chat_model" varchar(100) DEFAULT 'gpt-4o',
	"openai_embedding_model" varchar(100) DEFAULT 'text-embedding-3-small',
	"openai_vision_model" varchar(100) DEFAULT 'gpt-4o',
	"gemini_api_key" text,
	"gemini_chat_model" varchar(100) DEFAULT 'gemini-2.0-flash',
	"gemini_embedding_model" varchar(100) DEFAULT 'text-embedding-004',
	"gemini_vision_model" varchar(100) DEFAULT 'gemini-2.0-flash',
	"anthropic_api_key" text,
	"anthropic_chat_model" varchar(100) DEFAULT 'claude-sonnet-4-20250514',
	"anthropic_vision_model" varchar(100) DEFAULT 'claude-sonnet-4-20250514',
	"temperature" real DEFAULT 0.7,
	"max_tokens" integer DEFAULT 2000,
	"rate_limit_per_minute" integer DEFAULT 60,
	"last_embedding_provider" varchar(30),
	"needs_reembed" boolean DEFAULT false,
	"updated_by_id" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"image_url" text,
	"link_url" text,
	"target_roles" text[],
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_comparisons" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"branch1_id" integer NOT NULL,
	"branch2_id" integer NOT NULL,
	"metric" varchar(100) NOT NULL,
	"branch1_value" numeric,
	"branch2_value" numeric,
	"difference" numeric,
	"percent_difference" numeric,
	"trend" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "detailed_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"report_type" varchar(50) NOT NULL,
	"branch_ids" integer[],
	"date_range" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"filters" jsonb,
	"chart_type" varchar(50),
	"include_ai_summary" boolean DEFAULT false,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"smtp_host" varchar(255),
	"smtp_port" integer DEFAULT 587,
	"smtp_user" varchar(255),
	"smtp_password" varchar(255),
	"smtp_from_email" varchar(255),
	"smtp_from_name" varchar(255) DEFAULT 'DOSPRESSO',
	"smtp_secure" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"updated_by_id" varchar,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_benefits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"meal_benefit_type" varchar(20) DEFAULT 'none',
	"meal_benefit_amount" integer DEFAULT 0,
	"transport_benefit_type" varchar(20) DEFAULT 'none',
	"transport_benefit_amount" integer DEFAULT 0,
	"bonus_eligible" boolean DEFAULT true,
	"bonus_percentage" numeric DEFAULT '0',
	"disability_discount" boolean DEFAULT false,
	"disability_degree" integer,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"total_days" integer DEFAULT 14 NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"remaining_days" integer DEFAULT 14 NOT NULL,
	"carried_over" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_salaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"base_salary" integer NOT NULL,
	"net_salary" integer,
	"employment_type" varchar(20) DEFAULT 'fulltime' NOT NULL,
	"weekly_hours" integer DEFAULT 45 NOT NULL,
	"hourly_rate" integer,
	"payment_day" integer DEFAULT 1,
	"bank_name" varchar(100),
	"iban" varchar(34),
	"tax_rate" numeric DEFAULT '0',
	"insurance_rate" numeric DEFAULT '0',
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_tax_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"gross_salary" integer NOT NULL,
	"sgk_base" integer NOT NULL,
	"tax_base" integer NOT NULL,
	"cumulative_tax_base" integer NOT NULL,
	"cumulative_income_tax" integer NOT NULL,
	"applied_tax_bracket" integer DEFAULT 1 NOT NULL,
	"minimum_wage_exemption" integer DEFAULT 0,
	"stamp_tax_exemption" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employee_tax_ledger_user_year_month_unique" UNIQUE("user_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "employee_terminations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"termination_type" varchar(50) NOT NULL,
	"termination_date" date NOT NULL,
	"termination_reason" text,
	"last_work_day" date,
	"notice_given" integer,
	"final_salary" integer,
	"severance_payment" integer,
	"other_payments" integer,
	"total_payment" integer,
	"returned_items" text,
	"exit_interview" text,
	"performance_rating" integer,
	"recommendation" text,
	"processed_by_id" varchar NOT NULL,
	"approved_by_id" varchar,
	"documents" text[],
	"notes" text,
	"notice_end_date" date,
	"severance_eligible" boolean DEFAULT false,
	"notice_period_days" integer,
	"termination_sub_reason" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "external_user_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_user_id" integer NOT NULL,
	"project_id" integer,
	"action" varchar(100) NOT NULL,
	"details" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"interview_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer" text,
	"score" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"interview_type" varchar(50) NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"duration" integer DEFAULT 30,
	"location" text,
	"interviewer_id" varchar NOT NULL,
	"additional_interviewers" text,
	"status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"result" varchar(30),
	"feedback" text,
	"rating" integer,
	"strengths" text,
	"weaknesses" text,
	"recommendation" text,
	"notes" text,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_id" integer NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30) NOT NULL,
	"tckn" varchar(11),
	"birth_date" date,
	"address" text,
	"resume_url" text,
	"cover_letter" text,
	"source" varchar(100),
	"referred_by_id" varchar,
	"experience" text,
	"education" varchar(200),
	"expected_salary" integer,
	"available_from" date,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"rating" integer,
	"notes" text,
	"rejection_reason" text,
	"created_by_id" varchar,
	"assigned_to_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"target_role" varchar(50) NOT NULL,
	"branch_id" integer,
	"department" varchar(100),
	"description" text,
	"requirements" text,
	"salary_min" integer,
	"salary_max" integer,
	"employment_type" varchar(50) DEFAULT 'fulltime',
	"headcount" integer DEFAULT 1,
	"hired_count" integer DEFAULT 0,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"deadline" date,
	"selected_application_id" integer,
	"closed_at" timestamp,
	"closed_reason" varchar(100),
	"created_by_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leave_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_payrolls" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"base_salary" integer NOT NULL,
	"worked_days" integer DEFAULT 0 NOT NULL,
	"worked_hours" integer DEFAULT 0 NOT NULL,
	"overtime_hours" integer DEFAULT 0,
	"overtime_pay" integer DEFAULT 0,
	"total_deductions" integer DEFAULT 0,
	"late_deductions" integer DEFAULT 0,
	"absence_deductions" integer DEFAULT 0,
	"unpaid_leave_deductions" integer DEFAULT 0,
	"sick_leave_deductions" integer DEFAULT 0,
	"other_deductions" integer DEFAULT 0,
	"tax_amount" integer DEFAULT 0,
	"insurance_employee" integer DEFAULT 0,
	"insurance_employer" integer DEFAULT 0,
	"unemployment_insurance" integer DEFAULT 0,
	"gross_salary" integer NOT NULL,
	"net_salary" integer NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"calculated_at" timestamp,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"payment_reference" varchar(100),
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payrolls_user_period_unique" UNIQUE("user_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "payroll_parameters" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"minimum_wage_gross" integer NOT NULL,
	"minimum_wage_net" integer NOT NULL,
	"sgk_employee_rate" integer DEFAULT 140 NOT NULL,
	"sgk_employer_rate" integer DEFAULT 205 NOT NULL,
	"unemployment_employee_rate" integer DEFAULT 10 NOT NULL,
	"unemployment_employer_rate" integer DEFAULT 20 NOT NULL,
	"stamp_tax_rate" integer DEFAULT 759 NOT NULL,
	"tax_bracket_1_limit" integer NOT NULL,
	"tax_bracket_1_rate" integer DEFAULT 150 NOT NULL,
	"tax_bracket_2_limit" integer NOT NULL,
	"tax_bracket_2_rate" integer DEFAULT 200 NOT NULL,
	"tax_bracket_3_limit" integer NOT NULL,
	"tax_bracket_3_rate" integer DEFAULT 270 NOT NULL,
	"tax_bracket_4_limit" integer NOT NULL,
	"tax_bracket_4_rate" integer DEFAULT 350 NOT NULL,
	"tax_bracket_5_rate" integer DEFAULT 400 NOT NULL,
	"meal_allowance_tax_exempt_daily" integer NOT NULL,
	"meal_allowance_sgk_exempt_daily" integer NOT NULL,
	"transport_allowance_exempt_daily" integer DEFAULT 0,
	"working_days_per_month" integer DEFAULT 30,
	"working_hours_per_day" integer DEFAULT 8,
	"overtime_multiplier" numeric DEFAULT '1.5',
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payroll_parameters_year_effective_unique" UNIQUE("year","effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"base_salary" integer NOT NULL,
	"overtime_minutes" integer DEFAULT 0,
	"overtime_rate" numeric DEFAULT '1.5',
	"overtime_amount" integer DEFAULT 0,
	"bonus_type" varchar(20) DEFAULT 'normal',
	"bonus_base" integer DEFAULT 0,
	"bonus_percentage" numeric DEFAULT '0',
	"bonus_amount" integer DEFAULT 0,
	"undertime_minutes" integer DEFAULT 0,
	"undertime_deduction" integer DEFAULT 0,
	"meal_allowance" integer DEFAULT 0,
	"transport_allowance" integer DEFAULT 0,
	"total_net_payable" integer NOT NULL,
	"gross_salary" integer DEFAULT 0,
	"sgk_employee" integer DEFAULT 0,
	"sgk_employer" integer DEFAULT 0,
	"unemployment_employee" integer DEFAULT 0,
	"unemployment_employer" integer DEFAULT 0,
	"income_tax" integer DEFAULT 0,
	"stamp_tax" integer DEFAULT 0,
	"cumulative_tax_base" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by_id" varchar,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payroll_records_user_period_unique" UNIQUE("user_id","period_year","period_month")
);
--> statement-breakpoint
CREATE TABLE "public_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"date" date NOT NULL,
	"year" integer NOT NULL,
	"is_half_day" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_deduction_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"calculation_type" varchar(20) NOT NULL,
	"default_amount" integer,
	"default_percentage" numeric,
	"per_minute_deduction" integer,
	"per_hour_deduction" integer,
	"per_day_deduction" integer,
	"is_automatic" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "salary_deduction_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "salary_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"payroll_id" integer,
	"deduction_type_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"reference_date" date NOT NULL,
	"reference_type" varchar(50),
	"reference_id" integer,
	"late_minutes" integer,
	"absent_hours" integer,
	"absent_days" integer,
	"is_automatic" boolean DEFAULT true,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"smtp_host" varchar(255),
	"smtp_port" integer DEFAULT 587,
	"smtp_user" varchar(255),
	"smtp_password" varchar(255),
	"smtp_from_email" varchar(255),
	"smtp_from_name" varchar(255) DEFAULT 'DOSPRESSO Teknik',
	"smtp_secure" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"updated_by_id" varchar,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_corrections" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer,
	"session_id" integer,
	"corrected_by_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"correction_type" varchar(50) NOT NULL,
	"field_changed" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"reason" text NOT NULL,
	"branch_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"author_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"scope" varchar(20) DEFAULT 'all' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_deletable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "titles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "trend_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"branch_id" integer,
	"metric_name" varchar(100) NOT NULL,
	"date" date NOT NULL,
	"value" numeric NOT NULL,
	"previous_value" numeric,
	"change_percent" numeric,
	"target" numeric,
	"status" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"approved_quantity" integer,
	"unit" varchar(20) DEFAULT 'adet',
	"unit_price" integer NOT NULL,
	"total_price" integer NOT NULL,
	"delivered_quantity" integer DEFAULT 0,
	"batch_id" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "branch_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"branch_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"requested_by_id" varchar NOT NULL,
	"processed_by_id" varchar,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"shipment_id" integer,
	"requested_delivery_date" date,
	"actual_delivery_date" date,
	"total_amount" integer DEFAULT 0,
	"notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "branch_shift_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"event_time" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_shift_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"check_out_time" timestamp,
	"work_minutes" integer DEFAULT 0,
	"break_minutes" integer DEFAULT 0,
	"net_work_minutes" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"shift_attendance_id" integer,
	"notes" text,
	"check_in_latitude" numeric(10, 7),
	"check_in_longitude" numeric(10, 7),
	"check_out_latitude" numeric(10, 7),
	"check_out_longitude" numeric(10, 7),
	"is_location_verified" boolean DEFAULT false,
	"location_distance" integer,
	"gps_fallback_used" boolean DEFAULT false,
	"gps_fallback_approved_by" varchar,
	"planned_shift_id" integer,
	"late_minutes" integer DEFAULT 0,
	"early_leave_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"checkin_method" varchar(10) DEFAULT 'pin' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_staff_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"hashed_pin" varchar(255) NOT NULL,
	"pin_failed_attempts" integer DEFAULT 0,
	"pin_locked_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_staff_pins_user_branch_unique" UNIQUE("user_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "factory_ai_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_type" varchar(30) NOT NULL,
	"report_scope" varchar(20) NOT NULL,
	"target_user_id" text,
	"target_station_id" integer,
	"period_start" date,
	"period_end" date,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"recommendations" text[],
	"details" jsonb,
	"generated_by" text,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_break_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_event_id" integer,
	"user_id" text NOT NULL,
	"session_id" integer NOT NULL,
	"break_reason" varchar(30) NOT NULL,
	"target_station_id" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"duration_minutes" integer,
	"auto_flagged" boolean DEFAULT false,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "factory_daily_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"target_date" date NOT NULL,
	"target_quantity" integer NOT NULL,
	"actual_quantity" integer DEFAULT 0,
	"waste_quantity" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_daily_targets_station_date_unique" UNIQUE("station_id","target_date")
);
--> statement-breakpoint
CREATE TABLE "factory_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"batch_id" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0,
	"last_updated_by_id" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_inventory_product_batch_unique" UNIQUE("product_id","batch_id")
);
--> statement-breakpoint
CREATE TABLE "factory_product_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"old_base_price" numeric(12, 2),
	"new_base_price" numeric(12, 2),
	"old_suggested_price" numeric(12, 2),
	"new_suggested_price" numeric(12, 2),
	"change_percent" numeric(8, 2),
	"source" varchar(30) NOT NULL,
	"source_reference_id" integer,
	"notes" text,
	"changed_by_id" varchar,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_production_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_event_id" integer,
	"session_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"station_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text,
	"produced_quantity" numeric(10, 2) NOT NULL,
	"produced_unit" varchar(20) NOT NULL,
	"waste_quantity" numeric(10, 2) DEFAULT '0',
	"waste_unit" varchar(20),
	"waste_reason_id" integer,
	"waste_notes" text,
	"waste_dough_kg" numeric(8, 2),
	"waste_product_count" integer,
	"duration_minutes" integer,
	"photo_url" text,
	"photo_verified" boolean DEFAULT false,
	"quality_status" varchar(20) DEFAULT 'pending',
	"quality_checked_by" text,
	"quality_checked_at" timestamp,
	"quality_notes" text,
	"product_recipe_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_production_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_date" date NOT NULL,
	"product_id" integer NOT NULL,
	"station_id" integer,
	"target_quantity" integer NOT NULL,
	"unit" varchar(20) DEFAULT 'adet',
	"priority" varchar(20) DEFAULT 'normal',
	"actual_quantity" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'planned',
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_production_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"station_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"quantity_produced" integer DEFAULT 0 NOT NULL,
	"quantity_waste" integer DEFAULT 0 NOT NULL,
	"waste_reason" text,
	"quality_score" integer,
	"quality_notes" text,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"sku" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"sub_category" varchar(100),
	"unit" varchar(20) NOT NULL,
	"unit_price" integer DEFAULT 0,
	"min_stock" integer DEFAULT 0,
	"current_stock" integer DEFAULT 0,
	"max_stock_level" integer DEFAULT 0,
	"description" text,
	"is_active" boolean DEFAULT true,
	"package_quantity" integer DEFAULT 1,
	"base_price" numeric(12, 2) DEFAULT '0',
	"suggested_price" numeric(12, 2) DEFAULT '0',
	"current_selling_price" numeric(12, 2) DEFAULT '0',
	"profit_margin" numeric(5, 2) DEFAULT '1.01',
	"is_temporarily_stopped" boolean DEFAULT false,
	"is_new_product" boolean DEFAULT false,
	"requires_food_engineer_approval" boolean DEFAULT false,
	"allergens" text[],
	"product_type" varchar(20) DEFAULT 'mamul',
	"parent_product_id" integer,
	"conversion_ratio" numeric(10, 4) DEFAULT '1',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "factory_quality_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"assigned_stations" integer[],
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text,
	CONSTRAINT "factory_quality_assignments_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "factory_quality_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_output_id" integer NOT NULL,
	"inspector_id" text NOT NULL,
	"producer_id" text NOT NULL,
	"station_id" integer NOT NULL,
	"decision" varchar(20) NOT NULL,
	"decision_reason" text,
	"notes" text,
	"visual_inspection" varchar(20),
	"taste_test" varchar(20),
	"texture_check" varchar(20),
	"weight_check" varchar(20),
	"temperature_check" varchar(20),
	"packaging_integrity" varchar(20),
	"allergen_check" boolean DEFAULT false,
	"haccp_compliance" boolean DEFAULT true,
	"inspector_notes" text,
	"corrective_action" text,
	"hold_reason" text,
	"food_engineer_approval" boolean DEFAULT false,
	"food_engineer_id" varchar(255),
	"food_engineer_approved_at" timestamp,
	"checked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_quality_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"quality_check_id" integer NOT NULL,
	"spec_id" integer NOT NULL,
	"numeric_value" numeric(10, 2),
	"boolean_value" boolean,
	"text_value" text,
	"passed" boolean NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_quality_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"quality_check_id" integer NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"media_url" text NOT NULL,
	"caption" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_quality_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"product_id" integer,
	"name" text NOT NULL,
	"description" text,
	"measurement_type" varchar(30) NOT NULL,
	"unit" varchar(20),
	"min_value" numeric(10, 2),
	"max_value" numeric(10, 2),
	"target_value" numeric(10, 2),
	"is_required" boolean DEFAULT true,
	"require_photo" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_session_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"station_id" integer,
	"event_type" varchar(30) NOT NULL,
	"break_reason" varchar(30),
	"break_duration_minutes" integer,
	"produced_quantity" numeric(10, 2),
	"produced_unit" varchar(20),
	"waste_quantity" numeric(10, 2),
	"waste_unit" varchar(20),
	"waste_reason_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_shift_compliance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"factory_session_id" integer,
	"shift_attendance_id" integer,
	"planned_start_time" timestamp NOT NULL,
	"planned_end_time" timestamp NOT NULL,
	"planned_break_minutes" integer DEFAULT 60,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"actual_break_minutes" integer DEFAULT 0,
	"lateness_minutes" integer DEFAULT 0,
	"early_leave_minutes" integer DEFAULT 0,
	"break_overage_minutes" integer DEFAULT 0,
	"unauthorized_break_minutes" integer DEFAULT 0,
	"total_worked_minutes" integer DEFAULT 0,
	"effective_worked_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"missing_minutes" integer DEFAULT 0,
	"compliance_score" integer DEFAULT 100,
	"compliance_status" varchar(30) DEFAULT 'compliant',
	"overtime_approved" boolean DEFAULT false,
	"overtime_approved_by" text,
	"overtime_approved_at" timestamp,
	"reported_to_accounting" boolean DEFAULT false,
	"reported_to_accounting_at" timestamp,
	"ai_suggestion" text,
	"ai_suggestion_generated_at" timestamp,
	"notes" text,
	"work_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_shift_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"station_id" integer,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"check_out_time" timestamp,
	"total_produced" integer DEFAULT 0,
	"total_waste" integer DEFAULT 0,
	"work_minutes" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"phase" varchar(20) DEFAULT 'hazirlik',
	"prep_started_at" timestamp,
	"prod_started_at" timestamp,
	"clean_started_at" timestamp,
	"prod_ended_at" timestamp,
	"prep_duration_minutes" integer,
	"prod_duration_minutes" integer,
	"clean_duration_minutes" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_staff_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"hashed_pin" varchar(255) NOT NULL,
	"pin_failed_attempts" integer DEFAULT 0,
	"pin_locked_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_staff_pins_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "factory_station_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_name" varchar(200) NOT NULL,
	"station_key" varchar(100) NOT NULL,
	"min_workers" integer DEFAULT 1 NOT NULL,
	"max_workers" integer DEFAULT 4 NOT NULL,
	"benchmark_workers" integer NOT NULL,
	"output_per_hour" integer NOT NULL,
	"output_unit" varchar(50) DEFAULT 'adet' NOT NULL,
	"prep_time_minutes" integer DEFAULT 15 NOT NULL,
	"clean_time_minutes" integer DEFAULT 15 NOT NULL,
	"waste_tolerance_percent" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"warning_threshold_percent" numeric(5, 2) DEFAULT '70.00' NOT NULL,
	"star_threshold_percent" numeric(5, 2) DEFAULT '120.00' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_station_benchmarks_station_key_unique" UNIQUE("station_key")
);
--> statement-breakpoint
CREATE TABLE "factory_station_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"target_quantity" numeric(10, 2) NOT NULL,
	"target_unit" varchar(20) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"category" varchar(50),
	"product_type_id" integer,
	"target_hourly_output" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "factory_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(30) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "factory_team_members_team_user_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "factory_team_session_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_session_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"shift_session_id" integer,
	"role" varchar(30) DEFAULT 'member',
	"contribution_percent" integer DEFAULT 100,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "factory_team_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"total_produced" integer DEFAULT 0,
	"total_waste" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"station_id" integer,
	"leader_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_waste_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"category" varchar(50),
	"description" text,
	"severity_score" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_waste_reasons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "factory_weekly_attendance_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"planned_total_minutes" integer DEFAULT 2700,
	"actual_total_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"missing_minutes" integer DEFAULT 0,
	"work_days_count" integer DEFAULT 0,
	"absent_days_count" integer DEFAULT 0,
	"late_days_count" integer DEFAULT 0,
	"weekly_compliance_score" integer DEFAULT 100,
	"reported_to_accounting" boolean DEFAULT false,
	"reported_to_accounting_at" timestamp,
	"accounting_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_weekly_summary_user_week_unique" UNIQUE("user_id","week_start_date")
);
--> statement-breakpoint
CREATE TABLE "factory_worker_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period_date" date NOT NULL,
	"period_type" varchar(20) DEFAULT 'daily',
	"production_score" numeric(5, 2),
	"waste_score" numeric(5, 2),
	"quality_score" numeric(5, 2),
	"attendance_score" numeric(5, 2),
	"break_score" numeric(5, 2),
	"total_score" numeric(5, 2),
	"total_produced" numeric(10, 2),
	"total_waste" numeric(10, 2),
	"total_break_minutes" integer,
	"special_break_count" integer DEFAULT 0,
	"generated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_worker_scores_user_date_unique" UNIQUE("user_id","period_date","period_type")
);
--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_number" varchar(50) NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit" varchar(20) NOT NULL,
	"production_date" date NOT NULL,
	"expiry_date" date,
	"status" varchar(30) DEFAULT 'planned' NOT NULL,
	"quality_score" integer,
	"quality_notes" text,
	"produced_by_id" varchar,
	"approved_by_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
CREATE TABLE "role_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"domain" varchar(30) NOT NULL,
	"base_role" varchar(50) NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_deletable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "role_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ai_system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "branch_break_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"break_start_time" timestamp NOT NULL,
	"break_end_time" timestamp,
	"break_duration_minutes" integer DEFAULT 0,
	"break_type" varchar(30) DEFAULT 'regular',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_kiosk_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"kiosk_password" varchar(255) NOT NULL,
	"default_shift_start_time" varchar(5) DEFAULT '08:00',
	"default_shift_end_time" varchar(5) DEFAULT '18:00',
	"default_break_minutes" integer DEFAULT 60,
	"max_break_minutes" integer DEFAULT 90,
	"late_tolerance_minutes" integer DEFAULT 15,
	"early_leave_tolerance_minutes" integer DEFAULT 15,
	"auto_close_time" varchar(5) DEFAULT '22:00',
	"is_kiosk_enabled" boolean DEFAULT true NOT NULL,
	"kiosk_mode" varchar(10) DEFAULT 'pin' NOT NULL,
	"allow_pin" boolean DEFAULT true NOT NULL,
	"allow_qr" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_kiosk_settings_branch_id_unique" UNIQUE("branch_id")
);
--> statement-breakpoint
CREATE TABLE "branch_monthly_payroll_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"total_work_days" integer DEFAULT 0,
	"total_work_minutes" integer DEFAULT 0,
	"total_break_minutes" integer DEFAULT 0,
	"total_net_work_minutes" integer DEFAULT 0,
	"total_overtime_minutes" integer DEFAULT 0,
	"total_missing_minutes" integer DEFAULT 0,
	"absent_days" integer DEFAULT 0,
	"late_days" integer DEFAULT 0,
	"early_leave_days" integer DEFAULT 0,
	"paid_leave_days" integer DEFAULT 0,
	"unpaid_leave_days" integer DEFAULT 0,
	"sick_leave_days" integer DEFAULT 0,
	"public_holiday_days" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'draft',
	"finalized_by_id" varchar,
	"finalized_at" timestamp,
	"exported_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_monthly_payroll_user_month_unique" UNIQUE("user_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "branch_shift_daily_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"session_count" integer DEFAULT 0,
	"first_check_in" timestamp,
	"last_check_out" timestamp,
	"total_work_minutes" integer DEFAULT 0,
	"total_break_minutes" integer DEFAULT 0,
	"net_work_minutes" integer DEFAULT 0,
	"planned_work_minutes" integer DEFAULT 540,
	"overtime_minutes" integer DEFAULT 0,
	"missing_minutes" integer DEFAULT 0,
	"is_late" boolean DEFAULT false,
	"late_minutes" integer DEFAULT 0,
	"is_early_leave" boolean DEFAULT false,
	"early_leave_minutes" integer DEFAULT 0,
	"approval_status" varchar(20) DEFAULT 'pending',
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_daily_summary_user_date_unique" UNIQUE("user_id","work_date")
);
--> statement-breakpoint
CREATE TABLE "branch_weekly_attendance_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"planned_total_minutes" integer DEFAULT 2700,
	"actual_total_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"missing_minutes" integer DEFAULT 0,
	"work_days_count" integer DEFAULT 0,
	"absent_days_count" integer DEFAULT 0,
	"late_days_count" integer DEFAULT 0,
	"weekly_compliance_score" integer DEFAULT 100,
	"reported_to_accounting" boolean DEFAULT false,
	"reported_to_accounting_at" timestamp,
	"accounting_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_weekly_summary_user_week_unique" UNIQUE("user_id","week_start_date")
);
--> statement-breakpoint
CREATE TABLE "dashboard_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"context" varchar(20) NOT NULL,
	"context_id" integer NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'warning' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text,
	"payload" text,
	"related_user_id" varchar,
	"related_shift_id" integer,
	"related_checklist_id" integer,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"acknowledged_at" timestamp,
	"acknowledged_by_user_id" varchar,
	"resolved_at" timestamp,
	"resolved_by_user_id" varchar,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_of_month_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"final_score" integer NOT NULL,
	"performance_id" integer,
	"award_type" varchar(30) DEFAULT 'employee_of_month' NOT NULL,
	"award_title" varchar(100),
	"award_description" text,
	"certificate_url" text,
	"badge_id" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"announced_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "eom_award_branch_month_unique" UNIQUE("branch_id","month","year","award_type")
);
--> statement-breakpoint
CREATE TABLE "employee_of_month_weights" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"attendance_weight" integer DEFAULT 20 NOT NULL,
	"checklist_weight" integer DEFAULT 20 NOT NULL,
	"task_weight" integer DEFAULT 15 NOT NULL,
	"customer_rating_weight" integer DEFAULT 15 NOT NULL,
	"manager_rating_weight" integer DEFAULT 20 NOT NULL,
	"leave_deduction_weight" integer DEFAULT 10 NOT NULL,
	"bonus_max_points" integer DEFAULT 10,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_type" varchar(100) NOT NULL,
	"brand" varchar(100),
	"model" varchar(100),
	"category" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"keywords" text[],
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"purchase_order_id" integer,
	"supplier_id" integer NOT NULL,
	"receipt_date" timestamp DEFAULT now() NOT NULL,
	"supplier_invoice_number" varchar(100),
	"supplier_invoice_date" timestamp,
	"delivery_note_number" varchar(100),
	"status" varchar(30) DEFAULT 'beklemede' NOT NULL,
	"quality_check_required" boolean DEFAULT false,
	"quality_check_passed" boolean,
	"quality_check_notes" text,
	"quality_checked_by_id" varchar,
	"quality_checked_at" timestamp,
	"delivery_status" varchar(20),
	"expected_delivery_date" timestamp,
	"delivery_delay_days" integer DEFAULT 0,
	"supplier_quality_score" integer,
	"supplier_quality_notes" text,
	"notes" text,
	"received_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "goods_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "hq_shift_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"exit_reason" varchar(30),
	"exit_description" text,
	"estimated_return_time" timestamp,
	"event_time" timestamp DEFAULT now() NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hq_shift_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"check_out_time" timestamp,
	"work_minutes" integer DEFAULT 0,
	"break_minutes" integer DEFAULT 0,
	"net_work_minutes" integer DEFAULT 0,
	"outside_minutes" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"check_in_latitude" numeric(10, 7),
	"check_in_longitude" numeric(10, 7),
	"is_location_verified" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"sub_category" varchar(50),
	"unit" varchar(20) NOT NULL,
	"current_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"minimum_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"maximum_stock" numeric(12, 3),
	"reorder_point" numeric(12, 3),
	"unit_cost" numeric(10, 2) DEFAULT '0',
	"last_purchase_price" numeric(10, 2),
	"market_price" numeric(10, 2),
	"market_price_updated_at" timestamp,
	"material_type" varchar(10),
	"purchase_unit" varchar(20),
	"recipe_unit" varchar(20),
	"conversion_factor" numeric(12, 4),
	"warehouse_location" varchar(100),
	"storage_conditions" text,
	"shelf_life" integer,
	"barcode" varchar(100),
	"qr_code" varchar(255),
	"batch_tracking" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inventory_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"movement_type" varchar(30) NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"previous_stock" numeric(12, 3) NOT NULL,
	"new_stock" numeric(12, 3) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" integer,
	"from_location" varchar(100),
	"to_location" varchar(100),
	"batch_number" varchar(100),
	"expiry_date" timestamp,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"price_type" varchar(20) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"previous_price" numeric(12, 2),
	"change_percent" numeric(6, 2),
	"source" varchar(30) NOT NULL,
	"source_reference_id" integer,
	"effective_date" date NOT NULL,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_monthly_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"work_performance_rating" integer NOT NULL,
	"teamwork_rating" integer NOT NULL,
	"initiative_rating" integer NOT NULL,
	"customer_relations_rating" integer NOT NULL,
	"punctuality_rating" integer NOT NULL,
	"average_rating" numeric(3, 2) NOT NULL,
	"strengths" text,
	"areas_to_improve" text,
	"general_comment" text,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "manager_rating_unique" UNIQUE("manager_id","employee_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "mega_module_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"mega_module_id" varchar(50) NOT NULL,
	"mega_module_name" varchar(100) NOT NULL,
	"mega_module_name_tr" varchar(100) NOT NULL,
	"icon" varchar(50) NOT NULL,
	"color" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mega_module_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"mega_module_id" varchar(50) NOT NULL,
	"sub_module_id" varchar(100) NOT NULL,
	"sub_module_path" varchar(255) NOT NULL,
	"sub_module_name" varchar(100) NOT NULL,
	"sub_module_name_tr" varchar(100) NOT NULL,
	"icon" varchar(50),
	"tab_group" varchar(50),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_employee_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"attendance_score" integer DEFAULT 0,
	"checklist_score" integer DEFAULT 0,
	"task_score" integer DEFAULT 0,
	"customer_rating_score" integer DEFAULT 0,
	"manager_rating_score" integer DEFAULT 0,
	"total_shifts" integer DEFAULT 0,
	"on_time_shifts" integer DEFAULT 0,
	"late_shifts" integer DEFAULT 0,
	"absent_shifts" integer DEFAULT 0,
	"total_checklists" integer DEFAULT 0,
	"completed_checklists" integer DEFAULT 0,
	"on_time_checklists" integer DEFAULT 0,
	"total_tasks" integer DEFAULT 0,
	"completed_tasks" integer DEFAULT 0,
	"avg_task_rating" numeric(3, 2) DEFAULT '0',
	"total_customer_ratings" integer DEFAULT 0,
	"avg_customer_rating" numeric(3, 2) DEFAULT '0',
	"paid_leave_days" integer DEFAULT 0,
	"unpaid_leave_days" integer DEFAULT 0,
	"sick_leave_days" integer DEFAULT 0,
	"leave_deduction" integer DEFAULT 0,
	"bonus_points" integer DEFAULT 0,
	"final_score" integer DEFAULT 0,
	"branch_rank" integer,
	"status" varchar(20) DEFAULT 'calculating' NOT NULL,
	"calculated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "monthly_perf_user_month_unique" UNIQUE("user_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "product_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_product_code" varchar(100),
	"unit_price" numeric(12, 2) NOT NULL,
	"minimum_order_quantity" numeric(12, 3) DEFAULT '1',
	"lead_time_days" integer DEFAULT 3,
	"preference_order" integer DEFAULT 1,
	"is_primary" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '18',
	"discount_rate" numeric(5, 2) DEFAULT '0',
	"line_total" numeric(12, 2) NOT NULL,
	"delivered_quantity" numeric(12, 3) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"status" varchar(30) DEFAULT 'taslak' NOT NULL,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"delivery_address" text,
	"delivery_notes" text,
	"notes" text,
	"internal_notes" text,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "qr_checkin_nonces" (
	"id" serial PRIMARY KEY NOT NULL,
	"nonce" varchar(64) NOT NULL,
	"user_id" varchar NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qr_checkin_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "staff_qr_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"service_rating" integer NOT NULL,
	"friendliness_rating" integer NOT NULL,
	"speed_rating" integer NOT NULL,
	"overall_rating" integer NOT NULL,
	"comment" text,
	"customer_name" varchar(100),
	"customer_phone" varchar(20),
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"qr_token" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_qr_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"token" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_qr_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "staff_qr_tokens_staff_branch_unique" UNIQUE("staff_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"tax_number" varchar(20),
	"tax_office" varchar(100),
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"alternative_phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"bank_name" varchar(100),
	"iban" varchar(50),
	"payment_term_days" integer DEFAULT 30,
	"currency" varchar(10) DEFAULT 'TRY',
	"credit_limit" numeric(12, 2),
	"categories" text[],
	"performance_score" numeric(3, 1) DEFAULT '0',
	"on_time_delivery_rate" numeric(5, 2) DEFAULT '0',
	"quality_score" numeric(3, 1) DEFAULT '0',
	"total_orders" integer DEFAULT 0,
	"total_order_value" numeric(14, 2) DEFAULT '0',
	"status" varchar(30) DEFAULT 'aktif' NOT NULL,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cari_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_code" varchar(50) NOT NULL,
	"account_name" varchar(200) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"branch_id" integer,
	"supplier_id" integer,
	"contact_person" varchar(100),
	"phone" varchar(20),
	"email" varchar(100),
	"current_balance" numeric(15, 2) DEFAULT '0',
	"last_transaction_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cari_accounts_account_code_unique" UNIQUE("account_code")
);
--> statement-breakpoint
CREATE TABLE "cari_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"document_number" varchar(100),
	"document_type" varchar(50),
	"due_date" timestamp,
	"is_paid" boolean DEFAULT false,
	"paid_date" timestamp,
	"purchase_order_id" integer,
	"goods_receipt_id" integer,
	"created_by_id" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_module_visibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" varchar(100) NOT NULL,
	"display_location" varchar(50) DEFAULT 'menu' NOT NULL,
	"roles" text[],
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_role_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"widget_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"default_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "dashboard_role_widgets_role_widget_key" UNIQUE("role","widget_key")
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"widget_key" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"widget_type" varchar(50) NOT NULL,
	"size" varchar(20) DEFAULT 'medium' NOT NULL,
	"data_source" varchar(100) NOT NULL,
	"config" text,
	"roles" text[],
	"required_permissions" text[] DEFAULT '{}',
	"default_roles" text[] DEFAULT '{}',
	"category" varchar(50) DEFAULT 'genel',
	"component_key" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "dashboard_widgets_widget_key_unique" UNIQUE("widget_key")
);
--> statement-breakpoint
CREATE TABLE "event_triggered_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"priority" integer DEFAULT 2 NOT NULL,
	"target_url" varchar(300),
	"source_type" varchar(50) NOT NULL,
	"source_id" integer,
	"source_label" varchar(200),
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_auto_resolved" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_batch_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"machine_id" integer,
	"station_id" integer,
	"batch_weight_kg" numeric(10, 2) NOT NULL,
	"batch_weight_unit" varchar(10) DEFAULT 'kg' NOT NULL,
	"expected_pieces" integer NOT NULL,
	"piece_weight_grams" numeric(10, 2),
	"piece_weight_unit" varchar(10) DEFAULT 'g' NOT NULL,
	"target_duration_minutes" integer NOT NULL,
	"min_workers" integer DEFAULT 1,
	"max_workers" integer DEFAULT 4,
	"prep_duration_minutes" integer DEFAULT 15,
	"expected_waste_percent" numeric(5, 2) DEFAULT '5',
	"energy_kwh_per_batch" numeric(10, 2),
	"gas_m3_per_batch" numeric(10, 3),
	"water_l_per_batch" numeric(10, 1),
	"recipe_id" integer,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_batch_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"verifier_user_id" varchar NOT NULL,
	"verified_weight_kg" numeric(10, 2),
	"verified_pieces" integer,
	"verified_waste_kg" numeric(10, 2),
	"verified_waste_pieces" integer,
	"is_approved" boolean NOT NULL,
	"rejection_reason" text,
	"notes" text,
	"verified_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_cost_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" numeric(14, 4) NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_cost_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "factory_fixed_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"monthly_amount" numeric(14, 2) NOT NULL,
	"annual_amount" numeric(14, 2),
	"allocation_method" varchar(50) DEFAULT 'production_volume',
	"allocation_percentage" numeric(5, 2) DEFAULT '100',
	"effective_month" integer,
	"effective_year" integer,
	"is_recurring" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_machines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"kwh_consumption" numeric(10, 3) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_production_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_production_id" integer,
	"shift_id" integer,
	"product_id" integer NOT NULL,
	"machine_id" integer,
	"batch_spec_id" integer,
	"operator_user_id" varchar,
	"batch_number" integer DEFAULT 1,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"actual_weight_kg" numeric(10, 2),
	"actual_pieces" integer,
	"target_weight_kg" numeric(10, 2),
	"target_pieces" integer,
	"target_duration_minutes" integer,
	"actual_duration_minutes" integer,
	"waste_weight_kg" numeric(10, 2) DEFAULT '0',
	"waste_pieces" integer DEFAULT 0,
	"waste_reason_id" integer,
	"waste_notes" text,
	"expected_waste_percent" numeric(5, 2),
	"actual_waste_percent" numeric(5, 2),
	"waste_deviation_percent" numeric(5, 2),
	"total_input_weight_kg" numeric(10, 2),
	"total_output_weight_kg" numeric(10, 2),
	"waste_cost_tl" numeric(12, 2),
	"performance_score" numeric(5, 2),
	"yield_rate" numeric(5, 2),
	"photo_url" text,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_shift_productions" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"machine_id" integer,
	"batch_spec_id" integer,
	"planned_batch_count" integer DEFAULT 1 NOT NULL,
	"completed_batch_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_shift_workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"machine_id" integer,
	"product_id" integer,
	"role" varchar(30) DEFAULT 'operator',
	"self_selected" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_date" date NOT NULL,
	"shift_type" varchar(20) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(100) NOT NULL,
	"company" varchar(255),
	"email" varchar(255),
	"phone" varchar(30),
	"specialty" varchar(255),
	"access_token" varchar(255),
	"is_active" boolean DEFAULT true,
	"invited_at" timestamp DEFAULT now(),
	"last_access_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "franchise_project_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_id" integer,
	"author_user_id" varchar,
	"author_collaborator_id" integer,
	"content" text NOT NULL,
	"attachment_url" varchar(500),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_project_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"phase_number" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"start_date" date,
	"end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"completion_percentage" integer DEFAULT 0,
	"depends_on_phase_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"phase_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"assigned_to_user_id" varchar,
	"assigned_to_collaborator_id" integer,
	"due_date" date,
	"completed_at" timestamp,
	"raci_responsible" varchar(255),
	"raci_accountable" varchar(255),
	"raci_consulted" varchar(500),
	"raci_informed" varchar(500),
	"depends_on_task_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"franchisee_name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"contact_phone" varchar(30),
	"contact_email" varchar(255),
	"location" varchar(500),
	"city" varchar(100),
	"status" varchar(30) DEFAULT 'sozlesme' NOT NULL,
	"current_phase" integer DEFAULT 1,
	"total_phases" integer DEFAULT 7,
	"completion_percentage" integer DEFAULT 0,
	"estimated_budget" numeric(12, 2),
	"actual_budget" numeric(12, 2),
	"start_date" date,
	"expected_end_date" date,
	"actual_end_date" date,
	"branch_id" integer,
	"manager_id" varchar,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"goods_receipt_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"purchase_order_item_id" integer,
	"ordered_quantity" numeric(12, 3),
	"received_quantity" numeric(12, 3) NOT NULL,
	"accepted_quantity" numeric(12, 3),
	"rejected_quantity" numeric(12, 3) DEFAULT '0',
	"unit" varchar(20) NOT NULL,
	"unit_price" numeric(10, 2),
	"batch_number" varchar(100),
	"expiry_date" timestamp,
	"production_date" timestamp,
	"quality_status" varchar(30) DEFAULT 'beklemede',
	"quality_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "machine_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "management_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"period" varchar(20) NOT NULL,
	"branch_id" integer,
	"revenue" numeric(12, 2),
	"expenses" numeric(12, 2),
	"net_profit" numeric(12, 2),
	"employee_count" integer,
	"customer_count" integer,
	"average_ticket" numeric(8, 2),
	"notes" text,
	"ai_analysis" text,
	"status" varchar(20) DEFAULT 'draft',
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_cost_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"recipe_id" integer,
	"calculation_date" timestamp DEFAULT now() NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"raw_material_cost" numeric(12, 4) DEFAULT '0',
	"direct_labor_cost" numeric(12, 4) DEFAULT '0',
	"energy_cost" numeric(12, 4) DEFAULT '0',
	"packaging_cost" numeric(12, 4) DEFAULT '0',
	"overhead_cost" numeric(12, 4) DEFAULT '0',
	"total_unit_cost" numeric(12, 4) NOT NULL,
	"total_package_cost" numeric(12, 4) DEFAULT '0',
	"applied_margin" numeric(5, 2) DEFAULT '1.01',
	"suggested_selling_price" numeric(12, 2) DEFAULT '0',
	"actual_selling_price" numeric(12, 2) DEFAULT '0',
	"profit_per_unit" numeric(12, 4) DEFAULT '0',
	"profit_margin_percentage" numeric(5, 2) DEFAULT '0',
	"production_quantity" integer DEFAULT 0,
	"notes" text,
	"calculated_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_packaging_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"raw_material_id" integer,
	"name" varchar(255) NOT NULL,
	"unit" varchar(20) DEFAULT 'adet',
	"quantity" numeric(10, 3) DEFAULT '1',
	"unit_cost" numeric(10, 4) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"raw_material_id" integer NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"unit_cost" numeric(12, 4) DEFAULT '0',
	"total_cost" numeric(12, 4) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"recipe_type" varchar(20) DEFAULT 'OPEN',
	"output_quantity" numeric(12, 3) DEFAULT '1',
	"output_unit" varchar(20) DEFAULT 'adet',
	"production_time_minutes" integer DEFAULT 0,
	"labor_worker_count" integer DEFAULT 1,
	"labor_batch_size" integer DEFAULT 1,
	"labor_hourly_rate" numeric(10, 2) DEFAULT '0',
	"energy_kwh_per_batch" numeric(10, 3) DEFAULT '0',
	"equipment_description" text,
	"machine_id" integer,
	"expected_unit_weight" numeric(10, 3),
	"expected_unit_weight_unit" varchar(10) DEFAULT 'g',
	"expected_output_count" integer,
	"expected_waste_percent" numeric(5, 2),
	"waste_tolerance_percent" numeric(5, 2) DEFAULT '5',
	"raw_material_cost" numeric(12, 4) DEFAULT '0',
	"labor_cost" numeric(12, 4) DEFAULT '0',
	"energy_cost" numeric(12, 4) DEFAULT '0',
	"packaging_cost" numeric(12, 4) DEFAULT '0',
	"overhead_cost" numeric(12, 4) DEFAULT '0',
	"total_unit_cost" numeric(12, 4) DEFAULT '0',
	"cost_last_calculated" timestamp,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_cost_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_record_id" integer,
	"product_id" integer NOT NULL,
	"production_date" timestamp DEFAULT now() NOT NULL,
	"quantity" integer NOT NULL,
	"raw_material_cost_per_unit" numeric(12, 4) DEFAULT '0',
	"labor_cost_per_unit" numeric(12, 4) DEFAULT '0',
	"overhead_cost_per_unit" numeric(12, 4) DEFAULT '0',
	"total_cost_per_unit" numeric(12, 4) NOT NULL,
	"total_production_cost" numeric(14, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_record_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"planned_quantity" numeric(12, 3) NOT NULL,
	"used_quantity" numeric(12, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"deducted_from_stock" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_number" varchar(50) NOT NULL,
	"production_date" timestamp DEFAULT now() NOT NULL,
	"inventory_id" integer NOT NULL,
	"recipe_id" integer,
	"planned_quantity" numeric(12, 3) NOT NULL,
	"produced_quantity" numeric(12, 3) NOT NULL,
	"waste_quantity" numeric(12, 3) DEFAULT '0',
	"unit" varchar(20) NOT NULL,
	"batch_number" varchar(100),
	"expiry_date" timestamp,
	"status" varchar(30) DEFAULT 'tamamlandi',
	"ingredients_deducted" boolean DEFAULT false,
	"product_added_to_stock" boolean DEFAULT false,
	"notes" text,
	"produced_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_records_production_number_unique" UNIQUE("production_number")
);
--> statement-breakpoint
CREATE TABLE "professional_training_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" varchar(100) NOT NULL,
	"lesson_index" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"duration" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "professional_training_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"topic_id" varchar(100) NOT NULL,
	"lesson_index" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"quiz_score" integer,
	"quiz_passed" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "professional_training_quiz_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" varchar(100) NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profit_margin_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"default_margin" numeric(5, 2) NOT NULL,
	"minimum_margin" numeric(5, 2) DEFAULT '1.01',
	"maximum_margin" numeric(5, 2) DEFAULT '2.00',
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "raw_material_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"raw_material_id" integer NOT NULL,
	"supplier_id" integer,
	"previous_price" numeric(12, 4),
	"new_price" numeric(12, 4) NOT NULL,
	"change_percent" numeric(8, 2),
	"source" varchar(50) DEFAULT 'manual',
	"notes" text,
	"changed_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "raw_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"unit" varchar(20) NOT NULL,
	"current_unit_price" numeric(12, 4) DEFAULT '0',
	"last_purchase_price" numeric(12, 4) DEFAULT '0',
	"average_price" numeric(12, 4) DEFAULT '0',
	"price_last_updated" timestamp,
	"inventory_id" integer,
	"supplier_id" integer,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"is_keyblend" boolean DEFAULT false,
	"keyblend_cost" numeric(12, 4) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "raw_materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"cup_size" varchar(20) DEFAULT 'all',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"template_id" integer NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"period_date" varchar(10) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "role_task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"frequency" varchar(20) DEFAULT 'daily' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"icon" varchar(50),
	"target_url" varchar(200),
	"module_link" varchar(100),
	"detail_steps" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_count_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_count_id" integer NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"expected_quantity" varchar(50) DEFAULT '0' NOT NULL,
	"counted_quantity" varchar(50),
	"unit" varchar(20),
	"difference" varchar(50),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"count_type" varchar(20) DEFAULT 'raw_material' NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"started_by" varchar(255) NOT NULL,
	"approved_by" varchar(255),
	"assigned_to" varchar(255),
	"requested_by" varchar(255),
	"requested_category" varchar(50),
	"scope" varchar(30) DEFAULT 'full' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "career_gates" (
	"id" serial PRIMARY KEY NOT NULL,
	"gate_number" integer NOT NULL,
	"from_level_id" integer,
	"to_level_id" integer,
	"title_tr" varchar(200) NOT NULL,
	"description_tr" text,
	"quiz_id" integer,
	"quiz_passing_score" integer DEFAULT 80,
	"practical_checklist" jsonb DEFAULT '[]'::jsonb,
	"practical_approver" varchar(50) DEFAULT 'supervisor',
	"kpi_rules" jsonb DEFAULT '[]'::jsonb,
	"min_attendance_rate" integer DEFAULT 90,
	"attendance_period_days" integer DEFAULT 30,
	"min_days_in_level" integer DEFAULT 30,
	"retry_cooldown_days" integer DEFAULT 7,
	"max_retries" integer DEFAULT 3,
	"requires_supervisor" boolean DEFAULT true,
	"requires_coach" boolean DEFAULT true,
	"requires_cgo" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_pack_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pack_id" integer NOT NULL,
	"day_number" integer,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"content_type" varchar(30) NOT NULL,
	"training_module_id" integer,
	"quiz_id" integer,
	"recipe_id" integer,
	"title_override" varchar(200),
	"is_required" boolean DEFAULT true,
	"estimated_minutes" integer DEFAULT 15,
	"passing_score" integer DEFAULT 70,
	"requires_approval" boolean DEFAULT false,
	"approver_role" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_packs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description_tr" text,
	"target_role" varchar(50) NOT NULL,
	"pack_type" varchar(30) DEFAULT 'onboarding',
	"duration_days" integer,
	"is_mandatory" boolean DEFAULT true,
	"created_by" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_widget_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(500),
	"type" varchar(50) DEFAULT 'link' NOT NULL,
	"icon" varchar(100),
	"url" varchar(500),
	"target_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"equipment_type" varchar(100) NOT NULL,
	"brand" varchar(200),
	"model" varchar(200),
	"image_url" text,
	"usage_guide" text,
	"calibration_procedure" text,
	"calibration_interval_days" integer,
	"maintenance_interval_days" integer DEFAULT 30,
	"maintenance_guide" text,
	"troubleshoot_steps" jsonb DEFAULT '[]'::jsonb,
	"tips" text,
	"default_service_provider_name" varchar(255),
	"default_service_provider_phone" varchar(50),
	"default_service_provider_email" varchar(255),
	"default_service_provider_address" text,
	"created_by_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_management_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"inventory_count_score" integer DEFAULT 100,
	"waste_score" integer DEFAULT 100,
	"production_error_score" integer DEFAULT 100,
	"wrong_production_score" integer DEFAULT 100,
	"branch_complaint_score" integer DEFAULT 100,
	"overall_score" integer DEFAULT 100,
	"waste_count" integer DEFAULT 0,
	"production_error_count" integer DEFAULT 0,
	"wrong_production_count" integer DEFAULT 0,
	"branch_complaint_count" integer DEFAULT 0,
	"inventory_count_completed" boolean DEFAULT false,
	"inventory_count_on_time" boolean DEFAULT false,
	"notes" text,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fault_service_status_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracking_id" integer NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"comment" text,
	"attachment_url" text,
	"updated_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fault_service_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"fault_id" integer NOT NULL,
	"equipment_id" integer,
	"branch_id" integer NOT NULL,
	"current_status" varchar(50) DEFAULT 'servis_bekleniyor' NOT NULL,
	"service_contacted_at" timestamp,
	"service_provider_name" varchar(255),
	"service_provider_phone" varchar(50),
	"service_provider_email" varchar(255),
	"service_handled_by" varchar(20) DEFAULT 'branch',
	"estimated_completion_date" date,
	"delivery_form" jsonb,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"record_date" timestamp NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"category" varchar(100) NOT NULL,
	"sub_category" varchar(100),
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"invoice_no" varchar(100),
	"status" varchar(20) DEFAULT 'onaylandi',
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "food_safety_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"category" varchar(50) NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"version" varchar(20) DEFAULT '1.0',
	"file_url" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"approved_by_id" varchar,
	"approved_at" timestamp,
	"effective_date" timestamp,
	"review_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "food_safety_trainings" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"trainer_id" varchar,
	"title" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"target_role" varchar(50),
	"scheduled_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"duration" integer,
	"attendee_count" integer DEFAULT 0,
	"max_attendees" integer,
	"status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"materials" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gate_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"gate_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"quiz_score" integer,
	"quiz_passed" boolean,
	"practical_score" integer,
	"practical_passed" boolean,
	"practical_approved_by" varchar,
	"kpi_score" integer,
	"kpi_passed" boolean,
	"kpi_details" jsonb,
	"attendance_rate" integer,
	"attendance_passed" boolean,
	"overall_passed" boolean DEFAULT false NOT NULL,
	"overall_score" integer,
	"status" varchar(20) DEFAULT 'in_progress',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"failure_reason" text,
	"next_retry_at" timestamp,
	"supervisor_approved" boolean DEFAULT false,
	"coach_approved" boolean DEFAULT false,
	"cgo_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guide_docs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"target_roles" text[] DEFAULT '{}',
	"scope" varchar(50) DEFAULT 'all',
	"sort_order" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "haccp_control_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"control_point_name" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"hazard_type" varchar(50) NOT NULL,
	"critical_limit" varchar(200) NOT NULL,
	"monitoring_method" varchar(200) NOT NULL,
	"frequency" varchar(50) NOT NULL,
	"corrective_action" text NOT NULL,
	"responsible_role" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "haccp_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_point_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"recorded_by_id" varchar NOT NULL,
	"measured_value" varchar(100) NOT NULL,
	"is_within_limits" boolean NOT NULL,
	"deviation_note" text,
	"corrective_action_taken" text,
	"photo_url" text,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hygiene_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"auditor_id" varchar NOT NULL,
	"audit_date" timestamp NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"hand_hygiene_score" integer DEFAULT 0,
	"surface_cleanliness_score" integer DEFAULT 0,
	"equipment_hygiene_score" integer DEFAULT 0,
	"personal_hygiene_score" integer DEFAULT 0,
	"waste_management_score" integer DEFAULT 0,
	"pest_control_score" integer DEFAULT 0,
	"storage_conditions_score" integer DEFAULT 0,
	"findings" text,
	"recommendations" text,
	"photo_urls" text[],
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by_user_id" varchar NOT NULL,
	"mode" varchar(30) DEFAULT 'append' NOT NULL,
	"match_key" varchar(30) DEFAULT 'username',
	"scope" varchar(30),
	"file_name" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0,
	"created_count" integer DEFAULT 0,
	"updated_count" integer DEFAULT 0,
	"skipped_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"deactivated_count" integer DEFAULT 0,
	"summary_json" text,
	"rolled_back_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"row_number" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"employee_id" varchar,
	"message" text,
	"before_json" text,
	"after_json" text
);
--> statement-breakpoint
CREATE TABLE "inventory_count_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"count_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"counter_1_id" varchar,
	"counter_2_id" varchar,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_count_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"counter_id" varchar NOT NULL,
	"counted_quantity" numeric(12, 3) NOT NULL,
	"system_quantity" numeric(12, 3) NOT NULL,
	"difference" numeric(12, 3) NOT NULL,
	"is_recount" boolean DEFAULT false,
	"notes" text,
	"photo_url" text,
	"counted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_count_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"count_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"system_quantity" numeric(12, 3) NOT NULL,
	"counted_quantity" numeric(12, 3) NOT NULL,
	"difference" numeric(12, 3) NOT NULL,
	"difference_percent" numeric(5, 2) NOT NULL,
	"severity" varchar(20) DEFAULT 'low' NOT NULL,
	"notified_roles" text[],
	"action_taken" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"count_type" varchar(30) DEFAULT 'tam_sayim' NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"status" varchar(30) DEFAULT 'planned' NOT NULL,
	"created_by_id" varchar,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kpi_signal_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_key" varchar(50) NOT NULL,
	"title_tr" varchar(200) NOT NULL,
	"description_tr" text,
	"metric_source" varchar(50) NOT NULL,
	"metric_table" varchar(100),
	"threshold_type" varchar(20) DEFAULT 'above',
	"threshold_value" real NOT NULL,
	"evaluation_period_days" integer DEFAULT 30,
	"recommended_module_id" integer,
	"recommended_action" varchar(100),
	"target_roles" text[] DEFAULT ARRAY['barista', 'bar_buddy', 'stajyer']::text[],
	"notify_roles" text[] DEFAULT ARRAY['coach']::text[],
	"severity" varchar(20) DEFAULT 'warning',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "kpi_signal_rules_signal_key_unique" UNIQUE("signal_key")
);
--> statement-breakpoint
CREATE TABLE "onboarding_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"mentor_id" integer NOT NULL,
	"rating" integer,
	"notes" text,
	"strengths" text,
	"areas_to_improve" text,
	"checkin_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"trainee_id" integer NOT NULL,
	"mentor_id" integer,
	"branch_id" integer,
	"status" varchar(30) DEFAULT 'active',
	"start_date" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"target_role" varchar(50) NOT NULL,
	"duration_weeks" integer DEFAULT 4 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"goals" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"severity" varchar(10) NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"condition_json" text NOT NULL,
	"message_json" text NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_order_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"invoice_number" varchar(100),
	"invoice_date" timestamp,
	"payment_date" timestamp,
	"due_date" timestamp,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(50) DEFAULT 'havale',
	"status" varchar(30) DEFAULT 'beklemede' NOT NULL,
	"notes" text,
	"processed_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_scales" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_type" varchar(20) NOT NULL,
	"position_name" varchar(100) NOT NULL,
	"level" integer NOT NULL,
	"base_salary" numeric(12, 2) NOT NULL,
	"cash_register_bonus" numeric(12, 2) DEFAULT '0',
	"performance_bonus" numeric(12, 2) NOT NULL,
	"bonus_calculation_type" varchar(20) DEFAULT 'per_day' NOT NULL,
	"total_salary" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"certification_type" varchar(100) NOT NULL,
	"certificate_number" varchar(100),
	"issued_by" varchar(200),
	"issued_date" timestamp,
	"expiry_date" timestamp NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"document_url" text,
	"verified_by_id" varchar,
	"verified_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"inventory_id" integer,
	"issue_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'orta' NOT NULL,
	"description" text NOT NULL,
	"resolution" text,
	"status" varchar(30) DEFAULT 'acik' NOT NULL,
	"reported_by_id" varchar,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_performance_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"delivery_score" numeric(5, 2) DEFAULT '0',
	"price_performance_score" numeric(5, 2) DEFAULT '0',
	"quality_score" numeric(5, 2) DEFAULT '0',
	"overall_score" numeric(5, 2) DEFAULT '0',
	"total_deliveries" integer DEFAULT 0,
	"on_time_deliveries" integer DEFAULT 0,
	"late_deliveries" integer DEFAULT 0,
	"avg_delivery_days" numeric(5, 1) DEFAULT '0',
	"return_count" integer DEFAULT 0,
	"complaint_count" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"minimum_order_quantity" numeric(12, 3) DEFAULT '1',
	"lead_time_days" integer DEFAULT 3,
	"valid_until" timestamp,
	"shipping_cost" numeric(10, 2) DEFAULT '0',
	"shipping_responsibility" varchar(50) DEFAULT 'tedarikci',
	"payment_term_days" integer DEFAULT 30,
	"has_installments" boolean DEFAULT false,
	"quality_score" numeric(3, 1),
	"notes" text,
	"status" varchar(30) DEFAULT 'aktif' NOT NULL,
	"requested_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"submitted_by_user_id" varchar(255) NOT NULL,
	"type" varchar(30) NOT NULL,
	"payload_json" text,
	"file_url" text,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"reviewed_by_user_id" varchar(255),
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"role_code" varchar(50) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"branch_type" varchar(50),
	"applies_to_all_branches" boolean DEFAULT true,
	"frequency" varchar(20) NOT NULL,
	"due_offset_minutes" integer DEFAULT 480,
	"required_evidence_type" varchar(20) DEFAULT 'none' NOT NULL,
	"template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waste_action_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"waste_event_id" integer NOT NULL,
	"task_id" integer,
	"audit_log_id" integer,
	"link_type" varchar(30) DEFAULT 'task' NOT NULL,
	"notes" text,
	"created_by_user_id" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waste_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_tr" varchar(150) NOT NULL,
	"name_en" varchar(150),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "waste_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "waste_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"created_by_user_id" varchar(255) NOT NULL,
	"event_ts" timestamp DEFAULT now() NOT NULL,
	"product_id" integer,
	"product_group" varchar(100),
	"recipe_ref" varchar(100),
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(20) DEFAULT 'adet' NOT NULL,
	"estimated_cost" numeric(10, 2),
	"category_id" integer NOT NULL,
	"reason_id" integer NOT NULL,
	"responsibility_scope" varchar(30) DEFAULT 'unknown',
	"notes" text,
	"evidence_photos" jsonb DEFAULT '[]'::jsonb,
	"lot_id" varchar(100),
	"supplier_batch" varchar(100),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waste_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"lot_id" varchar(100) NOT NULL,
	"product_id" integer,
	"product_name" varchar(200),
	"production_date" timestamp,
	"expiry_date" timestamp,
	"qc_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"qc_notes" text,
	"evidence_photos" jsonb DEFAULT '[]'::jsonb,
	"created_by_user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waste_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"code" varchar(80) NOT NULL,
	"name_tr" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_action_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" integer NOT NULL,
	"task_id" integer,
	"initial_score" real,
	"follow_up_score" real,
	"outcome" varchar(20),
	"follow_up_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_escalation_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_action_id" integer NOT NULL,
	"escalation_level" integer DEFAULT 1 NOT NULL,
	"escalated_to_user_id" varchar(255),
	"escalated_to_role" varchar(30),
	"escalated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolution" text
);
--> statement-breakpoint
CREATE TABLE "agent_pending_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"action_type" varchar(30) NOT NULL,
	"target_user_id" varchar(255),
	"target_role_scope" varchar(30),
	"branch_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"deep_link" varchar(500),
	"severity" varchar(10) DEFAULT 'med' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by_user_id" varchar(255),
	"approved_at" timestamp,
	"rejected_reason" text,
	"expires_at" timestamp,
	"category" varchar(50),
	"subcategory" varchar(100),
	"escalation_date" timestamp,
	"escalation_role" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_rejection_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_user_id" varchar(255),
	"category" varchar(50),
	"subcategory" varchar(100),
	"rejection_reason" text,
	"rejected_by" varchar(255),
	"rejected_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) NOT NULL,
	"subcategory" varchar(100),
	"description" text,
	"primary_role" varchar(50) NOT NULL,
	"secondary_role" varchar(50),
	"escalation_role" varchar(50),
	"escalation_days" integer DEFAULT 3,
	"notify_branch_supervisor" boolean DEFAULT true,
	"send_hq_summary" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_type" varchar(30) NOT NULL,
	"scope_type" varchar(20) NOT NULL,
	"scope_id" varchar(255),
	"triggered_by" varchar(20) DEFAULT 'cron' NOT NULL,
	"input_kpis" jsonb DEFAULT '{}'::jsonb,
	"llm_used" boolean DEFAULT false,
	"llm_model" varchar(50),
	"llm_tokens" integer DEFAULT 0,
	"actions_generated" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'success',
	"execution_time_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_agent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_type" varchar(50) NOT NULL,
	"triggered_by_user_id" varchar(255),
	"target_role_scope" varchar(30) NOT NULL,
	"target_user_id" varchar(255),
	"branch_id" integer,
	"input_summary" text,
	"output_summary" text,
	"action_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'success',
	"execution_time_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_data_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"label_tr" varchar(100) NOT NULL,
	"label_en" varchar(100) NOT NULL,
	"description" text,
	"sensitivity" varchar(20) DEFAULT 'internal' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_data_domains_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ai_domain_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"employee_type" varchar(50),
	"decision" varchar(30) DEFAULT 'DENY' NOT NULL,
	"scope" varchar(20) DEFAULT 'org_wide' NOT NULL,
	"redaction_mode" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"current_stock" numeric(10, 2) DEFAULT '0',
	"minimum_stock" numeric(10, 2) DEFAULT '5',
	"unit" varchar(20),
	"last_received_at" timestamp,
	"last_counted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"movement_type" varchar(30) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"previous_stock" numeric(10, 2),
	"new_stock" numeric(10, 2),
	"reference_type" varchar(50),
	"reference_id" integer,
	"lot_number" varchar(50),
	"expiry_date" timestamp,
	"notes" text,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_task_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"icon" varchar(50),
	"color" varchar(20),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_task_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "broadcast_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"seen_at" timestamp,
	"confirmed_at" timestamp,
	CONSTRAINT "br_announcement_user_uniq" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "coffee_roasting_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"charge_number" varchar(50) NOT NULL,
	"green_coffee_product_id" integer,
	"roasted_product_id" integer,
	"green_weight_kg" numeric(10, 3) NOT NULL,
	"roasted_weight_kg" numeric(10, 3) NOT NULL,
	"weight_loss_pct" numeric(5, 2),
	"roast_degree" varchar(30) NOT NULL,
	"start_temperature" numeric(5, 1),
	"end_temperature" numeric(5, 1),
	"first_crack_time" integer,
	"roast_duration_minutes" integer,
	"roast_date" timestamp DEFAULT now(),
	"operator_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_change_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" integer NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by" varchar,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"change_reason" text,
	"change_request_id" integer
);
--> statement-breakpoint
CREATE TABLE "data_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" integer NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"current_value" text,
	"requested_value" text,
	"reason" text NOT NULL,
	"supporting_document_url" text,
	"requested_by" varchar,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"review_note" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_lock_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"lock_after_days" integer,
	"lock_on_status" varchar(50),
	"lock_immediately" boolean DEFAULT false,
	"can_request_change" boolean DEFAULT true,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_lock_rules_table_name_unique" UNIQUE("table_name")
);
--> statement-breakpoint
CREATE TABLE "dobody_avatars" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"label" text,
	"category" text DEFAULT 'general' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"time_start" text,
	"time_end" text,
	"roles" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dobody_flow_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dobody_flow_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"navigate_to" varchar(500),
	"estimated_minutes" integer DEFAULT 5,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"target_roles" text[],
	"target_branches" integer[],
	"target_users" text[],
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_type_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_type_id" integer NOT NULL,
	"policy_key" varchar(100) NOT NULL,
	"policy_json" jsonb DEFAULT '{}'::jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"min_age" integer,
	"max_age" integer,
	"allowed_groups" jsonb DEFAULT '[]'::jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employee_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "factory_kiosk_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" varchar(500) NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_kiosk_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "factory_shipment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" varchar(20),
	"lot_number" varchar(50),
	"expiry_date" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "factory_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_number" varchar(50) NOT NULL,
	"branch_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'hazirlaniyor' NOT NULL,
	"prepared_by_id" varchar,
	"order_request_id" integer,
	"transfer_type" varchar(20) DEFAULT 'sale',
	"total_cost" numeric(12, 2),
	"total_sale_price" numeric(12, 2),
	"dispatched_at" timestamp,
	"delivered_at" timestamp,
	"delivery_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "factory_shipments_shipment_number_unique" UNIQUE("shipment_number")
);
--> statement-breakpoint
CREATE TABLE "franchise_investor_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"investor_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"ownership_percentage" numeric(5, 2) DEFAULT '100',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_investor_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"investor_id" integer NOT NULL,
	"title" varchar(200),
	"content" text,
	"note_type" varchar(30) DEFAULT 'meeting',
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchise_investors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"full_name" varchar(200) NOT NULL,
	"phone" varchar(20),
	"email" varchar(200),
	"company_name" varchar(200),
	"tax_number" varchar(50),
	"contract_start" date,
	"contract_end" date,
	"contract_renewal_reminder" boolean DEFAULT true,
	"investment_amount" numeric(12, 2),
	"monthly_royalty_rate" numeric(5, 2) DEFAULT '5.0',
	"notes" text,
	"status" varchar(20) DEFAULT 'active',
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "haccp_check_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_point" varchar(100) NOT NULL,
	"station_id" integer,
	"checked_by" varchar(255) NOT NULL,
	"check_date" timestamp DEFAULT now(),
	"result" varchar(20) NOT NULL,
	"temperature_value" numeric(5, 2),
	"corrective_action" text,
	"notes" text,
	"production_output_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hq_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_number" varchar(20) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"assigned_by_user_id" varchar NOT NULL,
	"assigned_to_user_id" varchar NOT NULL,
	"department" varchar(50),
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(30) DEFAULT 'beklemede' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"completion_note" text,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "hq_tasks_task_number_unique" UNIQUE("task_number")
);
--> statement-breakpoint
CREATE TABLE "module_delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_key" varchar(100) NOT NULL,
	"module_name" varchar(200) NOT NULL,
	"from_role" varchar(100) NOT NULL,
	"to_role" varchar(100) NOT NULL,
	"delegation_type" varchar(20) DEFAULT 'gecici' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"note" varchar(500),
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_department_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"label" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_key" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"icon" varchar(10) DEFAULT '📌',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_key" varchar(100) NOT NULL,
	"scope" varchar(20) DEFAULT 'global' NOT NULL,
	"branch_id" integer,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"flag_level" varchar(20) DEFAULT 'module' NOT NULL,
	"flag_behavior" varchar(30) DEFAULT 'fully_hidden' NOT NULL,
	"parent_key" varchar(100),
	"target_role" varchar(50),
	"enabled_by" varchar,
	"enabled_at" timestamp with time zone DEFAULT now(),
	"disabled_by" varchar,
	"disabled_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_module_flags_key_scope_branch_role" UNIQUE("module_key","scope","branch_id","target_role")
);
--> statement-breakpoint
CREATE TABLE "monthly_payroll" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"position_code" varchar(50) NOT NULL,
	"total_calendar_days" integer NOT NULL,
	"worked_days" integer DEFAULT 0 NOT NULL,
	"off_days" integer DEFAULT 0 NOT NULL,
	"absent_days" integer DEFAULT 0 NOT NULL,
	"unpaid_leave_days" integer DEFAULT 0 NOT NULL,
	"sick_leave_days" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"total_salary" integer NOT NULL,
	"base_salary" integer NOT NULL,
	"bonus" integer NOT NULL,
	"daily_rate" integer NOT NULL,
	"absence_deduction" integer DEFAULT 0 NOT NULL,
	"bonus_deduction" integer DEFAULT 0 NOT NULL,
	"overtime_pay" integer DEFAULT 0 NOT NULL,
	"holiday_worked_days" integer DEFAULT 0 NOT NULL,
	"holiday_pay" integer DEFAULT 0 NOT NULL,
	"meal_allowance" integer DEFAULT 0 NOT NULL,
	"net_pay" integer DEFAULT 0 NOT NULL,
	"gross_total" integer DEFAULT 0,
	"sgk_employee" integer DEFAULT 0,
	"unemployment_employee" integer DEFAULT 0,
	"income_tax" integer DEFAULT 0,
	"stamp_tax" integer DEFAULT 0,
	"agi" integer DEFAULT 0,
	"total_deductions" integer DEFAULT 0,
	"sgk_employer" integer DEFAULT 0,
	"unemployment_employer" integer DEFAULT 0,
	"total_employer_cost" integer DEFAULT 0,
	"cumulative_tax_base" integer DEFAULT 0,
	"annual_leave_days" integer DEFAULT 0,
	"total_worked_minutes" integer DEFAULT 0,
	"calculation_mode" varchar(20) DEFAULT 'simple',
	"data_source" varchar(20) DEFAULT 'kiosk',
	"source_import_id" integer,
	"is_dry_run" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'draft',
	"calculated_at" timestamp,
	"approved_by" varchar,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "monthly_payroll_user_year_month_uniq" UNIQUE("user_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "org_employee_type_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_scope" varchar(20) NOT NULL,
	"org_id" integer NOT NULL,
	"employee_type_id" integer NOT NULL,
	"task_pack_key" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_deduction_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"year" integer,
	"month" integer,
	"tracking_days" integer,
	"daily_rate_divisor" integer DEFAULT 30 NOT NULL,
	"max_off_days" integer DEFAULT 4 NOT NULL,
	"absence_penalty_plus_one" boolean DEFAULT false NOT NULL,
	"late_tolerance_minutes" integer DEFAULT 15 NOT NULL,
	"late_half_deduction_minutes" integer DEFAULT 30 NOT NULL,
	"late_per_minute_rate" integer DEFAULT 0,
	"deficit_tolerance_minutes" integer DEFAULT 15 NOT NULL,
	"deficit_half_hour_threshold" integer DEFAULT 30 NOT NULL,
	"overtime_threshold_minutes" integer DEFAULT 30 NOT NULL,
	"overtime_multiplier" integer DEFAULT 150 NOT NULL,
	"holiday_multiplier" integer DEFAULT 100 NOT NULL,
	"meal_allowance_per_day" integer DEFAULT 33000 NOT NULL,
	"meal_allowance_roles" text[] DEFAULT ARRAY['stajyer']::text[],
	"unpaid_leave_bonus_deduction" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" varchar,
	"updated_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payroll_config_branch_period" UNIQUE("branch_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "pdks_daily_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"work_date" timestamp with time zone NOT NULL,
	"first_swipe" timestamp with time zone,
	"last_swipe" timestamp with time zone,
	"total_swipes" integer DEFAULT 0,
	"gross_minutes" integer DEFAULT 0,
	"break_minutes" integer DEFAULT 0,
	"net_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"is_off_day" boolean DEFAULT false,
	"is_holiday" boolean DEFAULT false,
	"is_historical" boolean DEFAULT false,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "pdks_daily_unique" UNIQUE("import_id","user_id","work_date")
);
--> statement-breakpoint
CREATE TABLE "pdks_employee_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"pdks_code" text NOT NULL,
	"pdks_name" text NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	CONSTRAINT "pdks_mapping_unique" UNIQUE("branch_id","pdks_code")
);
--> statement-breakpoint
CREATE TABLE "pdks_excel_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"file_name" text NOT NULL,
	"import_type" text DEFAULT 'historical' NOT NULL,
	"status" text DEFAULT 'processing',
	"total_records" integer DEFAULT 0,
	"matched_records" integer DEFAULT 0,
	"unmatched_records" integer DEFAULT 0,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"imported_by" varchar,
	"is_finalized" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"finalized_by" varchar
);
--> statement-breakpoint
CREATE TABLE "pdks_excel_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer NOT NULL,
	"source_row_no" integer,
	"source_code" text,
	"source_name" text,
	"swipe_time" timestamp with time zone NOT NULL,
	"matched_user_id" varchar,
	"match_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdks_monthly_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"total_work_days" integer DEFAULT 0,
	"total_off_days" integer DEFAULT 0,
	"total_absent_days" integer DEFAULT 0,
	"avg_daily_minutes" integer DEFAULT 0,
	"total_overtime_minutes" integer DEFAULT 0,
	"total_late_count" integer DEFAULT 0,
	"total_early_leave_count" integer DEFAULT 0,
	"compliance_score" integer DEFAULT 0,
	"is_historical" boolean DEFAULT false,
	"source_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pdks_monthly_unique" UNIQUE("user_id","branch_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "pdks_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer NOT NULL,
	"record_date" date NOT NULL,
	"record_time" time NOT NULL,
	"record_type" varchar(10) NOT NULL,
	"source" varchar(20) DEFAULT 'kiosk',
	"device_info" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE "position_salaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_code" varchar(50) NOT NULL,
	"position_name" varchar(100) NOT NULL,
	"total_salary" integer NOT NULL,
	"base_salary" integer NOT NULL,
	"bonus" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"lot_number" varchar(50) NOT NULL,
	"product_id" integer,
	"batch_id" integer,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" varchar(20),
	"production_date" timestamp DEFAULT now(),
	"expiry_date" timestamp,
	"produced_by" text,
	"station_id" integer,
	"status" varchar(20) DEFAULT 'uretildi' NOT NULL,
	"quality_check_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "production_lots_lot_number_unique" UNIQUE("lot_number")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device_info" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "record_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" integer NOT NULL,
	"revision_number" integer NOT NULL,
	"field_changes" jsonb NOT NULL,
	"changed_by" varchar,
	"change_source" varchar(30) DEFAULT 'direct',
	"change_request_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_offs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" integer,
	"off_date" date NOT NULL,
	"off_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "scheduled_offs_user_date_uniq" UNIQUE("user_id","off_date")
);
--> statement-breakpoint
CREATE TABLE "sla_business_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_hour" integer DEFAULT 8 NOT NULL,
	"end_hour" integer DEFAULT 18 NOT NULL,
	"work_days" integer[] DEFAULT '{1,2,3,4,5}' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Europe/Istanbul' NOT NULL,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" varchar(50) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"hours_limit" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"comment_type" varchar(20) DEFAULT 'reply' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_number" varchar(20) NOT NULL,
	"branch_id" integer,
	"created_by_user_id" varchar,
	"department" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(30) DEFAULT 'acik' NOT NULL,
	"assigned_to_user_id" varchar,
	"assigned_at" timestamp,
	"sla_deadline" timestamp,
	"sla_breached" boolean DEFAULT false NOT NULL,
	"sla_breached_at" timestamp,
	"related_equipment_id" integer,
	"recurrence_count" integer DEFAULT 1 NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" varchar,
	"resolution_note" text,
	"satisfaction_score" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"ticket_type" varchar(50) DEFAULT 'franchise_talep',
	"source" varchar(30) DEFAULT 'manual',
	"channel" varchar(20) DEFAULT 'franchise',
	"rating" integer,
	"rating_hizmet" integer,
	"rating_temizlik" integer,
	"rating_urun" integer,
	"rating_personel" integer,
	"customer_name" varchar(200),
	"customer_email" varchar(200),
	"customer_phone" varchar(50),
	"is_anonymous" boolean DEFAULT false,
	"photo_urls" text[],
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"comment_id" integer,
	"uploaded_by_user_id" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_cowork_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"invited_by_user_id" varchar NOT NULL,
	"invited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_pack_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"pack_id" integer NOT NULL,
	"pack_item_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"score" integer,
	"approved_by" varchar,
	"approved_at" timestamp,
	"approval_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"webinar_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"registered_at" timestamp DEFAULT now(),
	"attended" boolean DEFAULT false,
	"attended_at" timestamp,
	"status" text DEFAULT 'registered',
	CONSTRAINT "wr_webinar_user_uniq" UNIQUE("webinar_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "webinars" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"host_name" text,
	"host_user_id" varchar,
	"webinar_date" timestamp NOT NULL,
	"duration_minutes" integer,
	"meeting_link" text,
	"recording_url" text,
	"target_roles" text[] DEFAULT '{}'::text[],
	"is_live" boolean DEFAULT false,
	"status" text DEFAULT 'scheduled',
	"branch_id" integer,
	"max_participants" integer,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_recurring_task_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurring_task_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"is_disabled" boolean DEFAULT true NOT NULL,
	"disabled_by_user_id" varchar NOT NULL,
	"disabled_by_role" varchar(50) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "branch_recurring_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'genel' NOT NULL,
	"branch_id" integer,
	"recurrence_type" varchar(20) NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"specific_date" date,
	"assigned_to_user_id" varchar,
	"created_by_user_id" varchar NOT NULL,
	"created_by_role" varchar(50) NOT NULL,
	"photo_required" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_task_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurring_task_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"due_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"assigned_to_user_id" varchar,
	"claimed_by_user_id" varchar,
	"claimed_at" timestamp with time zone,
	"completed_by_user_id" varchar,
	"completed_at" timestamp with time zone,
	"completion_note" text,
	"photo_url" text,
	"is_overdue" boolean DEFAULT false NOT NULL,
	"original_due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalation_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"target_role_key" varchar(50) NOT NULL,
	"sla_days" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"notify_email" boolean DEFAULT true,
	"notify_in_app" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guidance_dismissals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guidance_id" varchar(100) NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiosk_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"user_id" varchar NOT NULL,
	"station_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kiosk_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "role_permission_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"module_key" varchar(100) NOT NULL,
	"can_view" boolean DEFAULT true,
	"can_create" boolean DEFAULT false,
	"can_edit" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"can_approve" boolean DEFAULT false,
	"is_enabled" boolean DEFAULT true,
	"updated_by_user_id" varchar,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dobody_action_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_key" varchar(100) NOT NULL,
	"label_tr" varchar(200) NOT NULL,
	"message_template" text NOT NULL,
	"default_action_type" varchar(30) DEFAULT 'send_notification' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dobody_action_templates_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "notification_digest_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"branch_id" integer,
	"category" varchar(50) NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"default_frequency" varchar(20) DEFAULT 'instant' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"category" varchar(50) NOT NULL,
	"frequency" varchar(20) DEFAULT 'instant' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"all_day" boolean DEFAULT false,
	"event_type" varchar(30) DEFAULT 'meeting' NOT NULL,
	"location" text,
	"color" varchar(20),
	"related_entity_type" varchar(30),
	"related_entity_id" varchar(50),
	"related_entity_url" varchar(200),
	"recurrence" varchar(30) DEFAULT 'none',
	"reminder_minutes" integer DEFAULT 30,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"title" varchar(300),
	"content" text NOT NULL,
	"related_entity_type" varchar(30),
	"related_entity_id" varchar(50),
	"related_entity_name" varchar(200),
	"tags" text[],
	"is_pinned" boolean DEFAULT false,
	"color" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"due_date" timestamp with time zone,
	"due_time" varchar(5),
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"source" varchar(30) DEFAULT 'manual' NOT NULL,
	"source_id" varchar(50),
	"source_url" varchar(200),
	"tags" text[],
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" varchar(30),
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_financial_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"revenue_total" numeric(12, 2) DEFAULT '0',
	"revenue_source" varchar(20) DEFAULT 'manual',
	"cost_payroll" numeric(12, 2) DEFAULT '0',
	"staff_count" integer DEFAULT 0,
	"cost_per_employee" numeric(10, 2) DEFAULT '0',
	"cost_supplies" numeric(12, 2) DEFAULT '0',
	"cost_rent" numeric(12, 2) DEFAULT '0',
	"cost_utilities" numeric(12, 2) DEFAULT '0',
	"cost_other" numeric(12, 2) DEFAULT '0',
	"cost_maintenance" numeric(12, 2) DEFAULT '0',
	"total_cost" numeric(12, 2) DEFAULT '0',
	"net_profit" numeric(12, 2) DEFAULT '0',
	"profit_margin" numeric(5, 2) DEFAULT '0',
	"calculated_at" timestamp DEFAULT now(),
	"calculated_by" varchar(36),
	"notes" text,
	CONSTRAINT "branch_financial_summary_branch_id_period_month_period_year_unique" UNIQUE("branch_id","period_month","period_year")
);
--> statement-breakpoint
CREATE TABLE "branch_monthly_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"snapshot_month" integer NOT NULL,
	"snapshot_year" integer NOT NULL,
	"staff_count" integer DEFAULT 0,
	"new_hires" integer DEFAULT 0,
	"terminations" integer DEFAULT 0,
	"turnover_rate" numeric(5, 2) DEFAULT '0',
	"attendance_rate" numeric(5, 2) DEFAULT '0',
	"late_count" integer DEFAULT 0,
	"leave_days_used" integer DEFAULT 0,
	"task_total" integer DEFAULT 0,
	"task_completed" integer DEFAULT 0,
	"task_completion_rate" numeric(5, 2) DEFAULT '0',
	"checklist_completion_rate" numeric(5, 2) DEFAULT '0',
	"customer_complaints" integer DEFAULT 0,
	"customer_avg_rating" numeric(3, 2) DEFAULT '0',
	"sla_breaches" integer DEFAULT 0,
	"tickets_total" integer DEFAULT 0,
	"tickets_resolved" integer DEFAULT 0,
	"avg_resolution_hours" numeric(8, 2) DEFAULT '0',
	"equipment_faults" integer DEFAULT 0,
	"repeat_faults" integer DEFAULT 0,
	"avg_repair_hours" numeric(8, 2) DEFAULT '0',
	"training_completions" integer DEFAULT 0,
	"avg_quiz_score" numeric(5, 2) DEFAULT '0',
	"certificates_issued" integer DEFAULT 0,
	"cost_payroll" numeric(12, 2) DEFAULT '0',
	"cost_supplies" numeric(12, 2) DEFAULT '0',
	"cost_total" numeric(12, 2) DEFAULT '0',
	"revenue_total" numeric(12, 2) DEFAULT '0',
	"net_profit" numeric(12, 2) DEFAULT '0',
	"overall_health_score" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_monthly_snapshots_branch_id_snapshot_month_snapshot_year_unique" UNIQUE("branch_id","snapshot_month","snapshot_year")
);
--> statement-breakpoint
CREATE TABLE "factory_monthly_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_month" integer NOT NULL,
	"snapshot_year" integer NOT NULL,
	"production_total" integer DEFAULT 0,
	"production_target" integer DEFAULT 0,
	"production_rate" numeric(5, 2) DEFAULT '0',
	"waste_rate" numeric(5, 2) DEFAULT '0',
	"qc_pass_rate" numeric(5, 2) DEFAULT '0',
	"active_stations" integer DEFAULT 0,
	"shipments_count" integer DEFAULT 0,
	"staff_count" integer DEFAULT 0,
	"avg_worker_score" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "factory_monthly_snapshots_snapshot_month_snapshot_year_unique" UNIQUE("snapshot_month","snapshot_year")
);
--> statement-breakpoint
CREATE TABLE "daily_production_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_item_id" integer,
	"product_id" integer NOT NULL,
	"record_date" date NOT NULL,
	"produced_quantity" numeric(12, 2) DEFAULT '0' NOT NULL,
	"waste_quantity" numeric(12, 2) DEFAULT '0',
	"waste_reason" text,
	"unit" varchar(20) DEFAULT 'adet' NOT NULL,
	"recorded_by" varchar NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"planned_quantity" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit" varchar(20) DEFAULT 'adet' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_responsibilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"product_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'uretim_sefi' NOT NULL,
	"is_primary" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_production_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"created_by" varchar NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"notes" text,
	"copied_from_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workshop_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"section" varchar(50) DEFAULT 'genel' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_action_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_actions_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"category_id" integer,
	"assigned_to_id" varchar,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"deadline" date NOT NULL,
	"sla_hours" integer,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"resolved_note" text,
	"resolved_photo_url" text,
	"verified_at" timestamp,
	"verified_by" varchar,
	"sla_breached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_category_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"category_id" integer,
	"category_name" varchar(200) NOT NULL,
	"weight" integer NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"max_score" numeric(5, 2) DEFAULT '100'
);
--> statement-breakpoint
CREATE TABLE "audit_personnel_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"dress_code_score" integer,
	"hygiene_score" integer,
	"customer_care_score" integer,
	"friendliness_score" integer,
	"overall_score" numeric(5, 2),
	"notes" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_responses_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"question_id" integer,
	"category_id" integer,
	"question_text" text NOT NULL,
	"question_type" varchar(20) NOT NULL,
	"response_value" text,
	"score" numeric(5, 2),
	"photo_url" text,
	"note" text,
	"answered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_template_categories_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"weight" integer DEFAULT 10 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_template_questions_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_type" varchar(20) DEFAULT 'checkbox' NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT true NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"help_text" text
);
--> statement-breakpoint
CREATE TABLE "audit_templates_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_template_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audits_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"template_version" integer DEFAULT 1 NOT NULL,
	"branch_id" integer NOT NULL,
	"auditor_id" varchar NOT NULL,
	"status" varchar(30) DEFAULT 'in_progress' NOT NULL,
	"scheduled_date" date,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"closed_at" timestamp,
	"total_score" numeric(5, 2),
	"personnel_score" numeric(5, 2),
	"action_compliance_score" numeric(5, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dobody_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"source_module" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"event_data" jsonb,
	"proposals_generated" integer DEFAULT 0,
	"processed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dobody_learning" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_type" varchar(30) NOT NULL,
	"proposal_id" integer NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"rejection_reason" text,
	"result_positive" boolean,
	"confidence_delta" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dobody_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_type" varchar(30) NOT NULL,
	"role_target" varchar(50) NOT NULL,
	"user_id" varchar,
	"branch_id" integer,
	"proposal_type" varchar(20) DEFAULT 'action' NOT NULL,
	"priority" varchar(20) DEFAULT 'onemli' NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"source_module" varchar(50),
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"suggested_action_type" varchar(50),
	"suggested_action_data" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dobody_scopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"allowed_modules" text[],
	"blocked_keywords" text[],
	"branch_scope" varchar(20) DEFAULT 'own' NOT NULL,
	"max_detail_level" varchar(20) DEFAULT 'summary' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "dobody_scopes_role_unique" UNIQUE("role")
);
--> statement-breakpoint
CREATE TABLE "dobody_workflow_confidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_type" varchar(30) NOT NULL,
	"role" varchar(50) NOT NULL,
	"confidence_score" numeric(5, 2) DEFAULT '50' NOT NULL,
	"total_proposals" integer DEFAULT 0 NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"auto_apply_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "factory_ingredient_nutrition" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingredient_name" varchar(255) NOT NULL,
	"energy_kcal" numeric(8, 2),
	"fat_g" numeric(8, 2),
	"saturated_fat_g" numeric(8, 2),
	"trans_fat_g" numeric(8, 2),
	"carbohydrate_g" numeric(8, 2),
	"sugar_g" numeric(8, 2),
	"fiber_g" numeric(8, 2),
	"protein_g" numeric(8, 2),
	"salt_g" numeric(8, 2),
	"sodium_mg" numeric(8, 2),
	"allergens" text[],
	"source" varchar(20) DEFAULT 'manual',
	"confidence" integer,
	"verified_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factory_ingredient_nutrition_ingredient_name_unique" UNIQUE("ingredient_name")
);
--> statement-breakpoint
CREATE TABLE "factory_ingredient_nutrition_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"nutrition_id" integer,
	"ingredient_name" varchar(255) NOT NULL,
	"action" varchar(20) NOT NULL,
	"source" varchar(30) NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"changed_by" varchar,
	"changed_by_role" varchar(30),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "factory_keyblend_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyblend_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"is_allergen" boolean DEFAULT false,
	"allergen_type" varchar(50),
	"show_name_to_gm" boolean DEFAULT false,
	"raw_material_id" integer,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_keyblends" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"total_weight" numeric(12, 4),
	"show_to_gm" boolean DEFAULT false,
	"preparation_notes" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factory_keyblends_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "factory_production_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe_version_id" integer,
	"recipe_version_number" integer,
	"session_id" integer,
	"batch_multiplier" numeric(5, 2) DEFAULT '1' NOT NULL,
	"expected_output" integer,
	"actual_output" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"started_by" varchar,
	"completed_by" varchar,
	"status" varchar(20) DEFAULT 'in_progress',
	"step_progress" jsonb DEFAULT '{}'::jsonb,
	"actual_waste_kg" numeric(10, 3),
	"actual_loss_grams" numeric(10, 2),
	"is_arge" boolean DEFAULT false,
	"arge_notes" text,
	"quality_score" integer,
	"qc_notes" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"scope" varchar(20) NOT NULL,
	"approved_by" varchar NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"recipe_version_id" integer,
	"recipe_version_number" integer,
	"source_ref" varchar(50),
	"invalidated_at" timestamp with time zone,
	"invalidated_reason" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_category_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(30) NOT NULL,
	"category" varchar(50) NOT NULL,
	"can_view" boolean DEFAULT true,
	"can_edit" boolean DEFAULT true,
	"can_create" boolean DEFAULT true,
	"set_by" varchar,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frca_role_category_unique" UNIQUE("role","category")
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_ingredient_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"ingredient_count" integer DEFAULT 0 NOT NULL,
	"reason" varchar(50) DEFAULT 'bulk_import',
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"restored_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"ref_id" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"ingredient_type" varchar(20) DEFAULT 'normal',
	"ingredient_category" varchar(50) DEFAULT 'ana',
	"keyblend_id" integer,
	"raw_material_id" integer,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fri_recipe_ref_unique" UNIQUE("recipe_id","ref_id")
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_label_print_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe_code" varchar(50),
	"recipe_name" varchar(255),
	"printed_by" varchar,
	"is_draft" boolean DEFAULT false NOT NULL,
	"grammage_approved" boolean DEFAULT false NOT NULL,
	"draft_reason" varchar(255),
	"lot_number" varchar(60),
	"production_date" varchar(10),
	"expiry_date" varchar(10),
	"printed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"product_id" integer,
	"old_raw_material_cost" numeric(12, 4),
	"new_raw_material_cost" numeric(12, 4),
	"old_unit_cost" numeric(12, 4),
	"new_unit_cost" numeric(12, 4),
	"old_base_price" numeric(12, 2),
	"new_base_price" numeric(12, 2),
	"old_suggested_price" numeric(12, 2),
	"new_suggested_price" numeric(12, 2),
	"change_percent" numeric(8, 2),
	"status" varchar(30) NOT NULL,
	"reason" text,
	"ingredient_count" integer DEFAULT 0,
	"resolved_ingredient_count" integer DEFAULT 0,
	"coverage_percent" numeric(5, 2),
	"missing_ingredients" jsonb DEFAULT '[]'::jsonb,
	"source" varchar(30) NOT NULL,
	"run_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_step_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"step_count" integer DEFAULT 0 NOT NULL,
	"reason" varchar(50) DEFAULT 'bulk_import',
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"restored_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"photo_urls" jsonb DEFAULT '[]'::jsonb,
	"timer_seconds" integer,
	"temperature_celsius" integer,
	"equipment_needed" text,
	"is_critical_control" boolean DEFAULT false,
	"ccp_notes" text,
	"tips" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_recipe_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"ingredients_snapshot" jsonb,
	"steps_snapshot" jsonb,
	"cost_snapshot" jsonb,
	"changed_by" varchar,
	"change_description" text NOT NULL,
	"change_diff" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frv_recipe_version_unique" UNIQUE("recipe_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "factory_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"category" varchar(50),
	"cover_photo_url" text,
	"product_id" integer,
	"output_type" varchar(20) DEFAULT 'mamul' NOT NULL,
	"parent_recipe_id" integer,
	"base_batch_output" integer DEFAULT 1 NOT NULL,
	"output_unit" varchar(20) DEFAULT 'adet',
	"total_weight_grams" integer,
	"expected_unit_weight" numeric(10, 3),
	"batch_presets" jsonb DEFAULT '[
    {"name":"×1","multiplier":1,"type":"standard"},
    {"name":"×1.25","multiplier":1.25,"type":"standard"},
    {"name":"×1.5","multiplier":1.5,"type":"standard"},
    {"name":"×1.75","multiplier":1.75,"type":"standard"},
    {"name":"×2","multiplier":2,"type":"standard"},
    {"name":"AR-GE %5","multiplier":0.05,"type":"arge"},
    {"name":"AR-GE %10","multiplier":0.10,"type":"arge"},
    {"name":"AR-GE %25","multiplier":0.25,"type":"arge"}
  ]'::jsonb,
	"prep_time_minutes" integer DEFAULT 0,
	"production_time_minutes" integer DEFAULT 0,
	"cleaning_time_minutes" integer DEFAULT 0,
	"station_id" integer,
	"equipment_description" text,
	"equipment_kwh" numeric(10, 3) DEFAULT '0',
	"water_consumption_lt" numeric(10, 2) DEFAULT '0',
	"required_workers" integer DEFAULT 1,
	"expected_output_count" integer,
	"expected_waste_kg" numeric(10, 3) DEFAULT '0',
	"expected_loss_grams" numeric(10, 2) DEFAULT '0',
	"waste_tolerance_pct" numeric(5, 2) DEFAULT '5',
	"raw_material_cost" numeric(12, 4) DEFAULT '0',
	"labor_cost" numeric(12, 4) DEFAULT '0',
	"energy_cost" numeric(12, 4) DEFAULT '0',
	"total_batch_cost" numeric(12, 4) DEFAULT '0',
	"unit_cost" numeric(12, 4) DEFAULT '0',
	"cost_last_calculated" timestamp with time zone,
	"recipe_type" varchar(20) DEFAULT 'OPEN',
	"is_visible" boolean DEFAULT true,
	"edit_locked" boolean DEFAULT false,
	"locked_by" varchar,
	"locked_at" timestamp with time zone,
	"lock_reason" text,
	"nutrition_facts" jsonb,
	"nutrition_per_portion" jsonb,
	"allergens" text[],
	"nutrition_calculated_at" timestamp with time zone,
	"nutrition_confidence" integer,
	"version" integer DEFAULT 1,
	"bakers_percentage" text,
	"technical_notes" text,
	"change_log" text,
	"created_by" varchar,
	"updated_by" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "factory_recipes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "daily_material_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"recipe_id" integer,
	"batch_count" numeric(5, 1),
	"required_quantity" numeric(12, 3) NOT NULL,
	"leftover_quantity" numeric(12, 3) DEFAULT '0',
	"net_pick_quantity" numeric(12, 3) NOT NULL,
	"actual_picked_quantity" numeric(12, 3),
	"unit" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"picked_by" varchar,
	"picked_at" timestamp with time zone,
	"verified_by" varchar,
	"verified_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_material_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" varchar,
	"confirmed_by" varchar,
	"confirmed_at" timestamp with time zone,
	"total_item_count" integer DEFAULT 0,
	"total_picked_count" integer DEFAULT 0,
	"total_cost_estimate" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dmp_date_unique" UNIQUE("plan_date")
);
--> statement-breakpoint
CREATE TABLE "material_pick_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_item_id" integer,
	"inventory_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"from_location" varchar(50) NOT NULL,
	"to_location" varchar(50) DEFAULT 'uretim_alani' NOT NULL,
	"lot_number" varchar(100),
	"expiry_date" date,
	"picked_by" varchar,
	"verified_by" varchar,
	"movement_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_area_leftovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_date" date NOT NULL,
	"inventory_id" integer NOT NULL,
	"remaining_quantity" numeric(12, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"condition" varchar(20) DEFAULT 'good' NOT NULL,
	"storage_temp" numeric(4, 1),
	"expiry_risk" boolean DEFAULT false,
	"usable_for_recipes" jsonb DEFAULT '[]'::jsonb,
	"used_in_next_day" boolean DEFAULT false,
	"used_quantity" numeric(12, 3),
	"wasted_quantity" numeric(12, 3),
	"waste_reason" text,
	"recorded_by" varchar,
	"verified_by" varchar,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pal_date_inventory_unique" UNIQUE("record_date","inventory_id")
);
--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_completions" ADD CONSTRAINT "checklist_completions_assignment_id_checklist_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."checklist_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_completions" ADD CONSTRAINT "checklist_completions_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_completions" ADD CONSTRAINT "checklist_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_completions" ADD CONSTRAINT "checklist_completions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_completions" ADD CONSTRAINT "checklist_completions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_ratings" ADD CONSTRAINT "checklist_ratings_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_ratings" ADD CONSTRAINT "checklist_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_ratings" ADD CONSTRAINT "checklist_ratings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_task_completions" ADD CONSTRAINT "checklist_task_completions_completion_id_checklist_completions_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."checklist_completions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_task_completions" ADD CONSTRAINT "checklist_task_completions_task_id_checklist_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."checklist_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_task_completions" ADD CONSTRAINT "checklist_task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_tasks" ADD CONSTRAINT "checklist_tasks_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_satisfaction_scores" ADD CONSTRAINT "employee_satisfaction_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_satisfaction_scores" ADD CONSTRAINT "employee_satisfaction_scores_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_warnings" ADD CONSTRAINT "employee_warnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_warnings" ADD CONSTRAINT "employee_warnings_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_faults" ADD CONSTRAINT "equipment_faults_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_faults" ADD CONSTRAINT "equipment_faults_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_faults" ADD CONSTRAINT "equipment_faults_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_faults" ADD CONSTRAINT "equipment_faults_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_troubleshooting_completion" ADD CONSTRAINT "equipment_troubleshooting_completion_fault_id_equipment_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."equipment_faults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_troubleshooting_completion" ADD CONSTRAINT "equipment_troubleshooting_completion_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_escalation_log" ADD CONSTRAINT "task_escalation_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_escalation_log" ADD CONSTRAINT "task_escalation_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_escalation_log" ADD CONSTRAINT "task_escalation_log_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_ratings" ADD CONSTRAINT "task_ratings_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_ratings" ADD CONSTRAINT "task_ratings_rated_by_id_users_id_fk" FOREIGN KEY ("rated_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_ratings" ADD CONSTRAINT "task_ratings_rated_user_id_users_id_fk" FOREIGN KEY ("rated_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_checklist_task_id_checklist_tasks_id_fk" FOREIGN KEY ("checklist_task_id") REFERENCES "public"."checklist_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_acknowledged_by_id_users_id_fk" FOREIGN KEY ("acknowledged_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_updated_by_id_users_id_fk" FOREIGN KEY ("status_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_checker_id_users_id_fk" FOREIGN KEY ("checker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approved_by_assigner_id_users_id_fk" FOREIGN KEY ("approved_by_assigner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_quiz_results" ADD CONSTRAINT "announcement_quiz_results_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_quiz_results" ADD CONSTRAINT "announcement_quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_read_status" ADD CONSTRAINT "announcement_read_status_announcementId_announcements_id_fk" FOREIGN KEY ("announcementId") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_read_status" ADD CONSTRAINT "announcement_read_status_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_channel_members" ADD CONSTRAINT "cowork_channel_members_channel_id_cowork_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."cowork_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_channel_members" ADD CONSTRAINT "cowork_channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_channels" ADD CONSTRAINT "cowork_channels_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_messages" ADD CONSTRAINT "cowork_messages_channel_id_cowork_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."cowork_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_messages" ADD CONSTRAINT "cowork_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_channel_id_cowork_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."cowork_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cowork_tasks" ADD CONSTRAINT "cowork_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_cash_reports" ADD CONSTRAINT "daily_cash_reports_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_cash_reports" ADD CONSTRAINT "daily_cash_reports_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_comments" ADD CONSTRAINT "equipment_comments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_comments" ADD CONSTRAINT "equipment_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance_logs" ADD CONSTRAINT "equipment_maintenance_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance_logs" ADD CONSTRAINT "equipment_maintenance_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_requests" ADD CONSTRAINT "equipment_service_requests_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_requests" ADD CONSTRAINT "equipment_service_requests_fault_id_equipment_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."equipment_faults"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_requests" ADD CONSTRAINT "equipment_service_requests_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_requests" ADD CONSTRAINT "equipment_service_requests_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_comments" ADD CONSTRAINT "fault_comments_fault_id_equipment_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."equipment_faults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_comments" ADD CONSTRAINT "fault_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_stage_transitions" ADD CONSTRAINT "fault_stage_transitions_fault_id_equipment_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."equipment_faults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_stage_transitions" ADD CONSTRAINT "fault_stage_transitions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_category_assignments" ADD CONSTRAINT "hq_support_category_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_category_assignments" ADD CONSTRAINT "hq_support_category_assignments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_messages" ADD CONSTRAINT "hq_support_messages_ticket_id_hq_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."hq_support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_messages" ADD CONSTRAINT "hq_support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_tickets" ADD CONSTRAINT "hq_support_tickets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_tickets" ADD CONSTRAINT "hq_support_tickets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_tickets" ADD CONSTRAINT "hq_support_tickets_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_support_tickets" ADD CONSTRAINT "hq_support_tickets_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" ADD CONSTRAINT "knowledge_base_embeddings_article_id_knowledge_base_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_lessons" ADD CONSTRAINT "module_lessons_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_media" ADD CONSTRAINT "module_media_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_media" ADD CONSTRAINT "module_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_quizzes" ADD CONSTRAINT "module_quizzes_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_videos" ADD CONSTRAINT "module_videos_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_module_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."module_quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_attendance" ADD CONSTRAINT "shift_attendance_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_attendance" ADD CONSTRAINT "shift_attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_checklists" ADD CONSTRAINT "shift_checklists_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_checklists" ADD CONSTRAINT "shift_checklists_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_trade_requests" ADD CONSTRAINT "shift_trade_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_trade_requests" ADD CONSTRAINT "shift_trade_requests_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_trade_requests" ADD CONSTRAINT "shift_trade_requests_requester_shift_id_shifts_id_fk" FOREIGN KEY ("requester_shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_trade_requests" ADD CONSTRAINT "shift_trade_requests_responder_shift_id_shifts_id_fk" FOREIGN KEY ("responder_shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_trade_requests" ADD CONSTRAINT "shift_trade_requests_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_checklist2_id_checklists_id_fk" FOREIGN KEY ("checklist2_id") REFERENCES "public"."checklists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_checklist3_id_checklists_id_fk" FOREIGN KEY ("checklist3_id") REFERENCES "public"."checklists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity_logs" ADD CONSTRAINT "ticket_activity_logs_ticket_id_hq_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."hq_support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity_logs" ADD CONSTRAINT "ticket_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_modules" ADD CONSTRAINT "training_modules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_quiz_id_module_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."module_quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_training_progress" ADD CONSTRAINT "user_training_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_training_progress" ADD CONSTRAINT "user_training_progress_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instance_items" ADD CONSTRAINT "audit_instance_items_instance_id_audit_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."audit_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instance_items" ADD CONSTRAINT "audit_instance_items_template_item_id_audit_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."audit_template_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instances" ADD CONSTRAINT "audit_instances_template_id_audit_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instances" ADD CONSTRAINT "audit_instances_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instances" ADD CONSTRAINT "audit_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instances" ADD CONSTRAINT "audit_instances_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_item_scores" ADD CONSTRAINT "audit_item_scores_audit_id_quality_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."quality_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_item_scores" ADD CONSTRAINT "audit_item_scores_template_item_id_audit_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."audit_template_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_personnel_feedback" ADD CONSTRAINT "audit_personnel_feedback_audit_instance_id_audit_instances_id_fk" FOREIGN KEY ("audit_instance_id") REFERENCES "public"."audit_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_personnel_feedback" ADD CONSTRAINT "audit_personnel_feedback_personnel_id_users_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_personnel_feedback" ADD CONSTRAINT "audit_personnel_feedback_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_template_items" ADD CONSTRAINT "audit_template_items_template_id_audit_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_templates" ADD CONSTRAINT "audit_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_audit_scores" ADD CONSTRAINT "branch_audit_scores_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branding" ADD CONSTRAINT "branding_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_branches" ADD CONSTRAINT "campaign_branches_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_branches" ADD CONSTRAINT "campaign_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_updates" ADD CONSTRAINT "corrective_action_updates_corrective_action_id_corrective_actions_id_fk" FOREIGN KEY ("corrective_action_id") REFERENCES "public"."corrective_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_updates" ADD CONSTRAINT "corrective_action_updates_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_audit_instance_id_audit_instances_id_fk" FOREIGN KEY ("audit_instance_id") REFERENCES "public"."audit_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_audit_item_id_audit_template_items_id_fk" FOREIGN KEY ("audit_item_id") REFERENCES "public"."audit_template_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_availability" ADD CONSTRAINT "employee_availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_calibrations" ADD CONSTRAINT "equipment_calibrations_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_calibrations" ADD CONSTRAINT "equipment_calibrations_calibrated_by_id_users_id_fk" FOREIGN KEY ("calibrated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_calibrations" ADD CONSTRAINT "equipment_calibrations_audit_instance_id_audit_instances_id_fk" FOREIGN KEY ("audit_instance_id") REFERENCES "public"."audit_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_calibrations" ADD CONSTRAINT "equipment_calibrations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_custom_questions" ADD CONSTRAINT "feedback_custom_questions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_form_settings" ADD CONSTRAINT "feedback_form_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_form_settings" ADD CONSTRAINT "feedback_form_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_ip_blocks" ADD CONSTRAINT "feedback_ip_blocks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_feedback_id_customer_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."customer_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_onboarding" ADD CONSTRAINT "franchise_onboarding_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_onboarding" ADD CONSTRAINT "franchise_onboarding_assigned_coach_id_users_id_fk" FOREIGN KEY ("assigned_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_renewals" ADD CONSTRAINT "license_renewals_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_visibility_rules" ADD CONSTRAINT "menu_visibility_rules_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_visibility_rules" ADD CONSTRAINT "menu_visibility_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_visibility_rules" ADD CONSTRAINT "menu_visibility_rules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_onboarding_id_franchise_onboarding_id_fk" FOREIGN KEY ("onboarding_id") REFERENCES "public"."franchise_onboarding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_audit_scores" ADD CONSTRAINT "personnel_audit_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_audit_scores" ADD CONSTRAINT "personnel_audit_scores_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_files" ADD CONSTRAINT "personnel_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_template_id_audit_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_penalties" ADD CONSTRAINT "attendance_penalties_shift_attendance_id_shift_attendance_id_fk" FOREIGN KEY ("shift_attendance_id") REFERENCES "public"."shift_attendance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_penalties" ADD CONSTRAINT "attendance_penalties_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_quality_audits" ADD CONSTRAINT "branch_quality_audits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_quality_audits" ADD CONSTRAINT "branch_quality_audits_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_design_settings" ADD CONSTRAINT "certificate_design_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_settings" ADD CONSTRAINT "certificate_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplinary_reports" ADD CONSTRAINT "disciplinary_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplinary_reports" ADD CONSTRAINT "disciplinary_reports_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplinary_reports" ADD CONSTRAINT "disciplinary_reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplinary_reports" ADD CONSTRAINT "disciplinary_reports_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding" ADD CONSTRAINT "employee_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding" ADD CONSTRAINT "employee_onboarding_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding" ADD CONSTRAINT "employee_onboarding_assigned_mentor_id_users_id_fk" FOREIGN KEY ("assigned_mentor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding_assignments" ADD CONSTRAINT "employee_onboarding_assignments_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding_progress" ADD CONSTRAINT "employee_onboarding_progress_assignment_id_employee_onboarding_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."employee_onboarding_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding_progress" ADD CONSTRAINT "employee_onboarding_progress_step_id_onboarding_template_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."onboarding_template_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding_tasks" ADD CONSTRAINT "employee_onboarding_tasks_onboarding_id_employee_onboarding_id_fk" FOREIGN KEY ("onboarding_id") REFERENCES "public"."employee_onboarding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding_tasks" ADD CONSTRAINT "employee_onboarding_tasks_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding_tasks" ADD CONSTRAINT "employee_onboarding_tasks_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_performance_scores" ADD CONSTRAINT "employee_performance_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_performance_scores" ADD CONSTRAINT "employee_performance_scores_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_complaints" ADD CONSTRAINT "guest_complaints_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_complaints" ADD CONSTRAINT "guest_complaints_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_complaints" ADD CONSTRAINT "guest_complaints_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_certificates" ADD CONSTRAINT "issued_certificates_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_attendance_summaries" ADD CONSTRAINT "monthly_attendance_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_template_steps" ADD CONSTRAINT "onboarding_template_steps_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_shift_attendance_id_shift_attendance_id_fk" FOREIGN KEY ("shift_attendance_id") REFERENCES "public"."shift_attendance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_complaints" ADD CONSTRAINT "product_complaints_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_complaints" ADD CONSTRAINT "product_complaints_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_complaints" ADD CONSTRAINT "product_complaints_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_complaints" ADD CONSTRAINT "product_complaints_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission_grants" ADD CONSTRAINT "role_permission_grants_action_id_permission_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."permission_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_requester_shift_id_shifts_id_fk" FOREIGN KEY ("requester_shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_target_shift_id_shifts_id_fk" FOREIGN KEY ("target_shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_evaluations" ADD CONSTRAINT "staff_evaluations_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_evaluations" ADD CONSTRAINT "staff_evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_evaluations" ADD CONSTRAINT "staff_evaluations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_critical_logs" ADD CONSTRAINT "system_critical_logs_acknowledged_by_id_users_id_fk" FOREIGN KEY ("acknowledged_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_material_id_training_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."training_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_assignment_id_training_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."training_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_material_id_training_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."training_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_materials" ADD CONSTRAINT "training_materials_article_id_knowledge_base_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_materials" ADD CONSTRAINT "training_materials_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_feedbacks" ADD CONSTRAINT "branch_feedbacks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_feedbacks" ADD CONSTRAINT "branch_feedbacks_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_feedbacks" ADD CONSTRAINT "branch_feedbacks_responded_by_id_users_id_fk" FOREIGN KEY ("responded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_score_history" ADD CONSTRAINT "career_score_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_score_history" ADD CONSTRAINT "career_score_history_career_level_id_career_levels_id_fk" FOREIGN KEY ("career_level_id") REFERENCES "public"."career_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_user_projects" ADD CONSTRAINT "external_user_projects_external_user_id_external_users_id_fk" FOREIGN KEY ("external_user_id") REFERENCES "public"."external_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_user_projects" ADD CONSTRAINT "external_user_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_user_projects" ADD CONSTRAINT "external_user_projects_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_users" ADD CONSTRAINT "external_users_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_streaks" ADD CONSTRAINT "learning_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_items" ADD CONSTRAINT "lost_found_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_items" ADD CONSTRAINT "lost_found_items_found_by_id_users_id_fk" FOREIGN KEY ("found_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_items" ADD CONSTRAINT "lost_found_items_handovered_by_id_users_id_fk" FOREIGN KEY ("handovered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_external_user_id_external_users_id_fk" FOREIGN KEY ("external_user_id") REFERENCES "public"."external_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_sub_tasks" ADD CONSTRAINT "phase_sub_tasks_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_sub_tasks" ADD CONSTRAINT "phase_sub_tasks_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_sub_tasks" ADD CONSTRAINT "phase_sub_tasks_assignee_external_id_external_users_id_fk" FOREIGN KEY ("assignee_external_id") REFERENCES "public"."external_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_sub_tasks" ADD CONSTRAINT "phase_sub_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_sub_task_id_phase_sub_tasks_id_fk" FOREIGN KEY ("sub_task_id") REFERENCES "public"."phase_sub_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_awarded_by_id_users_id_fk" FOREIGN KEY ("awarded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_proposals" ADD CONSTRAINT "procurement_proposals_procurement_item_id_procurement_items_id_fk" FOREIGN KEY ("procurement_item_id") REFERENCES "public"."procurement_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_proposals" ADD CONSTRAINT "procurement_proposals_vendor_id_external_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."external_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_proposals" ADD CONSTRAINT "procurement_proposals_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_task_id_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "project_task_dependencies_task_id_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "project_task_dependencies_depends_on_task_id_project_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."project_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_vendors" ADD CONSTRAINT "project_vendors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_vendors" ADD CONSTRAINT "project_vendors_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_career_level_id_career_levels_id_fk" FOREIGN KEY ("career_level_id") REFERENCES "public"."career_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_notifications" ADD CONSTRAINT "recipe_notifications_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_notifications" ADD CONSTRAINT "recipe_notifications_version_id_recipe_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_notifications" ADD CONSTRAINT "recipe_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_category_id_recipe_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."recipe_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_career_progress" ADD CONSTRAINT "user_career_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_career_progress" ADD CONSTRAINT "user_career_progress_current_career_level_id_career_levels_id_fk" FOREIGN KEY ("current_career_level_id") REFERENCES "public"."career_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_career_progress" ADD CONSTRAINT "user_career_progress_last_exam_request_id_exam_requests_id_fk" FOREIGN KEY ("last_exam_request_id") REFERENCES "public"."exam_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_mission_id_daily_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."daily_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_practice_sessions" ADD CONSTRAINT "user_practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_report_summaries" ADD CONSTRAINT "ai_report_summaries_report_id_detailed_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."detailed_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_comparisons" ADD CONSTRAINT "branch_comparisons_report_id_detailed_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."detailed_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_comparisons" ADD CONSTRAINT "branch_comparisons_branch1_id_branches_id_fk" FOREIGN KEY ("branch1_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_comparisons" ADD CONSTRAINT "branch_comparisons_branch2_id_branches_id_fk" FOREIGN KEY ("branch2_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detailed_reports" ADD CONSTRAINT "detailed_reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leaves" ADD CONSTRAINT "employee_leaves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_ledger" ADD CONSTRAINT "employee_tax_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_user_audit_log" ADD CONSTRAINT "external_user_audit_log_external_user_id_external_users_id_fk" FOREIGN KEY ("external_user_id") REFERENCES "public"."external_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_user_audit_log" ADD CONSTRAINT "external_user_audit_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_responses" ADD CONSTRAINT "interview_responses_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_responses" ADD CONSTRAINT "interview_responses_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_position_id_job_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."job_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_referred_by_id_users_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_selected_application_id_job_applications_id_fk" FOREIGN KEY ("selected_application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_parameters" ADD CONSTRAINT "payroll_parameters_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_payroll_id_monthly_payrolls_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."monthly_payrolls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_deduction_type_id_salary_deduction_types_id_fk" FOREIGN KEY ("deduction_type_id") REFERENCES "public"."salary_deduction_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_email_settings" ADD CONSTRAINT "service_email_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_corrections" ADD CONSTRAINT "shift_corrections_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_corrections" ADD CONSTRAINT "shift_corrections_corrected_by_id_users_id_fk" FOREIGN KEY ("corrected_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_corrections" ADD CONSTRAINT "shift_corrections_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_corrections" ADD CONSTRAINT "shift_corrections_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_steps" ADD CONSTRAINT "task_steps_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_steps" ADD CONSTRAINT "task_steps_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_steps" ADD CONSTRAINT "task_steps_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_report_id_detailed_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."detailed_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_order_items" ADD CONSTRAINT "branch_order_items_order_id_branch_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."branch_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_order_items" ADD CONSTRAINT "branch_order_items_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_order_items" ADD CONSTRAINT "branch_order_items_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_orders" ADD CONSTRAINT "branch_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_orders" ADD CONSTRAINT "branch_orders_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_orders" ADD CONSTRAINT "branch_orders_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_orders" ADD CONSTRAINT "branch_orders_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_events" ADD CONSTRAINT "branch_shift_events_session_id_branch_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."branch_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_events" ADD CONSTRAINT "branch_shift_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_events" ADD CONSTRAINT "branch_shift_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_sessions" ADD CONSTRAINT "branch_shift_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_sessions" ADD CONSTRAINT "branch_shift_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_sessions" ADD CONSTRAINT "branch_shift_sessions_shift_attendance_id_shift_attendance_id_fk" FOREIGN KEY ("shift_attendance_id") REFERENCES "public"."shift_attendance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_sessions" ADD CONSTRAINT "branch_shift_sessions_gps_fallback_approved_by_users_id_fk" FOREIGN KEY ("gps_fallback_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_staff_pins" ADD CONSTRAINT "branch_staff_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_staff_pins" ADD CONSTRAINT "branch_staff_pins_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_ai_reports" ADD CONSTRAINT "factory_ai_reports_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_ai_reports" ADD CONSTRAINT "factory_ai_reports_target_station_id_factory_stations_id_fk" FOREIGN KEY ("target_station_id") REFERENCES "public"."factory_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_ai_reports" ADD CONSTRAINT "factory_ai_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_break_logs" ADD CONSTRAINT "factory_break_logs_session_event_id_factory_session_events_id_fk" FOREIGN KEY ("session_event_id") REFERENCES "public"."factory_session_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_break_logs" ADD CONSTRAINT "factory_break_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_break_logs" ADD CONSTRAINT "factory_break_logs_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_break_logs" ADD CONSTRAINT "factory_break_logs_target_station_id_factory_stations_id_fk" FOREIGN KEY ("target_station_id") REFERENCES "public"."factory_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_daily_targets" ADD CONSTRAINT "factory_daily_targets_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_inventory" ADD CONSTRAINT "factory_inventory_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_inventory" ADD CONSTRAINT "factory_inventory_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_inventory" ADD CONSTRAINT "factory_inventory_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_product_price_history" ADD CONSTRAINT "factory_product_price_history_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_product_price_history" ADD CONSTRAINT "factory_product_price_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_session_event_id_factory_session_events_id_fk" FOREIGN KEY ("session_event_id") REFERENCES "public"."factory_session_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_waste_reason_id_factory_waste_reasons_id_fk" FOREIGN KEY ("waste_reason_id") REFERENCES "public"."factory_waste_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_outputs" ADD CONSTRAINT "factory_production_outputs_quality_checked_by_users_id_fk" FOREIGN KEY ("quality_checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_plans" ADD CONSTRAINT "factory_production_plans_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_plans" ADD CONSTRAINT "factory_production_plans_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_plans" ADD CONSTRAINT "factory_production_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_runs" ADD CONSTRAINT "factory_production_runs_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_runs" ADD CONSTRAINT "factory_production_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_runs" ADD CONSTRAINT "factory_production_runs_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_products" ADD CONSTRAINT "factory_products_parent_product_id_factory_products_id_fk" FOREIGN KEY ("parent_product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_assignments" ADD CONSTRAINT "factory_quality_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_assignments" ADD CONSTRAINT "factory_quality_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_checks" ADD CONSTRAINT "factory_quality_checks_production_output_id_factory_production_outputs_id_fk" FOREIGN KEY ("production_output_id") REFERENCES "public"."factory_production_outputs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_checks" ADD CONSTRAINT "factory_quality_checks_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_checks" ADD CONSTRAINT "factory_quality_checks_producer_id_users_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_checks" ADD CONSTRAINT "factory_quality_checks_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_measurements" ADD CONSTRAINT "factory_quality_measurements_quality_check_id_factory_quality_checks_id_fk" FOREIGN KEY ("quality_check_id") REFERENCES "public"."factory_quality_checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_measurements" ADD CONSTRAINT "factory_quality_measurements_spec_id_factory_quality_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."factory_quality_specs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_media" ADD CONSTRAINT "factory_quality_media_quality_check_id_factory_quality_checks_id_fk" FOREIGN KEY ("quality_check_id") REFERENCES "public"."factory_quality_checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_media" ADD CONSTRAINT "factory_quality_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_specs" ADD CONSTRAINT "factory_quality_specs_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_specs" ADD CONSTRAINT "factory_quality_specs_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quality_specs" ADD CONSTRAINT "factory_quality_specs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_session_events" ADD CONSTRAINT "factory_session_events_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_session_events" ADD CONSTRAINT "factory_session_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_session_events" ADD CONSTRAINT "factory_session_events_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_session_events" ADD CONSTRAINT "factory_session_events_waste_reason_id_factory_waste_reasons_id_fk" FOREIGN KEY ("waste_reason_id") REFERENCES "public"."factory_waste_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_compliance" ADD CONSTRAINT "factory_shift_compliance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_compliance" ADD CONSTRAINT "factory_shift_compliance_factory_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("factory_session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_compliance" ADD CONSTRAINT "factory_shift_compliance_shift_attendance_id_shift_attendance_id_fk" FOREIGN KEY ("shift_attendance_id") REFERENCES "public"."shift_attendance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_compliance" ADD CONSTRAINT "factory_shift_compliance_overtime_approved_by_users_id_fk" FOREIGN KEY ("overtime_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_sessions" ADD CONSTRAINT "factory_shift_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_sessions" ADD CONSTRAINT "factory_shift_sessions_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_staff_pins" ADD CONSTRAINT "factory_staff_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_station_targets" ADD CONSTRAINT "factory_station_targets_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_station_targets" ADD CONSTRAINT "factory_station_targets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_stations" ADD CONSTRAINT "factory_stations_product_type_id_factory_products_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_team_members" ADD CONSTRAINT "factory_team_members_team_id_factory_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."factory_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_team_members" ADD CONSTRAINT "factory_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_team_session_members" ADD CONSTRAINT "factory_team_session_members_team_session_id_factory_team_sessions_id_fk" FOREIGN KEY ("team_session_id") REFERENCES "public"."factory_team_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_team_session_members" ADD CONSTRAINT "factory_team_session_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_team_session_members" ADD CONSTRAINT "factory_team_session_members_shift_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("shift_session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_team_sessions" ADD CONSTRAINT "factory_team_sessions_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_teams" ADD CONSTRAINT "factory_teams_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_teams" ADD CONSTRAINT "factory_teams_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_weekly_attendance_summary" ADD CONSTRAINT "factory_weekly_attendance_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_worker_scores" ADD CONSTRAINT "factory_worker_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_produced_by_id_users_id_fk" FOREIGN KEY ("produced_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_system_config" ADD CONSTRAINT "ai_system_config_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_break_logs" ADD CONSTRAINT "branch_break_logs_session_id_branch_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."branch_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_break_logs" ADD CONSTRAINT "branch_break_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_break_logs" ADD CONSTRAINT "branch_break_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_kiosk_settings" ADD CONSTRAINT "branch_kiosk_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_monthly_payroll_summary" ADD CONSTRAINT "branch_monthly_payroll_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_monthly_payroll_summary" ADD CONSTRAINT "branch_monthly_payroll_summary_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_monthly_payroll_summary" ADD CONSTRAINT "branch_monthly_payroll_summary_finalized_by_id_users_id_fk" FOREIGN KEY ("finalized_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_daily_summary" ADD CONSTRAINT "branch_shift_daily_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_daily_summary" ADD CONSTRAINT "branch_shift_daily_summary_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_shift_daily_summary" ADD CONSTRAINT "branch_shift_daily_summary_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_weekly_attendance_summary" ADD CONSTRAINT "branch_weekly_attendance_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_weekly_attendance_summary" ADD CONSTRAINT "branch_weekly_attendance_summary_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_alerts" ADD CONSTRAINT "dashboard_alerts_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_alerts" ADD CONSTRAINT "dashboard_alerts_acknowledged_by_user_id_users_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_alerts" ADD CONSTRAINT "dashboard_alerts_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_of_month_awards" ADD CONSTRAINT "employee_of_month_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_of_month_awards" ADD CONSTRAINT "employee_of_month_awards_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_of_month_awards" ADD CONSTRAINT "employee_of_month_awards_performance_id_monthly_employee_performance_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."monthly_employee_performance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_of_month_awards" ADD CONSTRAINT "employee_of_month_awards_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_of_month_weights" ADD CONSTRAINT "employee_of_month_weights_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_knowledge" ADD CONSTRAINT "equipment_knowledge_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_quality_checked_by_id_users_id_fk" FOREIGN KEY ("quality_checked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_shift_events" ADD CONSTRAINT "hq_shift_events_session_id_hq_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hq_shift_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_shift_events" ADD CONSTRAINT "hq_shift_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_shift_sessions" ADD CONSTRAINT "hq_shift_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_price_history" ADD CONSTRAINT "inventory_price_history_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_price_history" ADD CONSTRAINT "inventory_price_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_monthly_ratings" ADD CONSTRAINT "manager_monthly_ratings_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_monthly_ratings" ADD CONSTRAINT "manager_monthly_ratings_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_monthly_ratings" ADD CONSTRAINT "manager_monthly_ratings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_employee_performance" ADD CONSTRAINT "monthly_employee_performance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_employee_performance" ADD CONSTRAINT "monthly_employee_performance_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_checkin_nonces" ADD CONSTRAINT "qr_checkin_nonces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_qr_ratings" ADD CONSTRAINT "staff_qr_ratings_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_qr_ratings" ADD CONSTRAINT "staff_qr_ratings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_qr_tokens" ADD CONSTRAINT "staff_qr_tokens_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_qr_tokens" ADD CONSTRAINT "staff_qr_tokens_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cari_accounts" ADD CONSTRAINT "cari_accounts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cari_accounts" ADD CONSTRAINT "cari_accounts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cari_transactions" ADD CONSTRAINT "cari_transactions_account_id_cari_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."cari_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cari_transactions" ADD CONSTRAINT "cari_transactions_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cari_transactions" ADD CONSTRAINT "cari_transactions_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_module_visibility" ADD CONSTRAINT "dashboard_module_visibility_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_batch_specs" ADD CONSTRAINT "factory_batch_specs_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_batch_specs" ADD CONSTRAINT "factory_batch_specs_machine_id_factory_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."factory_machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_batch_specs" ADD CONSTRAINT "factory_batch_specs_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_batch_verifications" ADD CONSTRAINT "factory_batch_verifications_batch_id_factory_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."factory_production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_batch_verifications" ADD CONSTRAINT "factory_batch_verifications_verifier_user_id_users_id_fk" FOREIGN KEY ("verifier_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_fixed_costs" ADD CONSTRAINT "factory_fixed_costs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_shift_production_id_factory_shift_productions_id_fk" FOREIGN KEY ("shift_production_id") REFERENCES "public"."factory_shift_productions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_shift_id_factory_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."factory_shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_machine_id_factory_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."factory_machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_batch_spec_id_factory_batch_specs_id_fk" FOREIGN KEY ("batch_spec_id") REFERENCES "public"."factory_batch_specs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_batches" ADD CONSTRAINT "factory_production_batches_waste_reason_id_factory_waste_reasons_id_fk" FOREIGN KEY ("waste_reason_id") REFERENCES "public"."factory_waste_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_productions" ADD CONSTRAINT "factory_shift_productions_shift_id_factory_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."factory_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_productions" ADD CONSTRAINT "factory_shift_productions_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_productions" ADD CONSTRAINT "factory_shift_productions_machine_id_factory_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."factory_machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_productions" ADD CONSTRAINT "factory_shift_productions_batch_spec_id_factory_batch_specs_id_fk" FOREIGN KEY ("batch_spec_id") REFERENCES "public"."factory_batch_specs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_workers" ADD CONSTRAINT "factory_shift_workers_shift_id_factory_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."factory_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_workers" ADD CONSTRAINT "factory_shift_workers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_workers" ADD CONSTRAINT "factory_shift_workers_machine_id_factory_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."factory_machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shift_workers" ADD CONSTRAINT "factory_shift_workers_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shifts" ADD CONSTRAINT "factory_shifts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_collaborators" ADD CONSTRAINT "franchise_collaborators_project_id_franchise_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."franchise_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_comments" ADD CONSTRAINT "franchise_project_comments_project_id_franchise_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."franchise_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_comments" ADD CONSTRAINT "franchise_project_comments_task_id_franchise_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."franchise_project_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_comments" ADD CONSTRAINT "franchise_project_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_comments" ADD CONSTRAINT "franchise_project_comments_author_collaborator_id_franchise_collaborators_id_fk" FOREIGN KEY ("author_collaborator_id") REFERENCES "public"."franchise_collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_phases" ADD CONSTRAINT "franchise_project_phases_project_id_franchise_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."franchise_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_tasks" ADD CONSTRAINT "franchise_project_tasks_project_id_franchise_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."franchise_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_tasks" ADD CONSTRAINT "franchise_project_tasks_phase_id_franchise_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."franchise_project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_project_tasks" ADD CONSTRAINT "franchise_project_tasks_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_projects" ADD CONSTRAINT "franchise_projects_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_projects" ADD CONSTRAINT "franchise_projects_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_projects" ADD CONSTRAINT "franchise_projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_products" ADD CONSTRAINT "machine_products_machine_id_factory_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."factory_machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_products" ADD CONSTRAINT "machine_products_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_reports" ADD CONSTRAINT "management_reports_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_reports" ADD CONSTRAINT "management_reports_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_reports" ADD CONSTRAINT "management_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_calculations" ADD CONSTRAINT "product_cost_calculations_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_calculations" ADD CONSTRAINT "product_cost_calculations_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_calculations" ADD CONSTRAINT "product_cost_calculations_calculated_by_id_users_id_fk" FOREIGN KEY ("calculated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_packaging_items" ADD CONSTRAINT "product_packaging_items_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_packaging_items" ADD CONSTRAINT "product_packaging_items_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipe_ingredients" ADD CONSTRAINT "product_recipe_ingredients_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipe_ingredients" ADD CONSTRAINT "product_recipe_ingredients_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_cost_tracking" ADD CONSTRAINT "production_cost_tracking_production_record_id_production_records_id_fk" FOREIGN KEY ("production_record_id") REFERENCES "public"."production_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_cost_tracking" ADD CONSTRAINT "production_cost_tracking_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_ingredients" ADD CONSTRAINT "production_ingredients_production_record_id_production_records_id_fk" FOREIGN KEY ("production_record_id") REFERENCES "public"."production_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_ingredients" ADD CONSTRAINT "production_ingredients_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_produced_by_id_users_id_fk" FOREIGN KEY ("produced_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_margin_templates" ADD CONSTRAINT "profit_margin_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_price_history" ADD CONSTRAINT "raw_material_price_history_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_price_history" ADD CONSTRAINT "raw_material_price_history_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_gates" ADD CONSTRAINT "career_gates_from_level_id_career_levels_id_fk" FOREIGN KEY ("from_level_id") REFERENCES "public"."career_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_gates" ADD CONSTRAINT "career_gates_to_level_id_career_levels_id_fk" FOREIGN KEY ("to_level_id") REFERENCES "public"."career_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_gates" ADD CONSTRAINT "career_gates_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pack_items" ADD CONSTRAINT "content_pack_items_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pack_items" ADD CONSTRAINT "content_pack_items_training_module_id_training_modules_id_fk" FOREIGN KEY ("training_module_id") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pack_items" ADD CONSTRAINT "content_pack_items_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_catalog" ADD CONSTRAINT "equipment_catalog_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_service_status_updates" ADD CONSTRAINT "fault_service_status_updates_tracking_id_fault_service_tracking_id_fk" FOREIGN KEY ("tracking_id") REFERENCES "public"."fault_service_tracking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_service_status_updates" ADD CONSTRAINT "fault_service_status_updates_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_service_tracking" ADD CONSTRAINT "fault_service_tracking_fault_id_equipment_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."equipment_faults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_service_tracking" ADD CONSTRAINT "fault_service_tracking_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_service_tracking" ADD CONSTRAINT "fault_service_tracking_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_service_tracking" ADD CONSTRAINT "fault_service_tracking_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_safety_documents" ADD CONSTRAINT "food_safety_documents_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_safety_documents" ADD CONSTRAINT "food_safety_documents_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_safety_trainings" ADD CONSTRAINT "food_safety_trainings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_safety_trainings" ADD CONSTRAINT "food_safety_trainings_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_gate_id_career_gates_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."career_gates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_practical_approved_by_users_id_fk" FOREIGN KEY ("practical_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_control_points" ADD CONSTRAINT "haccp_control_points_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_control_points" ADD CONSTRAINT "haccp_control_points_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_records" ADD CONSTRAINT "haccp_records_control_point_id_haccp_control_points_id_fk" FOREIGN KEY ("control_point_id") REFERENCES "public"."haccp_control_points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_records" ADD CONSTRAINT "haccp_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_records" ADD CONSTRAINT "haccp_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hygiene_audits" ADD CONSTRAINT "hygiene_audits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hygiene_audits" ADD CONSTRAINT "hygiene_audits_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_results" ADD CONSTRAINT "import_results_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_assignments" ADD CONSTRAINT "inventory_count_assignments_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_assignments" ADD CONSTRAINT "inventory_count_assignments_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_assignments" ADD CONSTRAINT "inventory_count_assignments_counter_1_id_users_id_fk" FOREIGN KEY ("counter_1_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_assignments" ADD CONSTRAINT "inventory_count_assignments_counter_2_id_users_id_fk" FOREIGN KEY ("counter_2_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_entries" ADD CONSTRAINT "inventory_count_entries_assignment_id_inventory_count_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."inventory_count_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_entries" ADD CONSTRAINT "inventory_count_entries_counter_id_users_id_fk" FOREIGN KEY ("counter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_reports" ADD CONSTRAINT "inventory_count_reports_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_reports" ADD CONSTRAINT "inventory_count_reports_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_signal_rules" ADD CONSTRAINT "kpi_signal_rules_recommended_module_id_training_modules_id_fk" FOREIGN KEY ("recommended_module_id") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_scales" ADD CONSTRAINT "salary_scales_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_certifications" ADD CONSTRAINT "supplier_certifications_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_certifications" ADD CONSTRAINT "supplier_certifications_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_issues" ADD CONSTRAINT "supplier_issues_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_issues" ADD CONSTRAINT "supplier_issues_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_issues" ADD CONSTRAINT "supplier_issues_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_performance_scores" ADD CONSTRAINT "supplier_performance_scores_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evidence" ADD CONSTRAINT "task_evidence_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evidence" ADD CONSTRAINT "task_evidence_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evidence" ADD CONSTRAINT "task_evidence_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_action_links" ADD CONSTRAINT "waste_action_links_waste_event_id_waste_events_id_fk" FOREIGN KEY ("waste_event_id") REFERENCES "public"."waste_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_action_links" ADD CONSTRAINT "waste_action_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_action_links" ADD CONSTRAINT "waste_action_links_audit_log_id_audit_logs_id_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_action_links" ADD CONSTRAINT "waste_action_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_category_id_waste_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."waste_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_reason_id_waste_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."waste_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_lots" ADD CONSTRAINT "waste_lots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_reasons" ADD CONSTRAINT "waste_reasons_category_id_waste_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."waste_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_escalation_history" ADD CONSTRAINT "agent_escalation_history_source_action_id_agent_pending_actions_id_fk" FOREIGN KEY ("source_action_id") REFERENCES "public"."agent_pending_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_domain_policies" ADD CONSTRAINT "ai_domain_policies_domain_id_ai_data_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."ai_data_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_stock_movements" ADD CONSTRAINT "branch_stock_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_stock_movements" ADD CONSTRAINT "branch_stock_movements_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_stock_movements" ADD CONSTRAINT "branch_stock_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_receipts" ADD CONSTRAINT "broadcast_receipts_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_receipts" ADD CONSTRAINT "broadcast_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_receipts" ADD CONSTRAINT "broadcast_receipts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffee_roasting_logs" ADD CONSTRAINT "coffee_roasting_logs_green_coffee_product_id_factory_products_id_fk" FOREIGN KEY ("green_coffee_product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffee_roasting_logs" ADD CONSTRAINT "coffee_roasting_logs_roasted_product_id_factory_products_id_fk" FOREIGN KEY ("roasted_product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffee_roasting_logs" ADD CONSTRAINT "coffee_roasting_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_change_log" ADD CONSTRAINT "data_change_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_change_requests" ADD CONSTRAINT "data_change_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_change_requests" ADD CONSTRAINT "data_change_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_type_policies" ADD CONSTRAINT "employee_type_policies_employee_type_id_employee_types_id_fk" FOREIGN KEY ("employee_type_id") REFERENCES "public"."employee_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shipment_items" ADD CONSTRAINT "factory_shipment_items_shipment_id_factory_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."factory_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shipment_items" ADD CONSTRAINT "factory_shipment_items_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shipments" ADD CONSTRAINT "factory_shipments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_shipments" ADD CONSTRAINT "factory_shipments_prepared_by_id_users_id_fk" FOREIGN KEY ("prepared_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_investor_branches" ADD CONSTRAINT "franchise_investor_branches_investor_id_franchise_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."franchise_investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_investor_branches" ADD CONSTRAINT "franchise_investor_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_investor_notes" ADD CONSTRAINT "franchise_investor_notes_investor_id_franchise_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."franchise_investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_investor_notes" ADD CONSTRAINT "franchise_investor_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_investors" ADD CONSTRAINT "franchise_investors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_check_records" ADD CONSTRAINT "haccp_check_records_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_check_records" ADD CONSTRAINT "haccp_check_records_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_check_records" ADD CONSTRAINT "haccp_check_records_production_output_id_factory_production_outputs_id_fk" FOREIGN KEY ("production_output_id") REFERENCES "public"."factory_production_outputs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_tasks" ADD CONSTRAINT "hq_tasks_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hq_tasks" ADD CONSTRAINT "hq_tasks_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_department_topics" ADD CONSTRAINT "module_department_topics_department_id_module_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."module_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_flags" ADD CONSTRAINT "module_flags_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_flags" ADD CONSTRAINT "module_flags_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_flags" ADD CONSTRAINT "module_flags_disabled_by_users_id_fk" FOREIGN KEY ("disabled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_employee_type_assignments" ADD CONSTRAINT "org_employee_type_assignments_employee_type_id_employee_types_id_fk" FOREIGN KEY ("employee_type_id") REFERENCES "public"."employee_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deduction_config" ADD CONSTRAINT "payroll_deduction_config_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deduction_config" ADD CONSTRAINT "payroll_deduction_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deduction_config" ADD CONSTRAINT "payroll_deduction_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_daily_summary" ADD CONSTRAINT "pdks_daily_summary_import_id_pdks_excel_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."pdks_excel_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_daily_summary" ADD CONSTRAINT "pdks_daily_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_daily_summary" ADD CONSTRAINT "pdks_daily_summary_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_employee_mappings" ADD CONSTRAINT "pdks_employee_mappings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_employee_mappings" ADD CONSTRAINT "pdks_employee_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_employee_mappings" ADD CONSTRAINT "pdks_employee_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_excel_imports" ADD CONSTRAINT "pdks_excel_imports_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_excel_imports" ADD CONSTRAINT "pdks_excel_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_excel_imports" ADD CONSTRAINT "pdks_excel_imports_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_excel_records" ADD CONSTRAINT "pdks_excel_records_import_id_pdks_excel_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."pdks_excel_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_excel_records" ADD CONSTRAINT "pdks_excel_records_matched_user_id_users_id_fk" FOREIGN KEY ("matched_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_monthly_stats" ADD CONSTRAINT "pdks_monthly_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_monthly_stats" ADD CONSTRAINT "pdks_monthly_stats_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_monthly_stats" ADD CONSTRAINT "pdks_monthly_stats_source_import_id_pdks_excel_imports_id_fk" FOREIGN KEY ("source_import_id") REFERENCES "public"."pdks_excel_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_records" ADD CONSTRAINT "pdks_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_records" ADD CONSTRAINT "pdks_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdks_records" ADD CONSTRAINT "pdks_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_lots" ADD CONSTRAINT "production_lots_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_lots" ADD CONSTRAINT "production_lots_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_lots" ADD CONSTRAINT "production_lots_produced_by_users_id_fk" FOREIGN KEY ("produced_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_lots" ADD CONSTRAINT "production_lots_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_lots" ADD CONSTRAINT "production_lots_quality_check_id_factory_quality_checks_id_fk" FOREIGN KEY ("quality_check_id") REFERENCES "public"."factory_quality_checks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_revisions" ADD CONSTRAINT "record_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_offs" ADD CONSTRAINT "scheduled_offs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_offs" ADD CONSTRAINT "scheduled_offs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_business_hours" ADD CONSTRAINT "sla_business_hours_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_rules" ADD CONSTRAINT "sla_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_comment_id_support_ticket_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."support_ticket_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_cowork_members" ADD CONSTRAINT "ticket_cowork_members_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_cowork_members" ADD CONSTRAINT "ticket_cowork_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_cowork_members" ADD CONSTRAINT "ticket_cowork_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pack_progress" ADD CONSTRAINT "user_pack_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pack_progress" ADD CONSTRAINT "user_pack_progress_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pack_progress" ADD CONSTRAINT "user_pack_progress_pack_item_id_content_pack_items_id_fk" FOREIGN KEY ("pack_item_id") REFERENCES "public"."content_pack_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pack_progress" ADD CONSTRAINT "user_pack_progress_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_recurring_task_overrides" ADD CONSTRAINT "branch_recurring_task_overrides_recurring_task_id_branch_recurring_tasks_id_fk" FOREIGN KEY ("recurring_task_id") REFERENCES "public"."branch_recurring_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_recurring_task_overrides" ADD CONSTRAINT "branch_recurring_task_overrides_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_recurring_task_overrides" ADD CONSTRAINT "branch_recurring_task_overrides_disabled_by_user_id_users_id_fk" FOREIGN KEY ("disabled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_recurring_tasks" ADD CONSTRAINT "branch_recurring_tasks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_recurring_tasks" ADD CONSTRAINT "branch_recurring_tasks_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_recurring_tasks" ADD CONSTRAINT "branch_recurring_tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_task_instances" ADD CONSTRAINT "branch_task_instances_recurring_task_id_branch_recurring_tasks_id_fk" FOREIGN KEY ("recurring_task_id") REFERENCES "public"."branch_recurring_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_task_instances" ADD CONSTRAINT "branch_task_instances_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_task_instances" ADD CONSTRAINT "branch_task_instances_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_task_instances" ADD CONSTRAINT "branch_task_instances_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_task_instances" ADD CONSTRAINT "branch_task_instances_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guidance_dismissals" ADD CONSTRAINT "guidance_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_sessions" ADD CONSTRAINT "kiosk_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission_overrides" ADD CONSTRAINT "role_permission_overrides_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_digest_queue" ADD CONSTRAINT "notification_digest_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_calendar_events" ADD CONSTRAINT "user_calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_todos" ADD CONSTRAINT "user_todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_financial_summary" ADD CONSTRAINT "branch_financial_summary_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_monthly_snapshots" ADD CONSTRAINT "branch_monthly_snapshots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_production_records" ADD CONSTRAINT "daily_production_records_plan_item_id_production_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."production_plan_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_production_records" ADD CONSTRAINT "daily_production_records_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plan_items" ADD CONSTRAINT "production_plan_items_plan_id_weekly_production_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."weekly_production_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plan_items" ADD CONSTRAINT "production_plan_items_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_responsibilities" ADD CONSTRAINT "production_responsibilities_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_notes" ADD CONSTRAINT "workshop_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_action_comments" ADD CONSTRAINT "audit_action_comments_action_id_audit_actions_v2_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."audit_actions_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_action_comments" ADD CONSTRAINT "audit_action_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_actions_v2" ADD CONSTRAINT "audit_actions_v2_audit_id_audits_v2_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_actions_v2" ADD CONSTRAINT "audit_actions_v2_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_actions_v2" ADD CONSTRAINT "audit_actions_v2_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_actions_v2" ADD CONSTRAINT "audit_actions_v2_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_category_scores" ADD CONSTRAINT "audit_category_scores_audit_id_audits_v2_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_category_scores" ADD CONSTRAINT "audit_category_scores_category_id_audit_template_categories_v2_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."audit_template_categories_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_personnel_v2" ADD CONSTRAINT "audit_personnel_v2_audit_id_audits_v2_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_personnel_v2" ADD CONSTRAINT "audit_personnel_v2_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_responses_v2" ADD CONSTRAINT "audit_responses_v2_audit_id_audits_v2_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_responses_v2" ADD CONSTRAINT "audit_responses_v2_question_id_audit_template_questions_v2_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."audit_template_questions_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_template_categories_v2" ADD CONSTRAINT "audit_template_categories_v2_template_id_audit_templates_v2_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_templates_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_template_questions_v2" ADD CONSTRAINT "audit_template_questions_v2_category_id_audit_template_categories_v2_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."audit_template_categories_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_templates_v2" ADD CONSTRAINT "audit_templates_v2_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits_v2" ADD CONSTRAINT "audits_v2_template_id_audit_templates_v2_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_templates_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits_v2" ADD CONSTRAINT "audits_v2_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits_v2" ADD CONSTRAINT "audits_v2_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dobody_learning" ADD CONSTRAINT "dobody_learning_proposal_id_dobody_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."dobody_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dobody_proposals" ADD CONSTRAINT "dobody_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dobody_proposals" ADD CONSTRAINT "dobody_proposals_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dobody_proposals" ADD CONSTRAINT "dobody_proposals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_ingredient_nutrition" ADD CONSTRAINT "factory_ingredient_nutrition_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_ingredient_nutrition_history" ADD CONSTRAINT "factory_ingredient_nutrition_history_nutrition_id_factory_ingredient_nutrition_id_fk" FOREIGN KEY ("nutrition_id") REFERENCES "public"."factory_ingredient_nutrition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_ingredient_nutrition_history" ADD CONSTRAINT "factory_ingredient_nutrition_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_keyblend_ingredients" ADD CONSTRAINT "factory_keyblend_ingredients_keyblend_id_factory_keyblends_id_fk" FOREIGN KEY ("keyblend_id") REFERENCES "public"."factory_keyblends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_keyblend_ingredients" ADD CONSTRAINT "factory_keyblend_ingredients_raw_material_id_inventory_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_keyblends" ADD CONSTRAINT "factory_keyblends_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_recipe_version_id_factory_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."factory_recipe_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_session_id_factory_shift_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."factory_shift_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_production_logs" ADD CONSTRAINT "factory_production_logs_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_approvals" ADD CONSTRAINT "factory_recipe_approvals_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_approvals" ADD CONSTRAINT "factory_recipe_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_approvals" ADD CONSTRAINT "factory_recipe_approvals_recipe_version_id_factory_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."factory_recipe_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_category_access" ADD CONSTRAINT "factory_recipe_category_access_set_by_users_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_ingredient_snapshots" ADD CONSTRAINT "factory_recipe_ingredient_snapshots_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_ingredient_snapshots" ADD CONSTRAINT "factory_recipe_ingredient_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_ingredients" ADD CONSTRAINT "factory_recipe_ingredients_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_ingredients" ADD CONSTRAINT "factory_recipe_ingredients_keyblend_id_factory_keyblends_id_fk" FOREIGN KEY ("keyblend_id") REFERENCES "public"."factory_keyblends"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_ingredients" ADD CONSTRAINT "factory_recipe_ingredients_raw_material_id_inventory_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_label_print_logs" ADD CONSTRAINT "factory_recipe_label_print_logs_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_label_print_logs" ADD CONSTRAINT "factory_recipe_label_print_logs_printed_by_users_id_fk" FOREIGN KEY ("printed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_price_history" ADD CONSTRAINT "factory_recipe_price_history_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_price_history" ADD CONSTRAINT "factory_recipe_price_history_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_step_snapshots" ADD CONSTRAINT "factory_recipe_step_snapshots_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_step_snapshots" ADD CONSTRAINT "factory_recipe_step_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_steps" ADD CONSTRAINT "factory_recipe_steps_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_versions" ADD CONSTRAINT "factory_recipe_versions_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_versions" ADD CONSTRAINT "factory_recipe_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipe_versions" ADD CONSTRAINT "factory_recipe_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipes" ADD CONSTRAINT "factory_recipes_product_id_factory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."factory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipes" ADD CONSTRAINT "factory_recipes_station_id_factory_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."factory_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipes" ADD CONSTRAINT "factory_recipes_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipes" ADD CONSTRAINT "factory_recipes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_recipes" ADD CONSTRAINT "factory_recipes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plan_items" ADD CONSTRAINT "daily_material_plan_items_plan_id_daily_material_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."daily_material_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plan_items" ADD CONSTRAINT "daily_material_plan_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plan_items" ADD CONSTRAINT "daily_material_plan_items_recipe_id_factory_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."factory_recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plan_items" ADD CONSTRAINT "daily_material_plan_items_picked_by_users_id_fk" FOREIGN KEY ("picked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plan_items" ADD CONSTRAINT "daily_material_plan_items_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plans" ADD CONSTRAINT "daily_material_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_material_plans" ADD CONSTRAINT "daily_material_plans_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_pick_logs" ADD CONSTRAINT "material_pick_logs_plan_item_id_daily_material_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."daily_material_plan_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_pick_logs" ADD CONSTRAINT "material_pick_logs_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_pick_logs" ADD CONSTRAINT "material_pick_logs_picked_by_users_id_fk" FOREIGN KEY ("picked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_pick_logs" ADD CONSTRAINT "material_pick_logs_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_area_leftovers" ADD CONSTRAINT "production_area_leftovers_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_area_leftovers" ADD CONSTRAINT "production_area_leftovers_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_area_leftovers" ADD CONSTRAINT "production_area_leftovers_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "checklist_assignments_checklist_idx" ON "checklist_assignments" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "checklist_assignments_user_idx" ON "checklist_assignments" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "checklist_assignments_branch_idx" ON "checklist_assignments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "checklist_assignments_active_idx" ON "checklist_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "checklist_completions_assignment_idx" ON "checklist_completions" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "checklist_completions_user_idx" ON "checklist_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checklist_completions_date_idx" ON "checklist_completions" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "checklist_completions_status_idx" ON "checklist_completions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checklist_ratings_user_date_idx" ON "checklist_ratings" USING btree ("user_id","checklist_date");--> statement-breakpoint
CREATE INDEX "checklist_ratings_branch_date_idx" ON "checklist_ratings" USING btree ("branch_id","checklist_date");--> statement-breakpoint
CREATE INDEX "checklist_task_completions_completion_idx" ON "checklist_task_completions" USING btree ("completion_id");--> statement-breakpoint
CREATE INDEX "checklist_task_completions_task_idx" ON "checklist_task_completions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "checklist_task_completions_photo_expires_idx" ON "checklist_task_completions" USING btree ("photo_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_satisfaction_scores_user_unique_idx" ON "employee_satisfaction_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_satisfaction_scores_branch_idx" ON "employee_satisfaction_scores" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "employee_satisfaction_scores_composite_idx" ON "employee_satisfaction_scores" USING btree ("composite_score");--> statement-breakpoint
CREATE INDEX "equipment_branch_idx" ON "equipment" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "equipment_type_idx" ON "equipment" USING btree ("equipment_type");--> statement-breakpoint
CREATE INDEX "equipment_faults_branch_stage_idx" ON "equipment_faults" USING btree ("branch_id","current_stage");--> statement-breakpoint
CREATE INDEX "equipment_faults_equipment_idx" ON "equipment_faults" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_faults_troubleshooting_idx" ON "equipment_faults" USING btree ("troubleshooting_completed");--> statement-breakpoint
CREATE INDEX "equipment_faults_status_idx" ON "equipment_faults" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_faults_created_idx" ON "equipment_faults" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "troubleshooting_completion_fault_idx" ON "equipment_troubleshooting_completion" USING btree ("fault_id");--> statement-breakpoint
CREATE INDEX "troubleshooting_completion_step_idx" ON "equipment_troubleshooting_completion" USING btree ("step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_assignees_task_user_idx" ON "task_assignees" USING btree ("task_id","user_id");--> statement-breakpoint
CREATE INDEX "task_assignees_task_idx" ON "task_assignees" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_assignees_user_idx" ON "task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_comments_task_created" ON "task_comments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_escalation_log_task_level_sent_idx" ON "task_escalation_log" USING btree ("task_id","escalation_level","sent_at");--> statement-breakpoint
CREATE INDEX "task_escalation_log_sent_at_idx" ON "task_escalation_log" USING btree ("sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_ratings_task_id_unique_idx" ON "task_ratings" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_ratings_rated_user_idx" ON "task_ratings" USING btree ("rated_user_id");--> statement-breakpoint
CREATE INDEX "task_status_history_task_idx" ON "task_status_history" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_branch_status_idx" ON "tasks" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "tasks_assigned_to_idx" ON "tasks" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_trigger_idempotent_idx" ON "tasks" USING btree ("assigned_to_id","trigger_id","occurrence_key");--> statement-breakpoint
CREATE INDEX "dismissal_user_idx" ON "announcement_dismissals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aqr_announcement_idx" ON "announcement_quiz_results" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "aqr_user_idx" ON "announcement_quiz_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aqr_user_ann_idx" ON "announcement_quiz_results" USING btree ("user_id","announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_read_user_idx" ON "announcement_read_status" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "announcement_read_announcement_idx" ON "announcement_read_status" USING btree ("announcementId");--> statement-breakpoint
CREATE INDEX "announcements_published_idx" ON "announcements" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "announcements_category_idx" ON "announcements" USING btree ("category");--> statement-breakpoint
CREATE INDEX "announcements_dashboard_idx" ON "announcements" USING btree ("show_on_dashboard");--> statement-breakpoint
CREATE INDEX "announcements_status_idx" ON "announcements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "daily_cash_reports_branch_date_idx" ON "daily_cash_reports" USING btree ("branch_id","report_date");--> statement-breakpoint
CREATE INDEX "equipment_service_requests_equipment_idx" ON "equipment_service_requests" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_service_requests_status_idx" ON "equipment_service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_service_requests_fault_idx" ON "equipment_service_requests" USING btree ("fault_id");--> statement-breakpoint
CREATE INDEX "fault_comments_fault_idx" ON "fault_comments" USING btree ("fault_id");--> statement-breakpoint
CREATE INDEX "hq_support_cat_assign_category_idx" ON "hq_support_category_assignments" USING btree ("category");--> statement-breakpoint
CREATE INDEX "hq_support_cat_assign_user_idx" ON "hq_support_category_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hq_support_messages_ticket_created_idx" ON "hq_support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "hq_support_tickets_branch_idx" ON "hq_support_tickets" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "hq_support_tickets_category_idx" ON "hq_support_tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "hq_support_tickets_status_idx" ON "hq_support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hq_support_tickets_priority_idx" ON "hq_support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "hq_support_tickets_assigned_idx" ON "hq_support_tickets" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "kb_embeddings_article_idx" ON "knowledge_base_embeddings" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "leave_requests_user_idx" ON "leave_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_requests_date_idx" ON "leave_requests" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "message_reads_user_message_idx" ON "message_reads" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_idx" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_role_idx" ON "messages" USING btree ("recipient_role");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notifications_archived_created_idx" ON "notifications" USING btree ("is_archived","created_at");--> statement-breakpoint
CREATE INDEX "performance_metrics_branch_date_idx" ON "performance_metrics" USING btree ("branch_id","date");--> statement-breakpoint
CREATE INDEX "performance_metrics_user_date_idx" ON "performance_metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "shift_attendance_shift_idx" ON "shift_attendance" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_attendance_user_idx" ON "shift_attendance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shift_attendance_status_idx" ON "shift_attendance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shift_checklists_shift_idx" ON "shift_checklists" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_checklists_checklist_idx" ON "shift_checklists" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "shift_tasks_shift_idx" ON "shift_tasks" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_tasks_task_idx" ON "shift_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "shift_trade_requests_requester_idx" ON "shift_trade_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "shift_trade_requests_responder_idx" ON "shift_trade_requests" USING btree ("responder_id");--> statement-breakpoint
CREATE INDEX "shift_trade_requests_status_idx" ON "shift_trade_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shifts_branch_date_idx" ON "shifts" USING btree ("branch_id","shift_date");--> statement-breakpoint
CREATE INDEX "shifts_assigned_to_idx" ON "shifts" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "shifts_created_by_idx" ON "shifts" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "shifts_checklist_idx" ON "shifts" USING btree ("checklist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "thread_participants_thread_user_idx" ON "thread_participants" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX "ticket_activity_logs_ticket_idx" ON "ticket_activity_logs" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_activity_logs_created_idx" ON "ticket_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_training_progress_user_module_idx" ON "user_training_progress" USING btree ("user_id","module_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_feature_idx" ON "ai_usage_logs" USING btree ("feature");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_user_id_idx" ON "ai_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_branch_id_idx" ON "ai_usage_logs" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "audit_instance_items_instance_idx" ON "audit_instance_items" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "audit_instance_items_template_item_idx" ON "audit_instance_items" USING btree ("template_item_id");--> statement-breakpoint
CREATE INDEX "audit_instances_template_idx" ON "audit_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "audit_instances_branch_idx" ON "audit_instances" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "audit_instances_user_idx" ON "audit_instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_instances_auditor_idx" ON "audit_instances" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "audit_instances_date_idx" ON "audit_instances" USING btree ("audit_date");--> statement-breakpoint
CREATE INDEX "audit_item_scores_audit_idx" ON "audit_item_scores" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audit_feedback_personnel_idx" ON "audit_personnel_feedback" USING btree ("personnel_id");--> statement-breakpoint
CREATE INDEX "audit_feedback_instance_idx" ON "audit_personnel_feedback" USING btree ("audit_instance_id");--> statement-breakpoint
CREATE INDEX "audit_feedback_unread_idx" ON "audit_personnel_feedback" USING btree ("personnel_id","is_read_by_personnel");--> statement-breakpoint
CREATE INDEX "audit_template_items_template_idx" ON "audit_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "audit_templates_type_idx" ON "audit_templates" USING btree ("audit_type");--> statement-breakpoint
CREATE INDEX "audit_templates_category_idx" ON "audit_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "branch_audit_scores_branch_idx" ON "branch_audit_scores" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_audit_scores_period_idx" ON "branch_audit_scores" USING btree ("period_type","period_start");--> statement-breakpoint
CREATE INDEX "campaign_branches_campaign_idx" ON "campaign_branches" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_branches_branch_idx" ON "campaign_branches" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "campaign_metrics_campaign_idx" ON "campaign_metrics" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_metrics_branch_idx" ON "campaign_metrics" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_start_date_idx" ON "campaigns" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "campaigns_end_date_idx" ON "campaigns" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "corrective_action_updates_action_idx" ON "corrective_action_updates" USING btree ("corrective_action_id");--> statement-breakpoint
CREATE INDEX "corrective_actions_audit_instance_idx" ON "corrective_actions" USING btree ("audit_instance_id");--> statement-breakpoint
CREATE INDEX "corrective_actions_priority_idx" ON "corrective_actions" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "corrective_actions_status_idx" ON "corrective_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "corrective_actions_due_date_idx" ON "corrective_actions" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "customer_feedback_branch_idx" ON "customer_feedback" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "customer_feedback_date_idx" ON "customer_feedback" USING btree ("feedback_date");--> statement-breakpoint
CREATE INDEX "customer_feedback_rating_idx" ON "customer_feedback" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "customer_feedback_source_idx" ON "customer_feedback" USING btree ("source");--> statement-breakpoint
CREATE INDEX "customer_feedback_status_idx" ON "customer_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_feedback_staff_idx" ON "customer_feedback" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "customer_feedback_sla_idx" ON "customer_feedback" USING btree ("response_deadline");--> statement-breakpoint
CREATE INDEX "employee_availability_user_idx" ON "employee_availability" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_availability_date_idx" ON "employee_availability" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "employee_availability_status_idx" ON "employee_availability" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_calibrations_equipment_idx" ON "equipment_calibrations" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_calibrations_date_idx" ON "equipment_calibrations" USING btree ("calibration_date");--> statement-breakpoint
CREATE INDEX "equipment_calibrations_next_due_idx" ON "equipment_calibrations" USING btree ("next_calibration_due");--> statement-breakpoint
CREATE INDEX "equipment_calibrations_result_idx" ON "equipment_calibrations" USING btree ("result");--> statement-breakpoint
CREATE INDEX "feedback_custom_questions_branch_idx" ON "feedback_custom_questions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "feedback_form_settings_branch_idx" ON "feedback_form_settings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "feedback_ip_blocks_ip_idx" ON "feedback_ip_blocks" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "feedback_ip_blocks_branch_idx" ON "feedback_ip_blocks" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "feedback_responses_feedback_idx" ON "feedback_responses" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "feedback_responses_responder_idx" ON "feedback_responses" USING btree ("responder_id");--> statement-breakpoint
CREATE INDEX "franchise_onboarding_branch_idx" ON "franchise_onboarding" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "franchise_onboarding_status_idx" ON "franchise_onboarding" USING btree ("status");--> statement-breakpoint
CREATE INDEX "license_renewals_branch_idx" ON "license_renewals" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "license_renewals_expiry_idx" ON "license_renewals" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "license_renewals_status_idx" ON "license_renewals" USING btree ("renewal_status");--> statement-breakpoint
CREATE INDEX "maintenance_logs_equipment_idx" ON "maintenance_logs" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "maintenance_logs_schedule_idx" ON "maintenance_logs" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "maintenance_logs_date_idx" ON "maintenance_logs" USING btree ("performed_date");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_equipment_idx" ON "maintenance_schedules" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_next_date_idx" ON "maintenance_schedules" USING btree ("next_maintenance_date");--> statement-breakpoint
CREATE INDEX "onboarding_documents_onboarding_idx" ON "onboarding_documents" USING btree ("onboarding_id");--> statement-breakpoint
CREATE INDEX "onboarding_documents_status_idx" ON "onboarding_documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "page_content_slug_idx" ON "page_content" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "permissions_module_idx" ON "permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "permissions_name_idx" ON "permissions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "personnel_audit_scores_user_idx" ON "personnel_audit_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personnel_audit_scores_branch_idx" ON "personnel_audit_scores" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "personnel_audit_scores_period_idx" ON "personnel_audit_scores" USING btree ("period_type","period_start");--> statement-breakpoint
CREATE INDEX "personnel_files_user_idx" ON "personnel_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quality_audits_branch_idx" ON "quality_audits" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "quality_audits_auditor_idx" ON "quality_audits" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "quality_audits_date_idx" ON "quality_audits" USING btree ("audit_date");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "shift_templates_branch_idx" ON "shift_templates" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "shift_templates_active_idx" ON "shift_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "attendance_penalties_shift_idx" ON "attendance_penalties" USING btree ("shift_attendance_id");--> statement-breakpoint
CREATE INDEX "attendance_penalties_type_idx" ON "attendance_penalties" USING btree ("type");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_logs_branch_idx" ON "audit_logs" USING btree ("scope_branch_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_request_idx" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "backup_records_timestamp_idx" ON "backup_records" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "backup_records_success_idx" ON "backup_records" USING btree ("success");--> statement-breakpoint
CREATE INDEX "branch_quality_audits_branch_idx" ON "branch_quality_audits" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_quality_audits_date_idx" ON "branch_quality_audits" USING btree ("audit_date");--> statement-breakpoint
CREATE INDEX "branch_quality_audits_auditor_idx" ON "branch_quality_audits" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "career_levels_role_idx" ON "career_levels" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "career_levels_level_idx" ON "career_levels" USING btree ("level_number");--> statement-breakpoint
CREATE INDEX "cert_design_transition_idx" ON "certificate_design_settings" USING btree ("transition_from","transition_to");--> statement-breakpoint
CREATE INDEX "disciplinary_reports_user_idx" ON "disciplinary_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "disciplinary_reports_branch_idx" ON "disciplinary_reports" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "disciplinary_reports_type_idx" ON "disciplinary_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "disciplinary_reports_status_idx" ON "disciplinary_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disciplinary_reports_date_idx" ON "disciplinary_reports" USING btree ("incident_date");--> statement-breakpoint
CREATE INDEX "employee_documents_user_idx" ON "employee_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_documents_type_idx" ON "employee_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "employee_documents_expiry_idx" ON "employee_documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "employee_onboarding_user_idx" ON "employee_onboarding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_branch_idx" ON "employee_onboarding" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_status_idx" ON "employee_onboarding" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employee_onboarding_assignments_user_idx" ON "employee_onboarding_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_assignments_branch_idx" ON "employee_onboarding_assignments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_assignments_status_idx" ON "employee_onboarding_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employee_onboarding_progress_assignment_idx" ON "employee_onboarding_progress" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_progress_step_idx" ON "employee_onboarding_progress" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_progress_mentor_idx" ON "employee_onboarding_progress" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_progress_status_idx" ON "employee_onboarding_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_tasks_onboarding_idx" ON "employee_onboarding_tasks" USING btree ("onboarding_id");--> statement-breakpoint
CREATE INDEX "onboarding_tasks_status_idx" ON "employee_onboarding_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_tasks_due_date_idx" ON "employee_onboarding_tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "performance_scores_user_idx" ON "employee_performance_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "performance_scores_branch_idx" ON "employee_performance_scores" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "performance_scores_date_idx" ON "employee_performance_scores" USING btree ("date");--> statement-breakpoint
CREATE INDEX "performance_scores_week_idx" ON "employee_performance_scores" USING btree ("week");--> statement-breakpoint
CREATE INDEX "troubleshooting_equipment_type_idx" ON "equipment_troubleshooting_steps" USING btree ("equipment_type");--> statement-breakpoint
CREATE INDEX "troubleshooting_order_idx" ON "equipment_troubleshooting_steps" USING btree ("order");--> statement-breakpoint
CREATE INDEX "exam_requests_user_idx" ON "exam_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exam_requests_status_idx" ON "exam_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exam_requests_target_role_idx" ON "exam_requests" USING btree ("target_role_id");--> statement-breakpoint
CREATE INDEX "guest_complaints_branch_idx" ON "guest_complaints" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "guest_complaints_status_idx" ON "guest_complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "guest_complaints_priority_idx" ON "guest_complaints" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "guest_complaints_date_idx" ON "guest_complaints" USING btree ("complaint_date");--> statement-breakpoint
CREATE INDEX "guest_complaints_deadline_idx" ON "guest_complaints" USING btree ("response_deadline");--> statement-breakpoint
CREATE INDEX "mega_module_mappings_module_idx" ON "mega_module_mappings" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "mega_module_mappings_mega_idx" ON "mega_module_mappings" USING btree ("mega_module_id");--> statement-breakpoint
CREATE INDEX "monthly_summaries_user_idx" ON "monthly_attendance_summaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "monthly_summaries_period_idx" ON "monthly_attendance_summaries" USING btree ("period_month");--> statement-breakpoint
CREATE INDEX "onboarding_template_steps_template_idx" ON "onboarding_template_steps" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "onboarding_template_steps_order_idx" ON "onboarding_template_steps" USING btree ("step_order");--> statement-breakpoint
CREATE INDEX "onboarding_templates_target_role_idx" ON "onboarding_templates" USING btree ("target_role");--> statement-breakpoint
CREATE INDEX "onboarding_templates_active_idx" ON "onboarding_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "overtime_requests_user_idx" ON "overtime_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "overtime_requests_status_idx" ON "overtime_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "overtime_requests_period_idx" ON "overtime_requests" USING btree ("applied_to_period");--> statement-breakpoint
CREATE INDEX "overtime_requests_date_idx" ON "overtime_requests" USING btree ("overtime_date");--> statement-breakpoint
CREATE INDEX "overtime_requests_branch_idx" ON "overtime_requests" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "permission_actions_module_key_idx" ON "permission_actions" USING btree ("module_key");--> statement-breakpoint
CREATE INDEX "permission_modules_module_key_idx" ON "permission_modules" USING btree ("module_key");--> statement-breakpoint
CREATE INDEX "permission_modules_category_idx" ON "permission_modules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "product_complaints_branch_idx" ON "product_complaints" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "product_complaints_status_idx" ON "product_complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_complaints_assigned_idx" ON "product_complaints" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "product_complaints_created_idx" ON "product_complaints" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "role_module_permissions_role_idx" ON "role_module_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "role_module_permissions_module_idx" ON "role_module_permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "role_permission_grants_role_idx" ON "role_permission_grants" USING btree ("role");--> statement-breakpoint
CREATE INDEX "role_permission_grants_action_idx" ON "role_permission_grants" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "shift_swap_requester_idx" ON "shift_swap_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "shift_swap_target_idx" ON "shift_swap_requests" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "shift_swap_status_idx" ON "shift_swap_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shift_swap_branch_idx" ON "shift_swap_requests" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "shift_swap_date_idx" ON "shift_swap_requests" USING btree ("swap_date");--> statement-breakpoint
CREATE INDEX "site_settings_key_idx" ON "site_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "site_settings_category_idx" ON "site_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "system_critical_logs_created_idx" ON "system_critical_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_critical_logs_status_idx" ON "system_critical_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_critical_logs_tag_idx" ON "system_critical_logs" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "training_assignments_material_idx" ON "training_assignments" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "training_assignments_user_idx" ON "training_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_assignments_status_idx" ON "training_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_assignments_due_date_idx" ON "training_assignments" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "training_completions_user_idx" ON "training_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_completions_material_idx" ON "training_completions" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "training_completions_status_idx" ON "training_completions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_completions_completed_idx" ON "training_completions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "training_materials_article_idx" ON "training_materials" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "training_materials_status_idx" ON "training_materials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_materials_type_idx" ON "training_materials" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "academy_hub_categories_order_idx" ON "academy_hub_categories" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "badges_category_idx" ON "badges" USING btree ("category");--> statement-breakpoint
CREATE INDEX "branch_feedbacks_branch_idx" ON "branch_feedbacks" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_feedbacks_status_idx" ON "branch_feedbacks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "branch_feedbacks_created_idx" ON "branch_feedbacks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "career_score_history_user_idx" ON "career_score_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "career_score_history_month_idx" ON "career_score_history" USING btree ("score_month");--> statement-breakpoint
CREATE INDEX "daily_missions_type_idx" ON "daily_missions" USING btree ("mission_type");--> statement-breakpoint
CREATE INDEX "daily_missions_active_idx" ON "daily_missions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "external_user_projects_user_idx" ON "external_user_projects" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "external_user_projects_project_idx" ON "external_user_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "external_users_email_idx" ON "external_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "external_users_token_idx" ON "external_users" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_user_idx" ON "leaderboard_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_period_idx" ON "leaderboard_snapshots" USING btree ("period_type","period_key");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_rank_idx" ON "leaderboard_snapshots" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "learning_streaks_user_idx" ON "learning_streaks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lost_found_branch_idx" ON "lost_found_items" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "lost_found_status_idx" ON "lost_found_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lost_found_found_date_idx" ON "lost_found_items" USING btree ("found_date");--> statement-breakpoint
CREATE INDEX "lost_found_created_idx" ON "lost_found_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "manager_evaluations_employee_idx" ON "manager_evaluations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "manager_evaluations_month_idx" ON "manager_evaluations" USING btree ("evaluation_month");--> statement-breakpoint
CREATE INDEX "manager_evaluations_branch_idx" ON "manager_evaluations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "phase_assignments_phase_idx" ON "phase_assignments" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "phase_assignments_user_idx" ON "phase_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "phase_assignments_external_idx" ON "phase_assignments" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "phase_sub_tasks_phase_idx" ON "phase_sub_tasks" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "phase_sub_tasks_parent_idx" ON "phase_sub_tasks" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "phase_sub_tasks_status_idx" ON "phase_sub_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "procurement_items_subtask_idx" ON "procurement_items" USING btree ("sub_task_id");--> statement-breakpoint
CREATE INDEX "procurement_items_status_idx" ON "procurement_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "procurement_proposals_item_idx" ON "procurement_proposals" USING btree ("procurement_item_id");--> statement-breakpoint
CREATE INDEX "procurement_proposals_vendor_idx" ON "procurement_proposals" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "procurement_proposals_status_idx" ON "procurement_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_budget_project_idx" ON "project_budget_lines" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_budget_phase_idx" ON "project_budget_lines" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "project_budget_category_idx" ON "project_budget_lines" USING btree ("category");--> statement-breakpoint
CREATE INDEX "project_budget_status_idx" ON "project_budget_lines" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "project_comments_project_idx" ON "project_comments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_comments_task_idx" ON "project_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "project_comments_user_idx" ON "project_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_comments_created_idx" ON "project_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_milestones_project_idx" ON "project_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_milestones_status_idx" ON "project_milestones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_phases_project_idx" ON "project_phases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_phases_type_idx" ON "project_phases" USING btree ("phase_type");--> statement-breakpoint
CREATE INDEX "project_phases_status_idx" ON "project_phases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_risks_project_idx" ON "project_risks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_risks_phase_idx" ON "project_risks" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "project_risks_severity_idx" ON "project_risks" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "project_risks_status_idx" ON "project_risks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_dependencies_task_idx" ON "project_task_dependencies" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_dependencies_depends_on_idx" ON "project_task_dependencies" USING btree ("depends_on_task_id");--> statement-breakpoint
CREATE INDEX "project_tasks_project_idx" ON "project_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_tasks_assigned_idx" ON "project_tasks" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "project_tasks_status_idx" ON "project_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_tasks_parent_idx" ON "project_tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "project_tasks_milestone_idx" ON "project_tasks" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "project_vendors_project_idx" ON "project_vendors" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_vendors_type_idx" ON "project_vendors" USING btree ("vendor_type");--> statement-breakpoint
CREATE INDEX "project_vendors_status_idx" ON "project_vendors" USING btree ("contract_status");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_active_idx" ON "projects" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "projects_type_idx" ON "projects" USING btree ("project_type");--> statement-breakpoint
CREATE INDEX "quiz_results_user_idx" ON "quiz_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_results_score_idx" ON "quiz_results" USING btree ("score");--> statement-breakpoint
CREATE INDEX "quizzes_career_level_idx" ON "quizzes" USING btree ("career_level_id");--> statement-breakpoint
CREATE INDEX "quizzes_difficulty_idx" ON "quizzes" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "recipe_categories_slug_idx" ON "recipe_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "recipe_categories_order_idx" ON "recipe_categories" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "recipe_notifications_user_idx" ON "recipe_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_notifications_recipe_idx" ON "recipe_notifications" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_versions_recipe_idx" ON "recipe_versions" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_versions_version_idx" ON "recipe_versions" USING btree ("version_number");--> statement-breakpoint
CREATE INDEX "recipes_category_idx" ON "recipes" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "recipes_code_idx" ON "recipes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "recipes_active_idx" ON "recipes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_badges_badge_idx" ON "user_badges" USING btree ("badge_id");--> statement-breakpoint
CREATE INDEX "user_career_progress_user_idx" ON "user_career_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_career_progress_level_idx" ON "user_career_progress" USING btree ("current_career_level_id");--> statement-breakpoint
CREATE INDEX "user_career_progress_composite_score_idx" ON "user_career_progress" USING btree ("composite_score");--> statement-breakpoint
CREATE INDEX "user_mission_progress_user_idx" ON "user_mission_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_mission_progress_date_idx" ON "user_mission_progress" USING btree ("mission_date");--> statement-breakpoint
CREATE INDEX "user_practice_sessions_user_idx" ON "user_practice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_practice_sessions_date_idx" ON "user_practice_sessions" USING btree ("session_date");--> statement-breakpoint
CREATE INDEX "summaries_report_idx" ON "ai_report_summaries" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "banners_active_idx" ON "banners" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "banners_dates_idx" ON "banners" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "comparisons_report_idx" ON "branch_comparisons" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "comparisons_metric_idx" ON "branch_comparisons" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "reports_type_idx" ON "detailed_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "reports_created_idx" ON "detailed_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employee_benefits_user_idx" ON "employee_benefits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_benefits_active_idx" ON "employee_benefits" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "employee_leaves_user_idx" ON "employee_leaves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_leaves_year_idx" ON "employee_leaves" USING btree ("year");--> statement-breakpoint
CREATE INDEX "employee_leaves_type_idx" ON "employee_leaves" USING btree ("leave_type");--> statement-breakpoint
CREATE INDEX "employee_salaries_user_idx" ON "employee_salaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_salaries_active_idx" ON "employee_salaries" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "employee_salaries_effective_idx" ON "employee_salaries" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "employee_tax_ledger_user_idx" ON "employee_tax_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_tax_ledger_year_idx" ON "employee_tax_ledger" USING btree ("year");--> statement-breakpoint
CREATE INDEX "employee_terminations_user_idx" ON "employee_terminations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_terminations_date_idx" ON "employee_terminations" USING btree ("termination_date");--> statement-breakpoint
CREATE INDEX "employee_terminations_type_idx" ON "employee_terminations" USING btree ("termination_type");--> statement-breakpoint
CREATE INDEX "external_audit_user_idx" ON "external_user_audit_log" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "external_audit_project_idx" ON "external_user_audit_log" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "external_audit_created_idx" ON "external_user_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "interview_responses_interview_idx" ON "interview_responses" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_responses_question_idx" ON "interview_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "interviews_application_idx" ON "interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "interviews_date_idx" ON "interviews" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "interviews_interviewer_idx" ON "interviews" USING btree ("interviewer_id");--> statement-breakpoint
CREATE INDEX "job_applications_position_idx" ON "job_applications" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "job_applications_status_idx" ON "job_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_positions_status_idx" ON "job_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_positions_branch_idx" ON "job_positions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "leave_records_user_idx" ON "leave_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leave_records_date_idx" ON "leave_records" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "leave_records_status_idx" ON "leave_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payrolls_user_idx" ON "monthly_payrolls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payrolls_branch_idx" ON "monthly_payrolls" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "payrolls_period_idx" ON "monthly_payrolls" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "payrolls_status_idx" ON "monthly_payrolls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payroll_parameters_year_idx" ON "payroll_parameters" USING btree ("year");--> statement-breakpoint
CREATE INDEX "payroll_parameters_active_idx" ON "payroll_parameters" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "payroll_records_user_idx" ON "payroll_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payroll_records_period_idx" ON "payroll_records" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "payroll_records_status_idx" ON "payroll_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "public_holidays_date_idx" ON "public_holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX "public_holidays_year_idx" ON "public_holidays" USING btree ("year");--> statement-breakpoint
CREATE INDEX "deduction_types_code_idx" ON "salary_deduction_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "deduction_types_active_idx" ON "salary_deduction_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "salary_deductions_user_idx" ON "salary_deductions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "salary_deductions_payroll_idx" ON "salary_deductions" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX "salary_deductions_type_idx" ON "salary_deductions" USING btree ("deduction_type_id");--> statement-breakpoint
CREATE INDEX "salary_deductions_date_idx" ON "salary_deductions" USING btree ("reference_date");--> statement-breakpoint
CREATE INDEX "salary_deductions_status_idx" ON "salary_deductions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shift_corrections_shift_idx" ON "shift_corrections" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_corrections_employee_idx" ON "shift_corrections" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "shift_corrections_corrected_by_idx" ON "shift_corrections" USING btree ("corrected_by_id");--> statement-breakpoint
CREATE INDEX "task_steps_task_idx" ON "task_steps" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_steps_author_idx" ON "task_steps" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "task_steps_order_idx" ON "task_steps" USING btree ("task_id","order");--> statement-breakpoint
CREATE INDEX "titles_scope_idx" ON "titles" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "trends_report_idx" ON "trend_metrics" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "trends_branch_idx" ON "trend_metrics" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "trends_metric_idx" ON "trend_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "trends_date_idx" ON "trend_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "branch_order_items_order_idx" ON "branch_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "branch_order_items_product_idx" ON "branch_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "branch_orders_branch_idx" ON "branch_orders" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_orders_status_idx" ON "branch_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "branch_orders_date_idx" ON "branch_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "branch_shift_events_session_idx" ON "branch_shift_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "branch_shift_events_user_idx" ON "branch_shift_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "branch_shift_events_time_idx" ON "branch_shift_events" USING btree ("event_time");--> statement-breakpoint
CREATE INDEX "branch_shift_events_type_idx" ON "branch_shift_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "branch_shift_sessions_user_idx" ON "branch_shift_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "branch_shift_sessions_branch_idx" ON "branch_shift_sessions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_shift_sessions_date_idx" ON "branch_shift_sessions" USING btree ("check_in_time");--> statement-breakpoint
CREATE INDEX "branch_shift_sessions_status_idx" ON "branch_shift_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "branch_staff_pins_branch_idx" ON "branch_staff_pins" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "factory_ai_reports_type_idx" ON "factory_ai_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "factory_ai_reports_user_idx" ON "factory_ai_reports" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "factory_ai_reports_date_idx" ON "factory_ai_reports" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "factory_break_logs_user_idx" ON "factory_break_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_break_logs_session_idx" ON "factory_break_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "factory_break_logs_reason_idx" ON "factory_break_logs" USING btree ("break_reason");--> statement-breakpoint
CREATE INDEX "factory_break_logs_date_idx" ON "factory_break_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "factory_inventory_product_idx" ON "factory_inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fpph_product_idx" ON "factory_product_price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fpph_source_idx" ON "factory_product_price_history" USING btree ("source");--> statement-breakpoint
CREATE INDEX "fpph_date_idx" ON "factory_product_price_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "fpph_product_date_idx" ON "factory_product_price_history" USING btree ("product_id","changed_at");--> statement-breakpoint
CREATE INDEX "factory_production_outputs_session_idx" ON "factory_production_outputs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "factory_production_outputs_user_idx" ON "factory_production_outputs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_production_outputs_station_idx" ON "factory_production_outputs" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_production_outputs_quality_idx" ON "factory_production_outputs" USING btree ("quality_status");--> statement-breakpoint
CREATE INDEX "factory_production_outputs_date_idx" ON "factory_production_outputs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "factory_production_plans_date_idx" ON "factory_production_plans" USING btree ("plan_date");--> statement-breakpoint
CREATE INDEX "factory_production_plans_product_idx" ON "factory_production_plans" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "factory_production_plans_status_idx" ON "factory_production_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "factory_production_runs_session_idx" ON "factory_production_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "factory_production_runs_user_idx" ON "factory_production_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_production_runs_station_idx" ON "factory_production_runs" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_production_runs_date_idx" ON "factory_production_runs" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "factory_products_category_idx" ON "factory_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "factory_products_sku_idx" ON "factory_products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "factory_quality_assignments_user_idx" ON "factory_quality_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_quality_checks_output_idx" ON "factory_quality_checks" USING btree ("production_output_id");--> statement-breakpoint
CREATE INDEX "factory_quality_checks_inspector_idx" ON "factory_quality_checks" USING btree ("inspector_id");--> statement-breakpoint
CREATE INDEX "factory_quality_checks_producer_idx" ON "factory_quality_checks" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "factory_quality_checks_date_idx" ON "factory_quality_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "factory_quality_measurements_check_idx" ON "factory_quality_measurements" USING btree ("quality_check_id");--> statement-breakpoint
CREATE INDEX "factory_quality_measurements_spec_idx" ON "factory_quality_measurements" USING btree ("spec_id");--> statement-breakpoint
CREATE INDEX "factory_quality_media_check_idx" ON "factory_quality_media" USING btree ("quality_check_id");--> statement-breakpoint
CREATE INDEX "factory_quality_specs_station_idx" ON "factory_quality_specs" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_quality_specs_product_idx" ON "factory_quality_specs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "factory_session_events_session_idx" ON "factory_session_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "factory_session_events_user_idx" ON "factory_session_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_session_events_type_idx" ON "factory_session_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "factory_session_events_date_idx" ON "factory_session_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "factory_shift_compliance_user_idx" ON "factory_shift_compliance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_shift_compliance_date_idx" ON "factory_shift_compliance" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "factory_shift_compliance_session_idx" ON "factory_shift_compliance" USING btree ("factory_session_id");--> statement-breakpoint
CREATE INDEX "factory_shift_compliance_status_idx" ON "factory_shift_compliance" USING btree ("compliance_status");--> statement-breakpoint
CREATE INDEX "factory_shift_sessions_user_idx" ON "factory_shift_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_shift_sessions_station_idx" ON "factory_shift_sessions" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_shift_sessions_date_idx" ON "factory_shift_sessions" USING btree ("check_in_time");--> statement-breakpoint
CREATE INDEX "factory_station_targets_station_idx" ON "factory_station_targets" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_station_targets_period_idx" ON "factory_station_targets" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "factory_team_members_team_idx" ON "factory_team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "factory_team_members_user_idx" ON "factory_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_team_session_members_session_idx" ON "factory_team_session_members" USING btree ("team_session_id");--> statement-breakpoint
CREATE INDEX "factory_team_session_members_user_idx" ON "factory_team_session_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_team_sessions_station_idx" ON "factory_team_sessions" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_team_sessions_date_idx" ON "factory_team_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "factory_teams_station_idx" ON "factory_teams" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "factory_weekly_summary_user_idx" ON "factory_weekly_attendance_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_weekly_summary_week_idx" ON "factory_weekly_attendance_summary" USING btree ("week_start_date");--> statement-breakpoint
CREATE INDEX "factory_worker_scores_user_idx" ON "factory_worker_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "factory_worker_scores_date_idx" ON "factory_worker_scores" USING btree ("period_date");--> statement-breakpoint
CREATE INDEX "production_batches_product_idx" ON "production_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "production_batches_status_idx" ON "production_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_batches_date_idx" ON "production_batches" USING btree ("production_date");--> statement-breakpoint
CREATE INDEX "role_templates_domain_idx" ON "role_templates" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "role_templates_base_role_idx" ON "role_templates" USING btree ("base_role");--> statement-breakpoint
CREATE INDEX "branch_break_logs_session_idx" ON "branch_break_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "branch_break_logs_user_idx" ON "branch_break_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "branch_monthly_payroll_user_idx" ON "branch_monthly_payroll_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "branch_monthly_payroll_branch_idx" ON "branch_monthly_payroll_summary" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_monthly_payroll_month_idx" ON "branch_monthly_payroll_summary" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "branch_daily_summary_user_idx" ON "branch_shift_daily_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "branch_daily_summary_branch_idx" ON "branch_shift_daily_summary" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_daily_summary_date_idx" ON "branch_shift_daily_summary" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "branch_weekly_summary_user_idx" ON "branch_weekly_attendance_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "branch_weekly_summary_branch_idx" ON "branch_weekly_attendance_summary" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_weekly_summary_week_idx" ON "branch_weekly_attendance_summary" USING btree ("week_start_date");--> statement-breakpoint
CREATE INDEX "dashboard_alerts_context_idx" ON "dashboard_alerts" USING btree ("context","context_id");--> statement-breakpoint
CREATE INDEX "dashboard_alerts_status_idx" ON "dashboard_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dashboard_alerts_severity_idx" ON "dashboard_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "dashboard_alerts_occurred_at_idx" ON "dashboard_alerts" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "eom_award_user_idx" ON "employee_of_month_awards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "eom_award_period_idx" ON "employee_of_month_awards" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "eq_knowledge_type_idx" ON "equipment_knowledge" USING btree ("equipment_type");--> statement-breakpoint
CREATE INDEX "eq_knowledge_brand_idx" ON "equipment_knowledge" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "eq_knowledge_category_idx" ON "equipment_knowledge" USING btree ("category");--> statement-breakpoint
CREATE INDEX "eq_knowledge_active_idx" ON "equipment_knowledge" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "gr_receipt_number_idx" ON "goods_receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "gr_po_idx" ON "goods_receipts" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "gr_supplier_idx" ON "goods_receipts" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "gr_status_idx" ON "goods_receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gr_date_idx" ON "goods_receipts" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX "hq_shift_events_session_idx" ON "hq_shift_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "hq_shift_events_user_idx" ON "hq_shift_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hq_shift_sessions_user_idx" ON "hq_shift_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hq_shift_sessions_date_idx" ON "hq_shift_sessions" USING btree ("check_in_time");--> statement-breakpoint
CREATE INDEX "hq_shift_sessions_status_idx" ON "hq_shift_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_code_idx" ON "inventory" USING btree ("code");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_barcode_idx" ON "inventory" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "inventory_active_idx" ON "inventory" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "inventory_qr_code_idx" ON "inventory" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "inventory_material_type_idx" ON "inventory" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "inv_movement_inventory_idx" ON "inventory_movements" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "inv_movement_type_idx" ON "inventory_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "inv_movement_date_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inv_movement_ref_idx" ON "inventory_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "iph_inventory_idx" ON "inventory_price_history" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "iph_type_idx" ON "inventory_price_history" USING btree ("price_type");--> statement-breakpoint
CREATE INDEX "iph_date_idx" ON "inventory_price_history" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "iph_inventory_type_date_idx" ON "inventory_price_history" USING btree ("inventory_id","price_type","effective_date");--> statement-breakpoint
CREATE INDEX "manager_rating_employee_idx" ON "manager_monthly_ratings" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "manager_rating_branch_idx" ON "manager_monthly_ratings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "manager_rating_period_idx" ON "manager_monthly_ratings" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "monthly_perf_branch_idx" ON "monthly_employee_performance" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "monthly_perf_period_idx" ON "monthly_employee_performance" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "monthly_perf_score_idx" ON "monthly_employee_performance" USING btree ("final_score");--> statement-breakpoint
CREATE INDEX "ps_inventory_idx" ON "product_suppliers" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "ps_supplier_idx" ON "product_suppliers" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "poi_order_idx" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "poi_inventory_idx" ON "purchase_order_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "po_order_number_idx" ON "purchase_orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "po_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "po_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "po_date_idx" ON "purchase_orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "staff_qr_ratings_staff_idx" ON "staff_qr_ratings" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_qr_ratings_branch_idx" ON "staff_qr_ratings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "staff_qr_ratings_date_idx" ON "staff_qr_ratings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "staff_qr_ratings_token_idx" ON "staff_qr_ratings" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "staff_qr_tokens_token_idx" ON "staff_qr_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "supplier_code_idx" ON "suppliers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "supplier_name_idx" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "supplier_status_idx" ON "suppliers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cari_account_type_idx" ON "cari_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "cari_branch_idx" ON "cari_accounts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "cari_tx_account_idx" ON "cari_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "cari_tx_date_idx" ON "cari_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "cari_tx_due_idx" ON "cari_transactions" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "ett_user_idx" ON "event_triggered_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ett_source_idx" ON "event_triggered_tasks" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "ett_completed_idx" ON "event_triggered_tasks" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "ett_expires_idx" ON "event_triggered_tasks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "fbs_product_idx" ON "factory_batch_specs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fbs_machine_idx" ON "factory_batch_specs" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "fbs_station_idx" ON "factory_batch_specs" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "fbv_batch_idx" ON "factory_batch_verifications" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "fbv_verifier_idx" ON "factory_batch_verifications" USING btree ("verifier_user_id");--> statement-breakpoint
CREATE INDEX "ffc_category_idx" ON "factory_fixed_costs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ffc_period_idx" ON "factory_fixed_costs" USING btree ("effective_year","effective_month");--> statement-breakpoint
CREATE INDEX "fpb_shift_prod_idx" ON "factory_production_batches" USING btree ("shift_production_id");--> statement-breakpoint
CREATE INDEX "fpb_shift_idx" ON "factory_production_batches" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "fpb_product_idx" ON "factory_production_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fpb_operator_idx" ON "factory_production_batches" USING btree ("operator_user_id");--> statement-breakpoint
CREATE INDEX "fpb_machine_idx" ON "factory_production_batches" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "fpb_start_idx" ON "factory_production_batches" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "fsp_shift_idx" ON "factory_shift_productions" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "fsp_product_idx" ON "factory_shift_productions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fsw_shift_idx" ON "factory_shift_workers" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "fsw_user_idx" ON "factory_shift_workers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fsw_machine_idx" ON "factory_shift_workers" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "fs_date_idx" ON "factory_shifts" USING btree ("shift_date");--> statement-breakpoint
CREATE INDEX "fs_type_idx" ON "factory_shifts" USING btree ("shift_type");--> statement-breakpoint
CREATE INDEX "fs_status_idx" ON "factory_shifts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "franchise_collaborators_project_idx" ON "franchise_collaborators" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "franchise_comments_project_idx" ON "franchise_project_comments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "franchise_phases_project_idx" ON "franchise_project_phases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "franchise_tasks_project_idx" ON "franchise_project_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "franchise_tasks_phase_idx" ON "franchise_project_tasks" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "franchise_projects_status_idx" ON "franchise_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gri_receipt_idx" ON "goods_receipt_items" USING btree ("goods_receipt_id");--> statement-breakpoint
CREATE INDEX "gri_inventory_idx" ON "goods_receipt_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "gri_batch_idx" ON "goods_receipt_items" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "mp_machine_idx" ON "machine_products" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "mp_product_idx" ON "machine_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pcc_product_idx" ON "product_cost_calculations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pcc_period_idx" ON "product_cost_calculations" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "pcc_date_idx" ON "product_cost_calculations" USING btree ("calculation_date");--> statement-breakpoint
CREATE INDEX "ppi_product_idx" ON "product_packaging_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pri_recipe_idx" ON "product_recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "pri_material_idx" ON "product_recipe_ingredients" USING btree ("raw_material_id");--> statement-breakpoint
CREATE INDEX "pr_product_idx" ON "product_recipes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pr_active_idx" ON "product_recipes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "pct_product_idx" ON "production_cost_tracking" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pct_date_idx" ON "production_cost_tracking" USING btree ("production_date");--> statement-breakpoint
CREATE INDEX "pct_production_idx" ON "production_cost_tracking" USING btree ("production_record_id");--> statement-breakpoint
CREATE INDEX "pi_production_idx" ON "production_ingredients" USING btree ("production_record_id");--> statement-breakpoint
CREATE INDEX "pi_inventory_idx" ON "production_ingredients" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "pr_number_idx" ON "production_records" USING btree ("production_number");--> statement-breakpoint
CREATE INDEX "pr_date_idx" ON "production_records" USING btree ("production_date");--> statement-breakpoint
CREATE INDEX "pr_inventory_idx" ON "production_records" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "pr_recipe_idx" ON "production_records" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "pr_status_idx" ON "production_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pmt_category_idx" ON "profit_margin_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "rmph_material_idx" ON "raw_material_price_history" USING btree ("raw_material_id");--> statement-breakpoint
CREATE INDEX "rmph_date_idx" ON "raw_material_price_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rmph_supplier_idx" ON "raw_material_price_history" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "rm_code_idx" ON "raw_materials" USING btree ("code");--> statement-breakpoint
CREATE INDEX "rm_category_idx" ON "raw_materials" USING btree ("category");--> statement-breakpoint
CREATE INDEX "rm_inventory_idx" ON "raw_materials" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "ri_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "ri_inventory_idx" ON "recipe_ingredients" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "rtc_user_idx" ON "role_task_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rtc_template_idx" ON "role_task_completions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "rtc_period_idx" ON "role_task_completions" USING btree ("period_date");--> statement-breakpoint
CREATE INDEX "rtt_role_idx" ON "role_task_templates" USING btree ("role");--> statement-breakpoint
CREATE INDEX "rtt_frequency_idx" ON "role_task_templates" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "sci_count_idx" ON "stock_count_items" USING btree ("stock_count_id");--> statement-breakpoint
CREATE INDEX "sc_status_idx" ON "stock_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sc_type_idx" ON "stock_counts" USING btree ("count_type");--> statement-breakpoint
CREATE INDEX "career_gates_gate_number_idx" ON "career_gates" USING btree ("gate_number");--> statement-breakpoint
CREATE INDEX "career_gates_active_idx" ON "career_gates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "content_pack_items_pack_idx" ON "content_pack_items" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "content_pack_items_day_idx" ON "content_pack_items" USING btree ("day_number");--> statement-breakpoint
CREATE INDEX "content_pack_items_order_idx" ON "content_pack_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "content_packs_role_idx" ON "content_packs" USING btree ("target_role");--> statement-breakpoint
CREATE INDEX "content_packs_type_idx" ON "content_packs" USING btree ("pack_type");--> statement-breakpoint
CREATE INDEX "content_packs_active_idx" ON "content_packs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "equipment_catalog_type_idx" ON "equipment_catalog" USING btree ("equipment_type");--> statement-breakpoint
CREATE INDEX "factory_mgmt_score_month_idx" ON "factory_management_scores" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "fault_service_status_updates_tracking_idx" ON "fault_service_status_updates" USING btree ("tracking_id");--> statement-breakpoint
CREATE INDEX "fault_service_tracking_fault_idx" ON "fault_service_tracking" USING btree ("fault_id");--> statement-breakpoint
CREATE INDEX "fault_service_tracking_equipment_idx" ON "fault_service_tracking" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "fault_service_tracking_branch_idx" ON "fault_service_tracking" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "fault_service_tracking_status_idx" ON "fault_service_tracking" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "fin_record_branch_idx" ON "financial_records" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "fin_record_date_idx" ON "financial_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "fin_record_type_idx" ON "financial_records" USING btree ("type");--> statement-breakpoint
CREATE INDEX "fin_record_month_year_idx" ON "financial_records" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "fsd_category_idx" ON "food_safety_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fsd_type_idx" ON "food_safety_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "fst_branch_idx" ON "food_safety_trainings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "fst_status_idx" ON "food_safety_trainings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fst_date_idx" ON "food_safety_trainings" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "gate_attempts_gate_idx" ON "gate_attempts" USING btree ("gate_id");--> statement-breakpoint
CREATE INDEX "gate_attempts_user_idx" ON "gate_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gate_attempts_status_idx" ON "gate_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "guide_docs_slug_idx" ON "guide_docs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "guide_docs_category_idx" ON "guide_docs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "haccp_cp_branch_idx" ON "haccp_control_points" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "haccp_cp_category_idx" ON "haccp_control_points" USING btree ("category");--> statement-breakpoint
CREATE INDEX "haccp_rec_cp_idx" ON "haccp_records" USING btree ("control_point_id");--> statement-breakpoint
CREATE INDEX "haccp_rec_branch_idx" ON "haccp_records" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "haccp_rec_date_idx" ON "haccp_records" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "hygiene_audit_branch_idx" ON "hygiene_audits" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "hygiene_audit_date_idx" ON "hygiene_audits" USING btree ("audit_date");--> statement-breakpoint
CREATE INDEX "import_batch_user_idx" ON "import_batches" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "import_batch_status_idx" ON "import_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_result_batch_idx" ON "import_results" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_result_employee_idx" ON "import_results" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "inv_count_assign_count_idx" ON "inventory_count_assignments" USING btree ("count_id");--> statement-breakpoint
CREATE INDEX "inv_count_assign_inv_idx" ON "inventory_count_assignments" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "inv_count_entry_assign_idx" ON "inventory_count_entries" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "inv_count_entry_counter_idx" ON "inventory_count_entries" USING btree ("counter_id");--> statement-breakpoint
CREATE INDEX "inv_report_count_idx" ON "inventory_count_reports" USING btree ("count_id");--> statement-breakpoint
CREATE INDEX "inv_report_severity_idx" ON "inventory_count_reports" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "inv_count_month_year_idx" ON "inventory_counts" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "inv_count_status_idx" ON "inventory_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kpi_signal_rules_key_idx" ON "kpi_signal_rules" USING btree ("signal_key");--> statement-breakpoint
CREATE INDEX "kpi_signal_rules_active_idx" ON "kpi_signal_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "onboarding_checkins_instance_idx" ON "onboarding_checkins" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "onboarding_checkins_week_idx" ON "onboarding_checkins" USING btree ("week_number");--> statement-breakpoint
CREATE INDEX "onboarding_instances_trainee_idx" ON "onboarding_instances" USING btree ("trainee_id");--> statement-breakpoint
CREATE INDEX "onboarding_instances_mentor_idx" ON "onboarding_instances" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "onboarding_instances_program_idx" ON "onboarding_instances" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "onboarding_weeks_program_idx" ON "onboarding_weeks" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "ops_rules_scope_idx" ON "ops_rules" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "ops_rules_active_idx" ON "ops_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ops_rules_entity_idx" ON "ops_rules" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "pop_order_idx" ON "purchase_order_payments" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "pop_status_idx" ON "purchase_order_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "salary_scale_type_idx" ON "salary_scales" USING btree ("location_type");--> statement-breakpoint
CREATE INDEX "salary_scale_level_idx" ON "salary_scales" USING btree ("level");--> statement-breakpoint
CREATE INDEX "supp_cert_supplier_idx" ON "supplier_certifications" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supp_cert_expiry_idx" ON "supplier_certifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "supp_cert_status_idx" ON "supplier_certifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "si_supplier_idx" ON "supplier_issues" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "si_inventory_idx" ON "supplier_issues" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "si_status_idx" ON "supplier_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sup_perf_supplier_idx" ON "supplier_performance_scores" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "sup_perf_month_year_idx" ON "supplier_performance_scores" USING btree ("month","year");--> statement-breakpoint
CREATE INDEX "sq_inventory_idx" ON "supplier_quotes" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "sq_supplier_idx" ON "supplier_quotes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "sq_status_idx" ON "supplier_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_evidence_task_idx" ON "task_evidence" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_evidence_status_idx" ON "task_evidence" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_evidence_submitted_by_idx" ON "task_evidence" USING btree ("submitted_by_user_id");--> statement-breakpoint
CREATE INDEX "task_triggers_role_idx" ON "task_triggers" USING btree ("role_code");--> statement-breakpoint
CREATE INDEX "task_triggers_scope_idx" ON "task_triggers" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "task_triggers_active_idx" ON "task_triggers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "waste_action_links_event_idx" ON "waste_action_links" USING btree ("waste_event_id");--> statement-breakpoint
CREATE INDEX "waste_action_links_task_idx" ON "waste_action_links" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "waste_events_branch_idx" ON "waste_events" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "waste_events_category_idx" ON "waste_events" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "waste_events_reason_idx" ON "waste_events" USING btree ("reason_id");--> statement-breakpoint
CREATE INDEX "waste_events_status_idx" ON "waste_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waste_events_event_ts_idx" ON "waste_events" USING btree ("event_ts");--> statement-breakpoint
CREATE INDEX "waste_events_lot_idx" ON "waste_events" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "waste_events_created_by_idx" ON "waste_events" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "waste_lots_lot_id_idx" ON "waste_lots" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "waste_lots_qc_status_idx" ON "waste_lots" USING btree ("qc_status");--> statement-breakpoint
CREATE INDEX "waste_lots_product_idx" ON "waste_lots" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "waste_reasons_category_idx" ON "waste_reasons" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "agent_outcome_action_idx" ON "agent_action_outcomes" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "agent_outcome_followup_idx" ON "agent_action_outcomes" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "agent_outcome_status_idx" ON "agent_action_outcomes" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "agent_esc_action_idx" ON "agent_escalation_history" USING btree ("source_action_id");--> statement-breakpoint
CREATE INDEX "agent_esc_level_idx" ON "agent_escalation_history" USING btree ("escalation_level");--> statement-breakpoint
CREATE INDEX "agent_esc_user_idx" ON "agent_escalation_history" USING btree ("escalated_to_user_id");--> statement-breakpoint
CREATE INDEX "agent_action_status_idx" ON "agent_pending_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_action_target_idx" ON "agent_pending_actions" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "agent_action_type_idx" ON "agent_pending_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "agent_action_branch_idx" ON "agent_pending_actions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "agent_action_created_idx" ON "agent_pending_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agent_action_category_idx" ON "agent_pending_actions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "agent_action_escalation_idx" ON "agent_pending_actions" USING btree ("escalation_date");--> statement-breakpoint
CREATE INDEX "agent_rejection_target_idx" ON "agent_rejection_patterns" USING btree ("target_user_id","category");--> statement-breakpoint
CREATE INDEX "agent_rejection_expires_idx" ON "agent_rejection_patterns" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "agent_routing_category_idx" ON "agent_routing_rules" USING btree ("category","subcategory");--> statement-breakpoint
CREATE INDEX "agent_routing_active_idx" ON "agent_routing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "agent_run_type_idx" ON "agent_runs" USING btree ("run_type");--> statement-breakpoint
CREATE INDEX "agent_run_scope_idx" ON "agent_runs" USING btree ("scope_type");--> statement-breakpoint
CREATE INDEX "agent_run_created_idx" ON "agent_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_agent_logs_type_idx" ON "ai_agent_logs" USING btree ("run_type");--> statement-breakpoint
CREATE INDEX "ai_agent_logs_scope_idx" ON "ai_agent_logs" USING btree ("target_role_scope");--> statement-breakpoint
CREATE INDEX "ai_agent_logs_created_idx" ON "ai_agent_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_policy_domain_idx" ON "ai_domain_policies" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "ai_policy_role_idx" ON "ai_domain_policies" USING btree ("role");--> statement-breakpoint
CREATE INDEX "branch_inventory_branch_idx" ON "branch_inventory" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_inventory_product_idx" ON "branch_inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "branch_stock_movements_branch_idx" ON "branch_stock_movements" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_stock_movements_product_idx" ON "branch_stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "branch_stock_movements_date_idx" ON "branch_stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "br_ann_idx" ON "broadcast_receipts" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "coffee_roasting_date_idx" ON "coffee_roasting_logs" USING btree ("roast_date");--> statement-breakpoint
CREATE INDEX "coffee_roasting_operator_idx" ON "coffee_roasting_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "coffee_roasting_degree_idx" ON "coffee_roasting_logs" USING btree ("roast_degree");--> statement-breakpoint
CREATE INDEX "dcl_table_record_idx" ON "data_change_log" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "dcl_changed_by_idx" ON "data_change_log" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "dcl_changed_at_idx" ON "data_change_log" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "dcr_table_record_idx" ON "data_change_requests" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "dcr_status_idx" ON "data_change_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dcr_requested_by_idx" ON "data_change_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "dobody_flow_comp_task_idx" ON "dobody_flow_completions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "dobody_flow_comp_user_idx" ON "dobody_flow_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dobody_flow_tasks_active_idx" ON "dobody_flow_tasks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "dobody_flow_tasks_created_by_idx" ON "dobody_flow_tasks" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "emp_type_policy_type_idx" ON "employee_type_policies" USING btree ("employee_type_id");--> statement-breakpoint
CREATE INDEX "factory_shipment_items_shipment_idx" ON "factory_shipment_items" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "factory_shipment_items_product_idx" ON "factory_shipment_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "factory_shipments_branch_idx" ON "factory_shipments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "factory_shipments_status_idx" ON "factory_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "factory_shipments_date_idx" ON "factory_shipments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "fib_investor_idx" ON "franchise_investor_branches" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "fib_branch_idx" ON "franchise_investor_branches" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "fin_investor_idx" ON "franchise_investor_notes" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "fi_user_id_idx" ON "franchise_investors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fi_status_idx" ON "franchise_investors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "haccp_cr_station_idx" ON "haccp_check_records" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "haccp_cr_checked_by_idx" ON "haccp_check_records" USING btree ("checked_by");--> statement-breakpoint
CREATE INDEX "haccp_cr_date_idx" ON "haccp_check_records" USING btree ("check_date");--> statement-breakpoint
CREATE INDEX "haccp_cr_result_idx" ON "haccp_check_records" USING btree ("result");--> statement-breakpoint
CREATE INDEX "hqt_assigned_to_idx" ON "hq_tasks" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "hqt_assigned_by_idx" ON "hq_tasks" USING btree ("assigned_by_user_id");--> statement-breakpoint
CREATE INDEX "hqt_status_idx" ON "hq_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "md_module_key_idx" ON "module_delegations" USING btree ("module_key");--> statement-breakpoint
CREATE INDEX "md_to_role_idx" ON "module_delegations" USING btree ("to_role");--> statement-breakpoint
CREATE INDEX "md_is_active_idx" ON "module_delegations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "monthly_payroll_branch_idx" ON "monthly_payroll" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "monthly_payroll_period_idx" ON "monthly_payroll" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "org_emp_assign_scope_idx" ON "org_employee_type_assignments" USING btree ("org_scope","org_id");--> statement-breakpoint
CREATE INDEX "org_emp_assign_type_idx" ON "org_employee_type_assignments" USING btree ("employee_type_id");--> statement-breakpoint
CREATE INDEX "payroll_config_branch_idx" ON "payroll_deduction_config" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "payroll_config_period_idx" ON "payroll_deduction_config" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "pdks_records_user_date_idx" ON "pdks_records" USING btree ("user_id","record_date");--> statement-breakpoint
CREATE INDEX "pdks_records_branch_date_idx" ON "pdks_records" USING btree ("branch_id","record_date");--> statement-breakpoint
CREATE INDEX "production_lots_product_idx" ON "production_lots" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "production_lots_date_idx" ON "production_lots" USING btree ("production_date");--> statement-breakpoint
CREATE INDEX "production_lots_status_idx" ON "production_lots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_lots_expiry_idx" ON "production_lots" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "rr_table_record_idx" ON "record_revisions" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "rr_changed_by_idx" ON "record_revisions" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "scheduled_offs_user_idx" ON "scheduled_offs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_offs_date_idx" ON "scheduled_offs" USING btree ("off_date");--> statement-breakpoint
CREATE INDEX "st_branch_idx" ON "support_tickets" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "st_dept_idx" ON "support_tickets" USING btree ("department");--> statement-breakpoint
CREATE INDEX "st_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "st_assigned_idx" ON "support_tickets" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "st_channel_idx" ON "support_tickets" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "ta_ticket_idx" ON "ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "tcm_ticket_idx" ON "ticket_cowork_members" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "tcm_user_idx" ON "ticket_cowork_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tcm_ticket_user_unique" ON "ticket_cowork_members" USING btree ("ticket_id","user_id");--> statement-breakpoint
CREATE INDEX "user_pack_progress_user_idx" ON "user_pack_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_pack_progress_pack_idx" ON "user_pack_progress" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "user_pack_progress_item_idx" ON "user_pack_progress" USING btree ("pack_item_id");--> statement-breakpoint
CREATE INDEX "user_pack_progress_status_idx" ON "user_pack_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wr_webinar_idx" ON "webinar_registrations" USING btree ("webinar_id");--> statement-breakpoint
CREATE INDEX "wr_user_idx" ON "webinar_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webinars_date_idx" ON "webinars" USING btree ("webinar_date");--> statement-breakpoint
CREATE INDEX "webinars_status_idx" ON "webinars" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_escalation_config_level" ON "escalation_config" USING btree ("level");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_guidance_dismissals_unique" ON "guidance_dismissals" USING btree ("user_id","guidance_id");--> statement-breakpoint
CREATE INDEX "idx_kiosk_sessions_token" ON "kiosk_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_kiosk_sessions_user" ON "kiosk_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kiosk_sessions_expires" ON "kiosk_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_perm_overrides_unique" ON "role_permission_overrides" USING btree ("role","module_key");--> statement-breakpoint
CREATE INDEX "idx_digest_queue_user" ON "notification_digest_queue" USING btree ("user_id","processed");--> statement-breakpoint
CREATE INDEX "idx_notif_policies_role" ON "notification_policies" USING btree ("role","category");--> statement-breakpoint
CREATE INDEX "idx_notif_prefs_user" ON "notification_preferences" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "idx_user_calendar_user" ON "user_calendar_events" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_user_notes_user" ON "user_notes" USING btree ("user_id","is_pinned","updated_at");--> statement-breakpoint
CREATE INDEX "idx_user_todos_user" ON "user_todos" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "idx_user_todos_source" ON "user_todos" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "idx_branch_financial" ON "branch_financial_summary" USING btree ("branch_id","period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_branch_snapshot" ON "branch_monthly_snapshots" USING btree ("branch_id","snapshot_year","snapshot_month");--> statement-breakpoint
CREATE INDEX "idx_daily_records_date" ON "daily_production_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "idx_daily_records_product" ON "daily_production_records" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_plan_items_plan" ON "production_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_plan_items_product" ON "production_plan_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_prod_resp_user" ON "production_responsibilities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prod_resp_product" ON "production_responsibilities" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_weekly_plan_week" ON "weekly_production_plans" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX "idx_workshop_notes_user" ON "workshop_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_act_comment_action_idx" ON "audit_action_comments" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "audit_act_comment_user_idx" ON "audit_action_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_act_v2_audit_idx" ON "audit_actions_v2" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audit_act_v2_assigned_idx" ON "audit_actions_v2" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "audit_act_v2_status_idx" ON "audit_actions_v2" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_act_v2_deadline_idx" ON "audit_actions_v2" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "audit_cat_score_audit_idx" ON "audit_category_scores" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audit_pers_v2_audit_idx" ON "audit_personnel_v2" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audit_pers_v2_user_idx" ON "audit_personnel_v2" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_resp_v2_audit_idx" ON "audit_responses_v2" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audit_resp_v2_question_idx" ON "audit_responses_v2" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "audit_cat_v2_template_idx" ON "audit_template_categories_v2" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "audit_q_v2_category_idx" ON "audit_template_questions_v2" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "audit_tmpl_v2_active_idx" ON "audit_templates_v2" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "audits_v2_branch_idx" ON "audits_v2" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "audits_v2_auditor_idx" ON "audits_v2" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "audits_v2_status_idx" ON "audits_v2" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audits_v2_date_idx" ON "audits_v2" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "dobody_evt_type_idx" ON "dobody_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "dobody_evt_date_idx" ON "dobody_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "dobody_learn_workflow_idx" ON "dobody_learning" USING btree ("workflow_type");--> statement-breakpoint
CREATE INDEX "dobody_prop_status_idx" ON "dobody_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dobody_prop_role_idx" ON "dobody_proposals" USING btree ("role_target");--> statement-breakpoint
CREATE INDEX "dobody_prop_user_idx" ON "dobody_proposals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dobody_prop_created_idx" ON "dobody_proposals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dobody_scopes_role_idx" ON "dobody_scopes" USING btree ("role");--> statement-breakpoint
CREATE INDEX "dobody_wf_conf_idx" ON "dobody_workflow_confidence" USING btree ("workflow_type","role");--> statement-breakpoint
CREATE INDEX "finh_nutrition_idx" ON "factory_ingredient_nutrition_history" USING btree ("nutrition_id");--> statement-breakpoint
CREATE INDEX "finh_name_idx" ON "factory_ingredient_nutrition_history" USING btree ("ingredient_name");--> statement-breakpoint
CREATE INDEX "finh_changed_at_idx" ON "factory_ingredient_nutrition_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "fkbi_keyblend_idx" ON "factory_keyblend_ingredients" USING btree ("keyblend_id");--> statement-breakpoint
CREATE INDEX "fpl_recipe_idx" ON "factory_production_logs" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "fpl_recipe_version_idx" ON "factory_production_logs" USING btree ("recipe_version_id");--> statement-breakpoint
CREATE INDEX "fpl_session_idx" ON "factory_production_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "fpl_status_idx" ON "factory_production_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fra_recipe_idx" ON "factory_recipe_approvals" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "fra_recipe_scope_idx" ON "factory_recipe_approvals" USING btree ("recipe_id","scope");--> statement-breakpoint
CREATE INDEX "fra_scope_idx" ON "factory_recipe_approvals" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "fra_approved_at_idx" ON "factory_recipe_approvals" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "fra_invalidated_at_idx" ON "factory_recipe_approvals" USING btree ("invalidated_at");--> statement-breakpoint
CREATE INDEX "frca_role_idx" ON "factory_recipe_category_access" USING btree ("role");--> statement-breakpoint
CREATE INDEX "fris_recipe_idx" ON "factory_recipe_ingredient_snapshots" USING btree ("recipe_id","created_at");--> statement-breakpoint
CREATE INDEX "fri_recipe_idx" ON "factory_recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "frlpl_recipe_idx" ON "factory_recipe_label_print_logs" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "frlpl_printed_at_idx" ON "factory_recipe_label_print_logs" USING btree ("printed_at");--> statement-breakpoint
CREATE INDEX "frlpl_printed_by_idx" ON "factory_recipe_label_print_logs" USING btree ("printed_by");--> statement-breakpoint
CREATE INDEX "frlpl_lot_idx" ON "factory_recipe_label_print_logs" USING btree ("recipe_id","lot_number");--> statement-breakpoint
CREATE INDEX "frph_recipe_idx" ON "factory_recipe_price_history" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "frph_product_idx" ON "factory_recipe_price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "frph_run_idx" ON "factory_recipe_price_history" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "frph_created_idx" ON "factory_recipe_price_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "frss_recipe_idx" ON "factory_recipe_step_snapshots" USING btree ("recipe_id","created_at");--> statement-breakpoint
CREATE INDEX "frs_recipe_idx" ON "factory_recipe_steps" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "frs_step_num_idx" ON "factory_recipe_steps" USING btree ("recipe_id","step_number");--> statement-breakpoint
CREATE INDEX "frv_recipe_idx" ON "factory_recipe_versions" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "fr_product_idx" ON "factory_recipes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fr_category_idx" ON "factory_recipes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fr_output_type_idx" ON "factory_recipes" USING btree ("output_type");--> statement-breakpoint
CREATE INDEX "fr_parent_idx" ON "factory_recipes" USING btree ("parent_recipe_id");--> statement-breakpoint
CREATE INDEX "fr_active_idx" ON "factory_recipes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "dmpi_plan_idx" ON "daily_material_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "dmpi_inventory_idx" ON "daily_material_plan_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "dmpi_recipe_idx" ON "daily_material_plan_items" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "dmpi_status_idx" ON "daily_material_plan_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dmp_status_idx" ON "daily_material_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dmp_date_idx" ON "daily_material_plans" USING btree ("plan_date");--> statement-breakpoint
CREATE INDEX "mpl_plan_item_idx" ON "material_pick_logs" USING btree ("plan_item_id");--> statement-breakpoint
CREATE INDEX "mpl_inventory_idx" ON "material_pick_logs" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "mpl_date_idx" ON "material_pick_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mpl_from_loc_idx" ON "material_pick_logs" USING btree ("from_location");--> statement-breakpoint
CREATE INDEX "pal_date_idx" ON "production_area_leftovers" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "pal_inventory_idx" ON "production_area_leftovers" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "pal_condition_idx" ON "production_area_leftovers" USING btree ("condition");