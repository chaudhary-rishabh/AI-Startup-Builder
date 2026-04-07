-- ============================================================
--  AI STARTUP BUILDER — Sample Seed Data
--  Run this AFTER ai_startup_builder_schema.sql
--  Includes: 3 users, projects, agent runs, billing, notifications
-- ============================================================

-- ─────────────────────────────────────────────
--  1. USERS  (auth.users)
--  Passwords below are all: "Password123!"
--  bcrypt hash generated with cost=10
-- ─────────────────────────────────────────────
INSERT INTO auth.users (id, email, email_verified_at, password_hash, full_name, role, plan_tier, status, onboarding_completed, last_active_at)
VALUES
    -- Super Admin
    ('00000000-0000-0000-0000-000000000001',
     'admin@aistartupbuilder.com',
     NOW(),
     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Super Admin',
     'super_admin', 'enterprise', 'active', TRUE, NOW()),

    -- Pro user
    ('00000000-0000-0000-0000-000000000002',
     'rahul@example.com',
     NOW(),
     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Rahul Sharma',
     'user', 'pro', 'active', TRUE, NOW() - INTERVAL '2 hours'),

    -- Free user
    ('00000000-0000-0000-0000-000000000003',
     'priya@example.com',
     NOW(),
     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Priya Patel',
     'user', 'free', 'active', FALSE, NOW() - INTERVAL '1 day');


-- ─────────────────────────────────────────────
--  2. USER PROFILES  (users.user_profiles)
-- ─────────────────────────────────────────────
INSERT INTO users.user_profiles (id, role_type, bio, company_name, website_url, timezone, notification_prefs, theme_prefs)
VALUES
    ('00000000-0000-0000-0000-000000000001',
     'Developer',
     'Platform administrator',
     'AI Startup Builder', 'https://aistartupbuilder.com',
     'UTC',
     '{"emailOnPhaseComplete": true, "emailOnBilling": true, "inAppAll": true}',
     '{"preferredMode": "dev", "sidebarCollapsed": false}'),

    ('00000000-0000-0000-0000-000000000002',
     'Founder',
     'Serial entrepreneur building AI-powered products. Previously at Razorpay.',
     'TechVenture Labs', 'https://rahulsharma.dev',
     'Asia/Kolkata',
     '{"emailOnPhaseComplete": true, "emailOnBilling": true, "inAppAll": true}',
     '{"preferredMode": "design", "sidebarCollapsed": false}'),

    ('00000000-0000-0000-0000-000000000003',
     'Designer',
     'UX designer exploring no-code tools.',
     NULL, NULL,
     'Asia/Kolkata',
     '{"emailOnPhaseComplete": false, "emailOnBilling": true, "inAppAll": true}',
     '{"preferredMode": "design", "sidebarCollapsed": true}');


-- ─────────────────────────────────────────────
--  3. OAUTH ACCOUNTS  (auth.oauth_accounts)
-- ─────────────────────────────────────────────
INSERT INTO auth.oauth_accounts (id, user_id, provider, provider_user_id, access_token, refresh_token, expires_at)
VALUES
    (gen_random_uuid(),
     '00000000-0000-0000-0000-000000000002',
     'google', 'google_uid_rahul_123456',
     'encrypted_access_token_placeholder',
     'encrypted_refresh_token_placeholder',
     NOW() + INTERVAL '1 hour');


-- ─────────────────────────────────────────────
--  4. BILLING PLANS  (already seeded in schema)
--  Just capture the IDs for FK use below
-- ─────────────────────────────────────────────
-- free plan id stored in variable for readability
-- We'll use a subquery inline instead


