import { db } from "./db";
import { sql } from "drizzle-orm";
import type { WorkforceSignal, WorkforceProfile, WorkforceEndorsement } from "@shared/schema";

export interface SkillPassport {
  userId: string;
  profile: WorkforceProfile;
  xpTotal: number;
  xpBySkill: Record<string, number>;
  verifiedCompetencies: { skill: string; level: number; verifiedBy: string | null }[];
  toolProficiency: Record<string, number>;
  publishedWorks: number;
  teacherEndorsements: WorkforceEndorsement[];
  certifications: { slug: string; title: string; earnedAt: string }[];
  recentSignals: WorkforceSignal[];
}

export async function recordWorkforceSignal(data: {
  userId: string;
  signalType: string;
  projectId?: string;
  projectType?: string;
  toolsUsed?: string[];
  independenceLevel?: string;
  revisionCycles?: number;
  deadlineMet?: boolean;
  teacherReviewed?: boolean;
  teacherReviewerId?: string;
  paidWork?: boolean;
  teamSize?: number;
  skillCategories?: string[];
  sourceApp?: string;
  verificationLevel?: string;
  metadata?: Record<string, unknown>;
}): Promise<WorkforceSignal> {
  const cols: string[] = [];
  const vals: string[] = [];

  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    cols.push(k.replace(/([A-Z])/g, "_$1").toLowerCase());
    if (Array.isArray(v)) vals.push(`'${JSON.stringify(v)}'::jsonb`);
    else if (typeof v === "object" && v !== null) vals.push(`'${JSON.stringify(v)}'::jsonb`);
    else if (typeof v === "boolean") vals.push(v ? "true" : "false");
    else if (typeof v === "number") vals.push(String(v));
    else vals.push(`'${String(v).replace(/'/g, "''")}'`);
  }

  const result = await db.execute(sql.raw(`
    INSERT INTO workforce_signals (${cols.join(", ")}) VALUES (${vals.join(", ")}) RETURNING *
  `));

  await recomputeProfile(data.userId);
  return (result as any).rows[0];
}

export async function recomputeProfile(userId: string): Promise<WorkforceProfile> {
  const signalsResult = await db.execute(sql.raw(`
    SELECT * FROM workforce_signals WHERE user_id = '${userId}'
  `));
  const signals: any[] = (signalsResult as any).rows || [];

  const endorsementsResult = await db.execute(sql.raw(`
    SELECT * FROM workforce_endorsements WHERE user_id = '${userId}'
  `));
  const endorsements: any[] = (endorsementsResult as any).rows || [];

  let totalProjects = 0;
  let publishedProjects = 0;
  let teacherEndorsementCount = endorsements.filter((e: any) => e.endorser_role === "teacher").length;
  let adminEndorsementCount = endorsements.filter((e: any) => e.endorser_role === "admin").length;
  let deadlinesMet = 0;
  let deadlinesMissed = 0;
  let revisionCyclesTotal = 0;
  let paidProjectsCompleted = 0;
  let teamProjectsCompleted = 0;
  const toolCounts: Record<string, number> = {};
  const skillCounts: Record<string, number> = {};

  for (const s of signals) {
    if (["project_completed", "assignment_completed", "challenge_completed", "client_project"].includes(s.signal_type)) {
      totalProjects++;
    }
    if (s.signal_type === "project_published") publishedProjects++;
    if (s.deadline_met === true) deadlinesMet++;
    if (s.deadline_met === false) deadlinesMissed++;
    if (s.revision_cycles) revisionCyclesTotal += s.revision_cycles;
    if (s.paid_work) paidProjectsCompleted++;
    if (s.team_size > 1) teamProjectsCompleted++;

    const tools = s.tools_used || [];
    for (const t of (Array.isArray(tools) ? tools : [])) {
      toolCounts[t] = (toolCounts[t] || 0) + 1;
    }
    const skills = s.skill_categories || [];
    for (const sk of (Array.isArray(skills) ? skills : [])) {
      skillCounts[sk] = (skillCounts[sk] || 0) + 1;
    }
  }

  const topSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  const readinessTier = computeReadinessTier({
    totalProjects,
    publishedProjects,
    teacherEndorsementCount,
    paidProjectsCompleted,
    teamProjectsCompleted,
    deadlinesMet,
  });

  const contractReady = readinessTier === "advanced" || readinessTier === "professional";
  const mmmCreatorEligible = publishedProjects >= 5 && teacherEndorsementCount >= 1;
  const partnerReady = readinessTier === "professional";
  const internshipReady = readinessTier === "proficient" || contractReady;
  const apprenticeshipReady = totalProjects >= 10 && publishedProjects >= 3;

  const result = await db.execute(sql.raw(`
    INSERT INTO workforce_profiles (
      user_id, readiness_tier, contract_ready, mmm_creator_eligible, partner_ready,
      internship_ready, apprenticeship_ready, total_projects, published_projects,
      teacher_endorsements, admin_endorsements, deadlines_met, deadlines_missed,
      revision_cycles_total, paid_projects_completed, team_projects_completed,
      top_skills, tool_proficiency, last_computed_at, updated_at
    ) VALUES (
      '${userId}', '${readinessTier}', ${contractReady}, ${mmmCreatorEligible}, ${partnerReady},
      ${internshipReady}, ${apprenticeshipReady}, ${totalProjects}, ${publishedProjects},
      ${teacherEndorsementCount}, ${adminEndorsementCount}, ${deadlinesMet}, ${deadlinesMissed},
      ${revisionCyclesTotal}, ${paidProjectsCompleted}, ${teamProjectsCompleted},
      '${JSON.stringify(topSkills)}'::jsonb, '${JSON.stringify(toolCounts)}'::jsonb, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      readiness_tier = EXCLUDED.readiness_tier,
      contract_ready = EXCLUDED.contract_ready,
      mmm_creator_eligible = EXCLUDED.mmm_creator_eligible,
      partner_ready = EXCLUDED.partner_ready,
      internship_ready = EXCLUDED.internship_ready,
      apprenticeship_ready = EXCLUDED.apprenticeship_ready,
      total_projects = EXCLUDED.total_projects,
      published_projects = EXCLUDED.published_projects,
      teacher_endorsements = EXCLUDED.teacher_endorsements,
      admin_endorsements = EXCLUDED.admin_endorsements,
      deadlines_met = EXCLUDED.deadlines_met,
      deadlines_missed = EXCLUDED.deadlines_missed,
      revision_cycles_total = EXCLUDED.revision_cycles_total,
      paid_projects_completed = EXCLUDED.paid_projects_completed,
      team_projects_completed = EXCLUDED.team_projects_completed,
      top_skills = EXCLUDED.top_skills,
      tool_proficiency = EXCLUDED.tool_proficiency,
      last_computed_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `));

  return (result as any).rows[0];
}