-- ─────────────────────────────────────────────
--  5. SUBSCRIPTIONS  (billing.subscriptions)
-- ─────────────────────────────────────────────
INSERT INTO billing.subscriptions (id, user_id, plan_id, stripe_customer_id, stripe_subscription_id, status, billing_cycle, current_period_start, current_period_end)
VALUES
    -- Rahul: Pro monthly
    ('10000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     (SELECT id FROM billing.plans WHERE name = 'pro'),
     'cus_rahul_stripe_001',
     'sub_rahul_pro_monthly_001',
     'active', 'monthly',
     DATE_TRUNC('month', NOW()),
     DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),

    -- Priya: Free (no stripe subscription)
    ('10000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000003',
     (SELECT id FROM billing.plans WHERE name = 'free'),
     'cus_priya_stripe_002',
     NULL,
     'active', 'monthly', NULL, NULL),

    -- Admin: Enterprise
    ('10000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000001',
     (SELECT id FROM billing.plans WHERE name = 'enterprise'),
     'cus_admin_stripe_003',
     'sub_admin_enterprise_001',
     'active', 'yearly',
     DATE_TRUNC('year', NOW()),
     DATE_TRUNC('year', NOW()) + INTERVAL '1 year');


-- ─────────────────────────────────────────────
--  6. TRANSACTIONS  (billing.transactions)
-- ─────────────────────────────────────────────
INSERT INTO billing.transactions (user_id, subscription_id, stripe_invoice_id, stripe_charge_id, amount_cents, currency, status, description)
VALUES
    ('00000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     'in_rahul_jan_2025', 'ch_rahul_001',
     2900, 'usd', 'succeeded',
     'Pro Plan - January 2025'),

    ('00000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     'in_rahul_feb_2025', 'ch_rahul_002',
     2900, 'usd', 'succeeded',
     'Pro Plan - February 2025'),

    ('00000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0000-000000000003',
     'in_admin_2025', 'ch_admin_001',
     99000, 'usd', 'succeeded',
     'Enterprise Plan - Annual 2025');


-- ─────────────────────────────────────────────
--  7. TOKEN USAGE  (billing.token_usage)
-- ─────────────────────────────────────────────
INSERT INTO billing.token_usage (user_id, month, tokens_used, tokens_limit, cost_usd)
VALUES
    -- Rahul used 123K tokens this month (pro: 500K limit)
    ('00000000-0000-0000-0000-000000000002',
     DATE_TRUNC('month', NOW())::DATE,
     123450, 500000, 1.85),

    -- Priya used 12K tokens (free: 50K limit)
    ('00000000-0000-0000-0000-000000000003',
     DATE_TRUNC('month', NOW())::DATE,
     12000, 50000, 0.18);


-- ─────────────────────────────────────────────
--  8. PROJECTS  (projects.projects)
-- ─────────────────────────────────────────────
INSERT INTO projects.projects (id, user_id, name, description, emoji, current_phase, status, is_starred, mode, phase_progress, last_active_at)
VALUES
    -- Rahul's main project - reached Phase 3
    ('20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     'HealthAI Coach',
     'AI-powered personal health coaching app that creates custom workout and nutrition plans',
     '🏋️', 3, 'active', TRUE, 'design',
     '{"1": "complete", "2": "complete", "3": "active", "4": "locked", "5": "locked", "6": "locked"}',
     NOW() - INTERVAL '30 minutes'),

    -- Rahul's second project - just started
    ('20000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000002',
     'InvoiceBot',
     'Automated invoice generation and follow-up for freelancers',
     '🧾', 1, 'active', FALSE, 'design',
     '{"1": "active", "2": "locked", "3": "locked", "4": "locked", "5": "locked", "6": "locked"}',
     NOW() - INTERVAL '3 days'),

    -- Priya's project - Phase 1 only (free plan)
    ('20000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000003',
     'Recipe Finder',
     'Find recipes based on ingredients you already have at home',
     '🍳', 1, 'active', FALSE, 'design',
     '{"1": "active", "2": "locked", "3": "locked", "4": "locked", "5": "locked", "6": "locked"}',
     NOW() - INTERVAL '2 days');


-- ─────────────────────────────────────────────
--  9. PHASE OUTPUTS  (projects.phase_outputs)
--  Realistic output data for HealthAI Coach phases 1 & 2
-- ─────────────────────────────────────────────
INSERT INTO projects.phase_outputs (project_id, phase, output_data, version, is_current)
VALUES
    -- Phase 1: Validation output for HealthAI Coach
    ('20000000-0000-0000-0000-000000000001', 1,
     '{
       "problem": "People struggle to maintain consistent fitness habits due to generic, one-size-fits-all workout and nutrition plans that don''t adapt to their lifestyle, schedule, or progress.",
       "solution": "An AI coach that learns your body, schedule, and goals to generate truly personalized weekly plans — and adjusts them in real-time based on your feedback and results.",
       "icp": {
         "age": "25-40",
         "occupation": "Working professionals",
         "pain_points": ["No time for gym research", "Generic apps don''t work long-term", "Expensive personal trainers"],
         "willingness_to_pay": "$15-$25/month"
       },
       "competitors": [
         {"name": "MyFitnessPal", "strength": "Large food database", "weakness": "No real AI personalization", "pricing": "Free / $19.99/mo"},
         {"name": "Noom",         "strength": "Behavioral coaching", "weakness": "Expensive, human coaches", "pricing": "$60/mo"},
         {"name": "Fitbod",       "strength": "Good workout AI",     "weakness": "No nutrition component",   "pricing": "$12.99/mo"}
       ],
       "market_gap": "No single app combines AI-driven workout AND nutrition with real-time adaptation based on user feedback.",
       "pricing_suggestion": "$19/month or $149/year",
       "demand_score": 82,
       "risk_analysis": [
         {"risk": "High competition from established players", "level": "High",   "mitigation": "Focus on the combined AI approach as differentiator"},
         {"risk": "User retention after 30 days",             "level": "Medium", "mitigation": "Gamification + milestone celebrations"},
         {"risk": "AI accuracy for nutrition advice",          "level": "Medium", "mitigation": "Partner with certified nutritionists for validation"}
       ],
       "verdict": "Yes",
       "verdict_reason": "Strong market gap exists in truly adaptive AI coaching. Demand score of 82 indicates solid willingness to pay. Proceed with MVP focused on the AI personalization angle."
     }',
     1, TRUE),

    -- Phase 2: PRD output for HealthAI Coach
    ('20000000-0000-0000-0000-000000000001', 2,
     '{
       "prd_title": "HealthAI Coach — Product Requirements Document",
       "version": "1.0",
       "tech_stack": {
         "frontend": "React Native (iOS + Android)",
         "backend": "Node.js + Hono",
         "database": "PostgreSQL + Redis",
         "ai": "Claude claude-sonnet-4-5 for coaching, GPT-4o for nutrition parsing"
       },
       "features": [
         {"id": "F1", "name": "Onboarding Quiz",        "priority": "P0", "description": "Collect fitness level, goals, dietary restrictions, available equipment"},
         {"id": "F2", "name": "AI Weekly Plan Generator","priority": "P0", "description": "Generate personalized 7-day workout + meal plan using Claude"},
         {"id": "F3", "name": "Daily Check-in",          "priority": "P0", "description": "Rate workout difficulty, log meals, note energy levels"},
         {"id": "F4", "name": "Plan Adaptation Engine",  "priority": "P1", "description": "Adjust next week plan based on check-in data"},
         {"id": "F5", "name": "Progress Dashboard",      "priority": "P1", "description": "Charts for weight, workout volume, nutrition adherence"},
         {"id": "F6", "name": "Social Challenges",       "priority": "P2", "description": "Friend challenges and leaderboards"}
       ],
       "user_stories": [
         "As a busy professional, I want a weekly plan generated in under 60 seconds so I can start immediately",
         "As a user, I want the AI to remember my feedback so plans get better over time",
         "As a user, I want meal suggestions based on my local grocery stores"
       ],
       "design_tokens": {
         "primary_color": "#22C55E",
         "background": "#F0FDF4",
         "font": "Inter",
         "border_radius": "12px"
       },
       "success_metrics": {
         "d30_retention": "> 40%",
         "weekly_plan_completion": "> 60%",
         "nps_target": "> 45"
       }
     }',
     1, TRUE);