function computeReadinessTier(stats: {
  totalProjects: number;
  publishedProjects: number;
  teacherEndorsementCount: number;
  paidProjectsCompleted: number;
  teamProjectsCompleted: number;
  deadlinesMet: number;
}): string {
  const { totalProjects, publishedProjects, teacherEndorsementCount, paidProjectsCompleted, teamProjectsCompleted, deadlinesMet } = stats;

  if (paidProjectsCompleted >= 5 && publishedProjects >= 15 && teacherEndorsementCount >= 3) return "professional";
  if (publishedProjects >= 10 && teamProjectsCompleted >= 3 && deadlinesMet >= 5) return "advanced";
  if (totalProjects >= 10 && publishedProjects >= 5 && teacherEndorsementCount >= 1) return "proficient";
  if (totalProjects >= 3 && publishedProjects >= 1) return "developing";
  return "exploring";
}

export async function getWorkforceProfile(userId: string): Promise<WorkforceProfile | null> {
  const result = await db.execute(sql.raw(`
    SELECT * FROM workforce_profiles WHERE user_id = '${userId}'
  `));
  return (result as any).rows?.[0] || null;
}

export async function getSkillPassport(userId: string): Promise<SkillPassport> {
  let profile = await getWorkforceProfile(userId);
  if (!profile) {
    profile = await recomputeProfile(userId);
  }

  const userResult = await db.execute(sql.raw(`SELECT xp FROM users WHERE id = '${userId}'`));
  const xpTotal = (userResult as any).rows?.[0]?.xp || 0;

  const compResult = await db.execute(sql.raw(`
    SELECT c.level, c.verified_by, st.name AS skill
    FROM competencies c
    JOIN skill_tags st ON st.id = c.skill_tag_id
    WHERE c.user_id = '${userId}'
  `));

  const certResult = await db.execute(sql.raw(`
    SELECT uc.earned_at, cert.slug, cert.title
    FROM user_certifications uc
    JOIN certifications cert ON cert.id = uc.certification_id
    WHERE uc.user_id = '${userId}'
  `));

  const endorseResult = await db.execute(sql.raw(`
    SELECT * FROM workforce_endorsements WHERE user_id = '${userId}' ORDER BY created_at DESC
  `));

  const signalsResult = await db.execute(sql.raw(`
    SELECT * FROM workforce_signals WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 20
  `));

  const xpBySkillResult = await db.execute(sql.raw(`
    SELECT
      COALESCE(skill_categories::text, '["general"]') AS cats,
      COUNT(*) AS cnt
    FROM workforce_signals
    WHERE user_id = '${userId}'
    GROUP BY cats
  `));

  const xpBySkill: Record<string, number> = {};
  for (const row of ((xpBySkillResult as any).rows || [])) {
    try {
      const cats = JSON.parse(row.cats);
      for (const c of (Array.isArray(cats) ? cats : [cats])) {
        xpBySkill[c] = (xpBySkill[c] || 0) + Number(row.cnt);
      }
    } catch {}
  }

  return {
    userId,
    profile,
    xpTotal,
    xpBySkill,
    verifiedCompetencies: ((compResult as any).rows || []).map((r: any) => ({
      skill: r.skill,
      level: r.level,
      verifiedBy: r.verified_by,
    })),
    toolProficiency: (profile as any)?.tool_proficiency || {},
    publishedWorks: (profile as any)?.published_projects || 0,
    teacherEndorsements: (endorseResult as any).rows || [],
    certifications: ((certResult as any).rows || []).map((r: any) => ({
      slug: r.slug,
      title: r.title,
      earnedAt: r.earned_at,
    })),
    recentSignals: (signalsResult as any).rows || [],
  };
}

export async function addEndorsement(data: {
  userId: string;
  endorserId: string;
  endorserRole: string;
  skillCategory: string;
  comment?: string;
}): Promise<WorkforceEndorsement> {
  const result = await db.execute(sql.raw(`
    INSERT INTO workforce_endorsements (user_id, endorser_id, endorser_role, skill_category, comment)
    VALUES ('${data.userId}', '${data.endorserId}', '${data.endorserRole}', '${data.skillCategory}', ${data.comment ? `'${data.comment.replace(/'/g, "''")}'` : "NULL"})
    RETURNING *
  `));

  await recomputeProfile(data.userId);
  return (result as any).rows[0];
}