-- ─────────────────────────────────────────────
--  10. AGENT RUNS  (ai.agent_runs)
-- ─────────────────────────────────────────────
INSERT INTO ai.agent_runs (id, project_id, user_id, phase, agent_type, model, status, prompt_tokens, completion_tokens, total_tokens, cost_usd, duration_ms, rag_context_used, started_at, completed_at)
VALUES
    -- Phase 1 runs for HealthAI Coach
    ('30000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     1, 'idea_analyzer', 'claude-sonnet-4-5', 'completed',
     850, 1200, 2050, 0.006150, 4200, FALSE,
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '4 seconds'),

    ('30000000-0000-0000-0000-000000000002',
     '20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     1, 'market_research', 'claude-sonnet-4-5', 'completed',
     1200, 2800, 4000, 0.012000, 9800, FALSE,
     NOW() - INTERVAL '5 days' + INTERVAL '5 seconds',
     NOW() - INTERVAL '5 days' + INTERVAL '15 seconds'),

    ('30000000-0000-0000-0000-000000000003',
     '20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     1, 'validation_scorer', 'claude-sonnet-4-5', 'completed',
     900, 650, 1550, 0.004650, 3100, FALSE,
     NOW() - INTERVAL '5 days' + INTERVAL '16 seconds',
     NOW() - INTERVAL '5 days' + INTERVAL '19 seconds'),

    -- Phase 2 runs for HealthAI Coach
    ('30000000-0000-0000-0000-000000000004',
     '20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     2, 'prd_generator', 'claude-opus-4-5', 'completed',
     2100, 3900, 6000, 0.090000, 18500, TRUE,
     NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '18 seconds'),

    ('30000000-0000-0000-0000-000000000005',
     '20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     2, 'user_flow_agent', 'claude-sonnet-4-5', 'completed',
     1100, 1900, 3000, 0.009000, 7200, FALSE,
     NOW() - INTERVAL '4 days' + INTERVAL '20 seconds',
     NOW() - INTERVAL '4 days' + INTERVAL '27 seconds'),

    -- Phase 3 run currently running
    ('30000000-0000-0000-0000-000000000006',
     '20000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002',
     3, 'ui_ux_agent', 'claude-opus-4-5', 'running',
     NULL, NULL, NULL, NULL, NULL, TRUE,
     NOW() - INTERVAL '2 minutes', NULL),

    -- InvoiceBot Phase 1 run
    ('30000000-0000-0000-0000-000000000007',
     '20000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000002',
     1, 'idea_analyzer', 'claude-sonnet-4-5', 'completed',
     700, 950, 1650, 0.004950, 3800, FALSE,
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '4 seconds'),

    -- Priya's Recipe Finder Phase 1
    ('30000000-0000-0000-0000-000000000008',
     '20000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000003',
     1, 'idea_analyzer', 'claude-sonnet-4-5', 'completed',
     650, 880, 1530, 0.004590, 3600, FALSE,
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '4 seconds');


-- ─────────────────────────────────────────────
--  11. CONVERSATION MESSAGES  (ai.conversation_messages)
-- ─────────────────────────────────────────────
INSERT INTO ai.conversation_messages (project_id, phase, role, content, agent_run_id, metadata)
VALUES
    -- HealthAI Coach Phase 1 conversation
    ('20000000-0000-0000-0000-000000000001', 1, 'user',
     'I want to build an AI fitness coaching app that creates personalized workout and nutrition plans',
     NULL, '{}'),

    ('20000000-0000-0000-0000-000000000001', 1, 'assistant',
     'Great idea! I''ve analyzed your concept. The core insight is that existing fitness apps provide generic plans that don''t adapt to individual progress. Your AI coach solves this by creating truly personalized, adaptive plans. I''ve scored your idea at 82/100 — strong market fit with clear differentiation. Verdict: Build it.',
     '30000000-0000-0000-0000-000000000003',
     '{"tokenCount": 1550, "model": "claude-sonnet-4-5", "streamDone": true}'),

    ('20000000-0000-0000-0000-000000000001', 1, 'user',
     'Can you focus more on the nutrition side rather than workouts?',
     NULL, '{}'),

    ('20000000-0000-0000-0000-000000000001', 1, 'assistant',
     'Absolutely — pivoting the ICP to focus on nutrition-first users is smart. The nutrition AI market is less crowded than workout apps. I''d recommend positioning as "AI Nutritionist" with workout as a bonus feature rather than equal billing. This also reduces your AI complexity for v1.',
     NULL,
     '{"tokenCount": 420, "model": "claude-sonnet-4-5", "streamDone": true}');


-- ─────────────────────────────────────────────
--  12. PROJECT FILES  (projects.project_files)
--  Phase 4 generated code files (sample)
-- ─────────────────────────────────────────────
INSERT INTO projects.project_files (project_id, path, content, language, agent_type, is_modified)
VALUES
    ('20000000-0000-0000-0000-000000000001',
     '/src/schema/user.ts',
     'import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:        uuid("id").primaryKey().defaultRandom(),
  email:     varchar("email", { length: 255 }).unique().notNull(),
  fullName:  varchar("full_name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});',
     'typescript', 'schema', FALSE),

    ('20000000-0000-0000-0000-000000000001',
     '/src/routes/auth.ts',
     'import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

app.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  // TODO: implement JWT auth
  return c.json({ success: true, token: "jwt_placeholder" });
});

export default app;',
     'typescript', 'backend', TRUE);


-- ─────────────────────────────────────────────
--  13. DESIGN CANVAS  (projects.design_canvas)
-- ─────────────────────────────────────────────
INSERT INTO projects.design_canvas (project_id, canvas_data, pages, design_tokens, viewport)
VALUES
    ('20000000-0000-0000-0000-000000000001',
     '[
       {"id": "frame_1", "type": "frame",  "x": 0,   "y": 0,   "w": 375, "h": 812, "props": {"name": "Home Screen", "bg": "#F0FDF4"}, "children": [
         {"id": "text_1", "type": "text",  "x": 20,  "y": 60,  "w": 335, "h": 40,  "props": {"content": "Your AI Coach", "fontSize": 28, "fontWeight": "bold", "color": "#14532D"}},
         {"id": "card_1", "type": "card",  "x": 20,  "y": 120, "w": 335, "h": 160, "props": {"bg": "#FFFFFF", "radius": 12, "shadow": "md"}, "children": [
           {"id": "text_2", "type": "text","x": 16,  "y": 16,  "w": 200, "h": 24,  "props": {"content": "Today''s Workout", "fontSize": 16, "fontWeight": "semibold"}}
         ]},
         {"id": "btn_1",  "type": "button","x": 20,  "y": 720, "w": 335, "h": 52,  "props": {"label": "Start Workout", "bg": "#22C55E", "color": "#FFFFFF", "radius": 12}}
       ]}
     ]',
     '[{"id": "page_1", "name": "Home", "artboardId": "frame_1"}, {"id": "page_2", "name": "Profile", "artboardId": null}]',
     '{"primaryColor": "#22C55E", "background": "#F0FDF4", "fontFamily": "Inter", "borderRadius": "12px", "spacing": 4}',
     '{"x": 0, "y": 0, "zoom": 1}');


-- ─────────────────────────────────────────────
--  14. RAG DOCUMENTS  (ai.rag_documents)
-- ─────────────────────────────────────────────
INSERT INTO ai.rag_documents (user_id, name, source_type, s3_key, content_hash, chunk_count, status, pinecone_namespace)
VALUES
    ('00000000-0000-0000-0000-000000000002',
     'Fitness App Market Research 2024.pdf',
     'upload',
     'user-uploads/rahul/fitness_market_research_2024.pdf',
     'a3f8c2d1e4b5f6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
     48, 'indexed',
     'user_00000000-0000-0000-0000-000000000002'),

    ('00000000-0000-0000-0000-000000000002',
     'Competitor Analysis Notes.txt',
     'paste',
     NULL,
     'b4c9d3e2f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
     12, 'indexed',
     'user_00000000-0000-0000-0000-000000000002');


-- ─────────────────────────────────────────────
--  15. FEATURE FLAGS  (ai.feature_flags)
-- ─────────────────────────────────────────────
INSERT INTO ai.feature_flags (key, description, enabled, rollout_percent, plan_restriction)
VALUES
    ('design_mode',        'Enable Figma-style design canvas in Phase 3',        TRUE,  100, '{}'),
    ('rag_ai',             'Enable RAG document upload and retrieval for agents', TRUE,  100, ARRAY['pro', 'enterprise']),
    ('growth_dashboard',   'Phase 6 growth analytics dashboard',                 TRUE,  100, ARRAY['pro', 'enterprise']),
    ('ai_code_export',     'Export generated code as downloadable ZIP',           TRUE,  100, ARRAY['pro', 'enterprise']),
    ('multi_model_select', 'Let users choose between Claude and GPT-4o',         FALSE, 0,   ARRAY['enterprise']),
    ('team_collaboration', 'Invite team members to a project (coming soon)',      FALSE, 0,   '{}');


-- ─────────────────────────────────────────────
--  16. NOTIFICATIONS  (notifications.notifications)
-- ─────────────────────────────────────────────
INSERT INTO notifications.notifications (user_id, type, title, body, action_url, is_read, metadata)
VALUES
    ('00000000-0000-0000-0000-000000000002',
     'phase_complete',
     '🎉 Phase 1 Complete — HealthAI Coach',
     'Your idea has been validated! Demand score: 82/100. Ready to move to planning?',
     '/project/20000000-0000-0000-0000-000000000001/plan',
     TRUE,
     '{"projectId": "20000000-0000-0000-0000-000000000001", "phase": 1}'),

    ('00000000-0000-0000-0000-000000000002',
     'phase_complete',
     '📋 Phase 2 Complete — HealthAI Coach',
     'Your PRD and user flow are ready. Time to design your product!',
     '/project/20000000-0000-0000-0000-000000000001/design',
     TRUE,
     '{"projectId": "20000000-0000-0000-0000-000000000001", "phase": 2}'),

    ('00000000-0000-0000-0000-000000000002',
     'agent_done',
     '🤖 UI/UX Agent is running',
     'Your design canvas is being generated. This usually takes 30-60 seconds.',
     '/project/20000000-0000-0000-0000-000000000001/design',
     FALSE,
     '{"projectId": "20000000-0000-0000-0000-000000000001", "phase": 3, "agentRunId": "30000000-0000-0000-0000-000000000006"}'),

    ('00000000-0000-0000-0000-000000000002',
     'billing_event',
     '💳 Payment Successful',
     'Your Pro Plan payment of $29.00 was successful.',
     '/settings/billing',
     TRUE,
     '{}'),

    ('00000000-0000-0000-0000-000000000003',
     'system_alert',
     '⚡ You''re at 24% of your free token limit',
     'You''ve used 12,000 of your 50,000 monthly tokens. Upgrade to Pro for 10x more.',
     '/settings/billing',
     FALSE,
     '{}');


-- ─────────────────────────────────────────────
--  17. EMAIL LOGS  (notifications.email_logs)
-- ─────────────────────────────────────────────
INSERT INTO notifications.email_logs (user_id, to_email, template, resend_message_id, status, opened_at)
VALUES
    ('00000000-0000-0000-0000-000000000002',
     'rahul@example.com', 'welcome',
     'resend_msg_001', 'delivered', NOW() - INTERVAL '4 days'),

    ('00000000-0000-0000-0000-000000000002',
     'rahul@example.com', 'billing_receipt',
     'resend_msg_002', 'delivered', NOW() - INTERVAL '2 days'),

    ('00000000-0000-0000-0000-000000000003',
     'priya@example.com', 'welcome',
     'resend_msg_003', 'delivered', NULL);


-- ─────────────────────────────────────────────
--  18. PLATFORM EVENTS  (analytics.platform_events)
-- ─────────────────────────────────────────────
INSERT INTO analytics.platform_events (user_id, project_id, event_type, properties, session_id)
VALUES
    ('00000000-0000-0000-0000-000000000002', NULL,
     'user.signed_up',
     '{"method": "google_oauth", "referrer": "product_hunt"}',
     'sess_rahul_001'),

    ('00000000-0000-0000-0000-000000000002',
     '20000000-0000-0000-0000-000000000001',
     'project.created',
     '{"projectName": "HealthAI Coach"}',
     'sess_rahul_001'),

    ('00000000-0000-0000-0000-000000000002',
     '20000000-0000-0000-0000-000000000001',
     'phase.advanced',
     '{"fromPhase": 1, "toPhase": 2}',
     'sess_rahul_002'),

    ('00000000-0000-0000-0000-000000000002',
     '20000000-0000-0000-0000-000000000001',
     'phase.advanced',
     '{"fromPhase": 2, "toPhase": 3}',
     'sess_rahul_003'),

    ('00000000-0000-0000-0000-000000000002', NULL,
     'plan.upgraded',
     '{"fromPlan": "free", "toPlan": "pro", "cycle": "monthly"}',
     'sess_rahul_002'),

    ('00000000-0000-0000-0000-000000000003', NULL,
     'user.signed_up',
     '{"method": "email_password", "referrer": "google_search"}',
     'sess_priya_001'),

    ('00000000-0000-0000-0000-000000000003',
     '20000000-0000-0000-0000-000000000003',
     'project.created',
     '{"projectName": "Recipe Finder"}',
     'sess_priya_001');


-- ─────────────────────────────────────────────
--  19. AUDIT LOGS  (analytics.audit_logs)
-- ─────────────────────────────────────────────
INSERT INTO analytics.audit_logs (admin_id, action, target_type, target_id, before_state, after_state, ip_address)
VALUES
    ('00000000-0000-0000-0000-000000000001',
     'flag.toggled',
     'feature_flag', NULL,
     '{"key": "design_mode", "enabled": false}',
     '{"key": "design_mode", "enabled": true}',
     '103.21.244.1'),

    ('00000000-0000-0000-0000-000000000001',
     'plan.changed',
     'user', '00000000-0000-0000-0000-000000000002',
     '{"plan": "free"}',
     '{"plan": "pro"}',
     '103.21.244.1');


-- ─────────────────────────────────────────────
--  20. COUPONS  (billing.coupons)
-- ─────────────────────────────────────────────
INSERT INTO billing.coupons (code, discount_type, discount_value, max_uses, expires_at)
VALUES
    ('LAUNCH50',    'percent', 50.00, 100,  NOW() + INTERVAL '30 days'),
    ('PRODUCTHUNT', 'percent', 30.00, 500,  NOW() + INTERVAL '7 days'),
    ('FLAT10',      'amount',  1000,  NULL, NULL);


-- ─────────────────────────────────────────────
--  VERIFICATION: Run this to check everything loaded
-- ─────────────────────────────────────────────
/*
SELECT 'auth.users'                    AS tbl, COUNT(*) FROM auth.users
UNION ALL SELECT 'users.user_profiles',          COUNT(*) FROM users.user_profiles
UNION ALL SELECT 'auth.oauth_accounts',          COUNT(*) FROM auth.oauth_accounts
UNION ALL SELECT 'billing.plans',                COUNT(*) FROM billing.plans
UNION ALL SELECT 'billing.subscriptions',        COUNT(*) FROM billing.subscriptions
UNION ALL SELECT 'billing.transactions',         COUNT(*) FROM billing.transactions
UNION ALL SELECT 'billing.token_usage',          COUNT(*) FROM billing.token_usage
UNION ALL SELECT 'billing.coupons',              COUNT(*) FROM billing.coupons
UNION ALL SELECT 'projects.projects',            COUNT(*) FROM projects.projects
UNION ALL SELECT 'projects.phase_outputs',       COUNT(*) FROM projects.phase_outputs
UNION ALL SELECT 'projects.project_files',       COUNT(*) FROM projects.project_files
UNION ALL SELECT 'projects.design_canvas',       COUNT(*) FROM projects.design_canvas
UNION ALL SELECT 'ai.agent_runs',                COUNT(*) FROM ai.agent_runs
UNION ALL SELECT 'ai.conversation_messages',     COUNT(*) FROM ai.conversation_messages
UNION ALL SELECT 'ai.rag_documents',             COUNT(*) FROM ai.rag_documents
UNION ALL SELECT 'ai.feature_flags',             COUNT(*) FROM ai.feature_flags
UNION ALL SELECT 'notifications.notifications',  COUNT(*) FROM notifications.notifications
UNION ALL SELECT 'notifications.email_logs',     COUNT(*) FROM notifications.email_logs
UNION ALL SELECT 'analytics.platform_events',    COUNT(*) FROM analytics.platform_events
UNION ALL SELECT 'analytics.audit_logs',         COUNT(*) FROM analytics.audit_logs
ORDER BY tbl;
*/

-- ============================================================
--  END OF SEED DATA
-- ============================================================
